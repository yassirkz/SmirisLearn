import emailjs from '@emailjs/browser';

// Initialiser EmailJS
emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);

export const sendInvitationEmail = async ({ to, companyName, adminName, token, fromEmail, fromName }) => {
    try {
        console.log('📧 Envoi email via EmailJS...');
        
        // Construire le lien
        const inviteLink = `${window.location.origin}/accept-invite?token=${token}`;

        // Préparer les variables du template
        const templateParams = {
            from_name: fromName || "Smiris Learn",
            from_email: fromEmail,
            reply_to: fromEmail,
            to_email: to,
            adminName: adminName,
            companyName: companyName,
            inviteLink: inviteLink
        };

        // Envoyer l'email
        const response = await emailjs.send(
            import.meta.env.VITE_EMAILJS_SERVICE_ID,
            import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
            templateParams
        );

        console.log('✅ Email envoyé!', response);
        return { success: true };
        
    } catch (error) {
        console.error('❌ Erreur EmailJS:', error);
        return { 
            success: false, 
            error: error.text || error.message || 'Erreur inconnue' 
        };
    }
};