// Follow this setup guide to integrate the Deno runtime and Supabase
// https://deno.com/manual/getting_started/setup_your_environment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.19.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { priceId, userId, successUrl, cancelUrl } = await req.json();

    if (!priceId || !userId || !successUrl || !cancelUrl) {
      throw new Error('Missing required parameters');
    }

    // Get or create Stripe customer
    let customer;
    const { data: customers } = await stripe.customers.search({
      query: `metadata['supabase_user_id']:'${userId}'`,
    });

    if (customers && customers.length > 0) {
      customer = customers[0];
    } else {
      customer = await stripe.customers.create({
        metadata: {
          supabase_user_id: userId,
        },
      });
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: priceId.includes('unlimited') ? 'subscription' : 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
    });

    if (!session?.url) {
      throw new Error('Failed to create checkout session');
    }

    return new Response(
      JSON.stringify({ 
        sessionId: session.id, 
        url: session.url 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Checkout session error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to create checkout session' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});