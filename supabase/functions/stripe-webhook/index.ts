import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import Stripe from 'https://esm.sh/stripe@14.19.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  
  try {
    if (!signature) {
      throw new Error('No signature found');
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    // Check if we've already processed this event
    const { data: existingEvent } = await supabaseClient
      .from('stripe_webhooks')
      .select()
      .eq('stripe_event_id', event.id)
      .single();

    if (existingEvent) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Record the webhook event
    await supabaseClient
      .from('stripe_webhooks')
      .insert({ stripe_event_id: event.id, type: event.type });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerId = session.customer;
        const sessionId = session.id;

        // Get the customer's Supabase user ID
        const { data: customerData } = await stripe.customers.retrieve(customerId);
        const userId = customerData.metadata.supabase_user_id;

        if (!userId) {
          throw new Error('No user ID found in customer metadata');
        }

        // Update checkout session status
        await supabaseClient
          .from('stripe_checkout_sessions')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('stripe_session_id', sessionId);

        // For subscription purchases, create/update subscription record
        if (session.mode === 'subscription') {
          await supabaseClient
            .from('subscriptions')
            .upsert({
              user_id: userId,
              stripe_subscription_id: session.subscription,
              status: 'active',
              plan_type: 'unlimited',
              current_period_end: new Date(session.subscription_data.current_period_end * 1000).toISOString()
            });
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        
        await supabaseClient
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        await supabaseClient
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', subscription.id);

        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});