// src/hooks/useMemberInvitation.js
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { generateInvitationToken, getExpirationDate } from '../utils/tokenGenerator';
import { checkRateLimit } from '../utils/rateLimit';
import { untrusted, validateEmail } from '../utils/security';
import { sendInvitationEmail } from '../lib/email';
import { sendNotification } from '../utils/notifications';

export function useMemberInvitation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createInvitation = async ({ email, role, organization_id, invited_by }) => {
    try {
      setLoading(true);
      setError(null);

      const validatedEmail = validateEmail(untrusted(email.trim().toLowerCase()));

      // Rate limiting (par email)
      if (!checkRateLimit('member-invitation', validatedEmail, 5, 60000)) {
        throw new Error('Trop de tentatives. Réessayez dans quelques minutes.');
      }

      // Récupérer le nom de l'organisation et de l'inviteur
      const [orgResult, inviterResult] = await Promise.all([
        supabase.from('organizations').select('name').eq('id', organization_id).single(),
        supabase.from('profiles').select('full_name').eq('id', invited_by).single()
      ]);

      if (orgResult.error) throw orgResult.error;
      if (inviterResult.error) throw inviterResult.error;

      const organizationName = orgResult.data.name;
      const inviterName = inviterResult.data.full_name || 'Un administrateur';

      // Vérifier si l'utilisateur existe déjà
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id, organization_id')
        .eq('email', validatedEmail)
        .maybeSingle();

      if (existingUser?.organization_id) {
        throw new Error('Cet email est déjà rattaché à une organisation.');
      }

      // Si l'utilisateur existe mais sans organisation, on l'ajoute directement
      if (existingUser && !existingUser.organization_id) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ organization_id, role })
          .eq('id', existingUser.id);
        if (updateError) throw updateError;
        
        // Pas besoin d'envoyer d'email, l'utilisateur est déjà dans le système
        return { user: existingUser, alreadyExisted: true };
      }

      // Sinon, créer une invitation
      const token = generateInvitationToken();
      const expiresAt = getExpirationDate();

      const { data, error: insertError } = await supabase
        .from('member_invitations')
        .insert({
          organization_id,
          email: validatedEmail,
          role,
          token,
          expires_at: expiresAt,
          invited_by,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Envoyer l'email
      const emailResult = await sendInvitationEmail({
        to: validatedEmail,
        type: 'member',
        organizationName,
        invitedBy: inviterName,
        token
      });

      if (!emailResult.success) {
        // On peut décider de supprimer l'invitation ou simplement logger
        console.warn("L'email n'a pas pu être envoyé, mais l'invitation a été créée.");
      }

      return { invitation: data };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getInvitationByToken = async (token) => {
    try {
      const { data, error } = await supabase
        .from('member_invitations')
        .select('*, organizations(name)')
        .eq('token', token)
        .maybeSingle();
      if (error) throw error;
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  const acceptInvitation = async (token, userId) => {
    try {
      const invitation = await getInvitationByToken(token);
      if (!invitation) throw new Error('Invitation invalide');
      if (new Date(invitation.expires_at) < new Date()) throw new Error('Invitation expirée');

      // SÉCURITÉ : Dans une application de production, cette mise à jour doit être 
      // effectuée via une RPC ou un Trigger SQL pour empêcher l'utilisateur
      // de modifier lui-même son rôle via l'API client.
      const { error } = await supabase
        .from('profiles')
        .update({ 
          organization_id: invitation.organization_id, 
          role: invitation.role 
        })
        .eq('id', userId);
      if (error) throw error;

      // Supprimer l'invitation
      await supabase.from('member_invitations').delete().eq('token', token);

      // Notifier l'inviteur
      if (invitation.invited_by) {
        await sendNotification(
            invitation.invited_by,
            'Invitation acceptée ! 🤝',
            `${invitation.email} a rejoint votre organisation.`,
            'success',
            '/admin/members'
        );
      }

      return invitation;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return { createInvitation, getInvitationByToken, acceptInvitation, loading, error };
}