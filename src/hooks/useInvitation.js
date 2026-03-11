import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { generateInvitationToken, getExpirationDate } from '../utils/tokenGenerator';
import { checkRateLimit } from '../utils/rateLimit';
import { untrusted, validateEmail } from '../utils/security';
import { sendInvitationEmail } from '../lib/email';

export function useInvitation() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const createInvitation = useCallback(async (companyData) => {
        try {
            setLoading(true);
            setError(null);

            const email = companyData.adminEmail.toLowerCase().trim();
            
            // Rate limiting
            if (!checkRateLimit('invitation', email, 5, 60000)) {
                throw new Error('Trop de tentatives. Réessayez dans quelques minutes.');
            }

            // Validation email
            const validatedEmail = validateEmail(untrusted(email));

            // Vérification doublons
            const { data: existingInvite, error: checkError } = await supabase
                .from('pending_companies')
                .select('*')
                .eq('admin_email', validatedEmail)
                .maybeSingle();

            if (checkError) throw checkError;

            if (existingInvite) {
                throw new Error('Une invitation est déjà en attente pour cet email');
            }

            // Vérification utilisateur existant
            const { data: existingUser, error: userError } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', validatedEmail)
                .maybeSingle();

            if (userError) throw userError;

            if (existingUser) {
                throw new Error('Cet email est déjà utilisé par un utilisateur existant');
            }

            // Génération token
            const token = generateInvitationToken();
            const expiresAt = getExpirationDate();

            // Insertion
            const { data, error } = await supabase
                .from('pending_companies')
                .insert({
                    name: companyData.name.trim(),
                    admin_email: validatedEmail,
                    admin_name: companyData.adminName.trim(),
                    token,
                    expires_at: expiresAt
                })
                .select()
                .single();

            if (error) throw error;

            // Envoi email
            const { data: { user: superAdmin } } = await supabase.auth.getUser();
            const fromEmail = superAdmin?.email || "kezziyassir005@gmail.com";

            await sendInvitationEmail({
                fromEmail,
                to: validatedEmail,
                fromName: "Super Admin Smiris Learn",
                companyName: companyData.name.trim(),
                adminName: companyData.adminName.trim(),
                token: data.token
            });

            return { data, error: null };

        } catch (err) {
            console.error('Erreur création invitation:', err);
            setError(err.message);
            return { data: null, error: err };
        } finally {
            setLoading(false);
        }
    }, []);

    const getInvitationByToken = useCallback(async (token) => {
        try {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from('pending_companies')
                .select('*')
                .eq('token', token)
                .maybeSingle();

            if (error) throw error;

            return { data, error: null };
        } catch (err) {
            console.error('Erreur récupération invitation:', err);
            setError(err.message);
            return { data: null, error: err };
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteInvitation = useCallback(async (token) => {
        try {
            setLoading(true);
            setError(null);

            const { error } = await supabase
                .from('pending_companies')
                .delete()
                .eq('token', token);

            if (error) throw error;

            return { error: null };
        } catch (err) {
            console.error('Erreur suppression invitation:', err);
            setError(err.message);
            return { error: err };
        } finally {
            setLoading(false);
        }
    }, []);

    // ✅ NOUVEAU : Nettoyer les invitations expirées
    const cleanupExpiredInvitations = useCallback(async () => {
        try {
            setLoading(true);
            
            const { data, error } = await supabase
                .rpc('full_system_cleanup');

            if (error) throw error;
            
            console.log('✅ Nettoyage effectué:', data);
            return { data, error: null };

        } catch (err) {
            console.error('Erreur nettoyage invitations:', err);
            setError(err.message);
            return { data: null, error: err };
        } finally {
            setLoading(false);
        }
    }, []);

    // ✅ NOUVEAU : Vérifier les limites avant d'ajouter
    const checkOrganizationLimits = useCallback(async (orgId, resourceType = 'users') => {
        try {
            const { data, error } = await supabase
                .rpc('check_organization_limits_full', {
                    p_org_id: orgId
                });

            if (error) throw error;
            
            return { 
                data,
                canAdd: resourceType === 'users' ? data?.can_add_users : data?.can_add_videos,
                error: null 
            };

        } catch (err) {
            console.error('Erreur vérification limites:', err);
            return { data: null, error: err };
        }
    }, []);

    return {
        createInvitation,
        getInvitationByToken,
        deleteInvitation,
        cleanupExpiredInvitations,
        checkOrganizationLimits,
        loading,
        error
    };
}