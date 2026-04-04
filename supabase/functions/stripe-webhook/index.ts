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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response(JSON.stringify({ error: 'Missing stripe-signature' }), { status: 400 });

  const body = await req.text();
  let event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }

  // --- OPTIMISATION 1 : IDEMPOTENCE (Vérification atomique) ---
  const { data: isNew, error: registerError } = await supabase.rpc('register_stripe_event', {
    p_event_id: event.id,
    p_type: event.type
  });

  if (registerError || !isNew) {
    console.log(`Event ${event.id} already processed or error registering. Skipping.`);
    return new Response(JSON.stringify({ received: true, duplication: true }), { status: 200 });
  }

  console.log(`Processing high-priority event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const organizationId = session.metadata.organization_id;
        const planType = session.metadata.plan_type || 'starter'; // Prioriser la metadata

        const { error: updateError } = await supabase
          .from('organizations')
          .update({
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            subscription_status: 'active',
            plan_type: planType,
            trial_ends_at: null,
          })
          .eq('id', organizationId);

        if (updateError) throw updateError;
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const status = subscription.status === 'active' ? 'active' : 
                     subscription.status === 'canceled' ? 'canceled' : 'past_due';

        const { error: updateError } = await supabase
          .from('organizations')
          .update({
            subscription_status: status,
            stripe_subscription_id: subscription.status === 'canceled' ? null : subscription.id,
            // Mise à jour optionnelle du plan si présent dans metadata
            plan_type: subscription.metadata?.plan_type || undefined 
          })
          .eq('stripe_customer_id', customerId);

        if (updateError) throw updateError;
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const { error: updateError } = await supabase
          .from('organizations')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', invoice.customer);

        if (updateError) throw updateError;
        break;
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    // Si échec du traitement, on pourrait retirer l'event du log d'idempotence
    // ou marquer comme "failed" pour re-tentative Stripe
    console.error(`Webhook processing error for ${event.id}:`, err.message);
    return new Response(JSON.stringify({ error: 'Processing failed' }), { status: 500 });
  }
});