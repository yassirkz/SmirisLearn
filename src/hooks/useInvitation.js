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
            
            // RATE LIMITING
            if (!checkRateLimit('invitation', email, 5, 60000)) {
                throw new Error('Trop de tentatives. Réessayez dans quelques minutes.');
            }

            // VALIDATION EMAIL (branded types)
            const validatedEmail = validateEmail(untrusted(email));

            // VÉRIFICATION DOUBLONS DANS PENDING_COMPANIES
            const { data: existingInvite, error: checkError } = await supabase
                .from('pending_companies')
                .select('*')
                .eq('admin_email', validatedEmail)
                .maybeSingle();

            if (checkError) throw checkError;

            if (existingInvite) {
                throw new Error('Une invitation est déjà en attente pour cet email');
            }

            // VÉRIFICATION DOUBLONS DANS PROFILES
            const { data: existingUser, error: userError } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', validatedEmail)
                .maybeSingle();

            if (userError) throw userError;

            if (existingUser) {
                throw new Error('Cet email est déjà utilisé par un utilisateur existant');
            }

            // GÉNÉRATION TOKEN
            const token = generateInvitationToken();
            const expiresAt = getExpirationDate();

            // INSERTION DANS PENDING_COMPANIES
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

            // ENVOI DE L'EMAIL
            const { success, error: emailError } = await sendInvitationEmail({
                to: validatedEmail,
                companyName: companyData.name.trim(),
                adminName: companyData.adminName.trim(),
                token: data.token
            });

            if (!success) {
                console.warn('⚠️ Email non envoyé:', emailError);
            } else {
                console.log('✅ Invitation créée et email envoyé!');
            }

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

    return {
        createInvitation,
        getInvitationByToken,
        deleteInvitation,
        loading,
        error
    };
}