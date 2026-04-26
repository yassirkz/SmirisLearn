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
    // Vérification des variables d'environnement
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
    const templateIdCompany = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const templateIdMember = import.meta.env.VITE_EMAILJS_MEMBER_TEMPLATE_ID;

    if (!serviceId) throw new Error('VITE_EMAILJS_SERVICE_ID manquant');
    if (!publicKey) throw new Error('VITE_EMAILJS_PUBLIC_KEY manquant');

    // Construction du lien d'invitation
    const inviteLink = type === 'member'
      ? `${window.location.origin}/accept-member-invite?token=${token}`
      : `${window.location.origin}/accept-invite?token=${token}`;

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

    // Vérification que to_email n'est pas vide
    if (!templateParams.to_email) {
      throw new Error('Le paramètre to_email est vide avant l\'envoi');
    }

    // Envoi effectif
    const response = await emailjs.send(serviceId, templateId, templateParams);

    return { success: true, data: response };

  } catch (error) {
    console.error('Erreur envoi email:', error.message);
    return { 
      success: false, 
      error: error.text || error.message || 'Erreur inconnue' 
    };
  }
};