
import { supabase } from '../lib/supabase';

/**
 * Envoie une notification à un utilisateur.
 * @param {string} userId - ID de l'utilisateur destinataire
 * @param {string} title - Titre de la notification
 * @param {string} message - Message de la notification
 * @param {string} type - 'info', 'success', 'warning', 'error'
 * @param {string} link - Lien optionnel vers une page
 */
export async function sendNotification(userId, title, message, type = 'info', link = null) {
    try {
        const { error } = await supabase
            .from('notifications')
            .insert([
                { user_id: userId, title, message, type, link }
            ]);
        if (error) throw error;
    } catch (err) {
        console.error('Erreur sendNotification:', err);
    }
}
