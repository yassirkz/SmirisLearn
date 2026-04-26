import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@13.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('FRONTEND_URL') || 'https://smiris-learn.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Invalid user');

    // --- OPTIMISATION 1 : Jointure DB en une seule passe ---
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, organizations(stripe_customer_id, plan_type)')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) throw new Error('Organization not found');
    const org = profile.organizations;

    // Lire le plan demandé
    const { priceId, planType } = await req.json();
    if (!priceId) throw new Error('Missing priceId');

    let customerId = org.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { organization_id: profile.organization_id },
      });
      customerId = customer.id;
      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', profile.organization_id);
    }

    // --- OPTIMISATION 2 : Metadata de plan explicite ---
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${Deno.env.get('FRONTEND_URL')}/admin/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get('FRONTEND_URL')}/admin/settings`,
      subscription_data: {
        trial_period_days: org.plan_type === 'free' ? 14 : undefined,
        metadata: { 
            organization_id: profile.organization_id,
            plan_type: planType || 'starter' 
        }
      },
      metadata: {
        organization_id: profile.organization_id,
        plan_type: planType || 'starter' // Utilisé par le webhook checkout.session.completed
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Checkout error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});