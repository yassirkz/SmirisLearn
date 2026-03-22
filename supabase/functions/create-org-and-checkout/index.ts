import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@13.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { companyName, adminEmail, adminPassword, plan } = await req.json();

    if (!companyName || !adminEmail || !adminPassword || !plan) {
      throw new Error('Missing required fields');
    }

    // Créer l'utilisateur dans auth.users
    const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: companyName, role: 'org_admin' },
    });

    if (signUpError) {
      if (signUpError.message.toLowerCase().includes('already registered')) {
        throw new Error('Un compte existe déjà avec cet email');
      }
      throw signUpError;
    }

    // Générer un slug unique pour l'organisation
    const slug = companyName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Math.random().toString(36).substring(2, 7);

    // Créer l'organisation
    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: companyName,
        slug: slug,
        plan_type: plan === 'free' ? 'free' : 'starter',
        subscription_status: plan === 'free' ? 'active' : 'trial', 
      })
      .select()
      .single();
    if (orgError) throw orgError;

    // Lier l'utilisateur à l'organisation (profil)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ organization_id: newOrg.id, role: 'org_admin' })
      .eq('id', newUser.user.id);
    if (profileError) throw profileError;

    // Si le plan est gratuit, rediriger immédiatement vers l'application
    if (plan === 'free') {
      // Connexion automatique de l'utilisateur (optionnel, on peut aussi renvoyer un token)
      return new Response(
        JSON.stringify({
          success: true,
          redirectUrl: `${Deno.env.get('FRONTEND_URL')}/login?email=${adminEmail}`,
          message: 'Compte créé avec succès ! Vous pouvez vous connecter.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Pour le plan Starter, créer une session Stripe Checkout
    const priceId = Deno.env.get('STRIPE_STARTER_PRICE_ID');
    if (!priceId) throw new Error('Stripe price ID not configured');

    // Créer un client Stripe
    const customer = await stripe.customers.create({
      email: adminEmail,
      metadata: { organization_id: newOrg.id },
    });

    // Mettre à jour l'organisation avec le customer_id (en attendant le webhook)
    await supabase
      .from('organizations')
      .update({ stripe_customer_id: customer.id })
      .eq('id', newOrg.id);

    // Créer la session Checkout
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${Deno.env.get('FRONTEND_URL')}/admin/settings?session_id={CHECKOUT_SESSION_ID}&new_org=true`,
      cancel_url: `${Deno.env.get('FRONTEND_URL')}/?cancel=true`,
      subscription_data: {
        trial_period_days: 14,
      },
      metadata: {
        organization_id: newOrg.id,
      },
    });

    // Rediriger vers Stripe
    return new Response(
      JSON.stringify({ success: true, redirectUrl: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Error in create-org-and-checkout:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});