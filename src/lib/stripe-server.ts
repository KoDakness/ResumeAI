import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

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
    if (!data) throw new Error('No session data received');

    // Redirect to Checkout
    const stripe = await stripePromise;
    if (!stripe) throw new Error('Stripe failed to load');

    const { error: checkoutError } = await stripe.redirectToCheckout({
      sessionId: data.sessionId,
    });

    if (checkoutError) throw checkoutError;

    return data;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}