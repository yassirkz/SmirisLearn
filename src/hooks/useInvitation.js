import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { generateInvitationToken, getExpirationDate } from '../utils/tokenGenerator';

export function useInvitation() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const createInvitation = useCallback(async (companyData) => {
        try {
            setLoading(true);
            setError(null);

            const email = companyData.adminEmail.toLowerCase().trim();

            // 1. Vérifier si l'email a déjà une invitation en attente
            const { data: existingInvite, error: checkError } = await supabase
                .from('pending_companies')
                .select('*')
                .eq('admin_email', email)
                .maybeSingle();

            if (checkError) throw checkError;

            if (existingInvite) {
                throw new Error('Une invitation est déjà en attente pour cet email');
            }

            // ✅ 2. Vérifier si l'email existe déjà dans profiles
            const { data: existingUser, error: userError } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email)
                .maybeSingle();

            if (userError) throw userError;

            if (existingUser) {
                throw new Error('Cet email est déjà utilisé par un utilisateur existant');
            }

            // 3. Générer token et date d'expiration
            const token = generateInvitationToken();
            const expiresAt = getExpirationDate();

            // 4. Insérer dans pending_companies
            const { data, error } = await supabase
                .from('pending_companies')
                .insert({
                    name: companyData.name.trim(),
                    admin_email: email,
                    admin_name: companyData.adminName.trim(),
                    token,
                    expires_at: expiresAt
                })
                .select()
                .single();

            if (error) throw error;

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