import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';

export const useStripe = () => {
    const [loading, setLoading] = useState(false);
    const { error: showToastError } = useToast();

    /**
     * Crée une session de checkout et redirige l'utilisateur vers Stripe
     * @param {string} priceId - L'ID du prix Stripe (ex: price_123...)
     */
    const createCheckoutSession = async (priceId) => {
        if (!priceId) {
            showToastError("ID de prix manquant pour le paiement.");
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-checkout-session', {
                body: { priceId }
            });

            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error("URL de redirection manquante dans la réponse.");
            }
        } catch (err) {
            console.error('Erreur Checkout:', err);
            showToastError(err.message || "Erreur lors de la création de la session de paiement.");
        } finally {
            setLoading(false);
        }
    };

    /**
     * Crée une session de portail client et redirige l'utilisateur
     */
    const createPortalSession = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-portal-session');

            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error("URL de redirection manquante.");
            }
        } catch (err) {
            console.error('Erreur Portail:', err);
            showToastError(err.message || "Erreur lors de l'ouverture du portail de facturation.");
        } finally {
            setLoading(false);
        }
    };

    return {
        createCheckoutSession,
        createPortalSession,
        loading
    };
};
