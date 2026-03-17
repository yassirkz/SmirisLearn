import emailjs from '@emailjs/browser';

emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);

export const sendInvitationEmail = async ({ 
  to, 
  type = 'company', 
  organizationName,
  token, 
  invitedByName,
  fromEmail,
  fromName,
  adminName 
}) => {
  try {
    console.log('📧 Envoi email de type', type, 'via EmailJS...', { to, organizationName, adminName });

    // Vérification des variables d'environnement
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
    const templateIdCompany = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const templateIdMember = import.meta.env.VITE_EMAILJS_MEMBER_TEMPLATE_ID;

    console.log('🔍 Variables d\'environnement lues :', {
      serviceId,
      publicKey: publicKey ? '***' : undefined,
      templateIdCompany,
      templateIdMember
    });

    if (!serviceId) throw new Error('VITE_EMAILJS_SERVICE_ID manquant');
    if (!publicKey) throw new Error('VITE_EMAILJS_PUBLIC_KEY manquant');

    // Construction du lien d'invitation
    const inviteLink = type === 'member'
      ? `${window.location.origin}/accept-member-invite?token=${token}`
      : `${window.location.origin}/accept-invite?token=${token}`;

    console.log('🔗 Lien d\'invitation :', inviteLink);

    let templateParams;
    let templateId;

    if (type === 'member') {
      if (!templateIdMember) throw new Error('VITE_EMAILJS_MEMBER_TEMPLATE_ID manquant');
      templateId = templateIdMember;
      templateParams = {
        to_email: to,
        organization_name: organizationName,
        invited_by: invitedByName || 'Un administrateur',
        invite_link: inviteLink,
      };
    } else {
      if (!templateIdCompany) throw new Error('VITE_EMAILJS_TEMPLATE_ID manquant');
      templateId = templateIdCompany;
      templateParams = {
        from_name: fromName || 'Smiris Learn',
        from_email: fromEmail,
        reply_to: fromEmail,
        to_email: to,
        adminName: adminName || '',
        companyName: organizationName || '',
        inviteLink: inviteLink,
      };
    }

    // Vérification que tous les paramètres sont définis
    console.log('🔑 Service ID :', serviceId);
    console.log('📋 Template ID :', templateId);
    console.log('📤 Paramètres complets :', templateParams);
    console.log('📧 to_email =', templateParams.to_email);

    // Vérification que to_email n'est pas vide
    if (!templateParams.to_email) {
      throw new Error('Le paramètre to_email est vide avant l\'envoi');
    }

    // Envoi effectif
    const response = await emailjs.send(serviceId, templateId, templateParams);

    console.log('✅ Réponse EmailJS :', response.status, response.text);
    return { success: true, data: response };

  } catch (error) {
    console.error('❌ Erreur EmailJS :', error);
    if (error.text) console.error('Détails :', error.text);
    return { 
      success: false, 
      error: error.text || error.message || 'Erreur inconnue' 
    };
  }
};