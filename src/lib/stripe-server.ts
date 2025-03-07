import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
);

export async function createCheckoutSession(priceId: string, userId: string) {
  try {
    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        priceId,
        userId,
        successUrl: `${window.location.origin}/dashboard?success=true`,
        cancelUrl: `${window.location.origin}/pricing?canceled=true`,
      },
    });

    if (error) throw error;
    if (!data?.url) throw new Error('No checkout URL received');

    // Redirect to Stripe Checkout
    window.location.href = data.url;

    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send request to Edge Function';
    console.error('Error creating checkout session:', message);
    throw error;
  }
}