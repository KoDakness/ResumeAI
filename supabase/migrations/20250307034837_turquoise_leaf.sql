/*
  # Add Stripe webhook handling

  1. New Tables
    - `stripe_events`
      - `id` (uuid, primary key)
      - `stripe_event_id` (text, unique)
      - `type` (text)
      - `data` (jsonb)
      - `created_at` (timestamp)
      - `processed_at` (timestamp)

  2. Security
    - Enable RLS on stripe_events table
    - Add policy for master accounts to read events
*/

-- Create stripe_events table
CREATE TABLE stripe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  type text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Enable RLS
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- Add policy for master accounts
CREATE POLICY "Master accounts can read stripe events"
ON stripe_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_master = true
  )
);

-- Add function to process stripe events
CREATE OR REPLACE FUNCTION process_stripe_event()
RETURNS trigger AS $$
BEGIN
  -- Handle successful payments
  IF NEW.type = 'checkout.session.completed' THEN
    -- Update subscription status for unlimited plan
    IF NEW.data->>'mode' = 'subscription' THEN
      INSERT INTO subscriptions (user_id, stripe_subscription_id, status, plan_type)
      VALUES (
        (NEW.data->>'client_reference_id')::uuid,
        NEW.data->>'subscription',
        'active',
        'unlimited'
      );
    -- Handle one-time premium review purchase
    ELSIF NEW.data->>'mode' = 'payment' THEN
      INSERT INTO payments (user_id, stripe_payment_id, amount, currency, status)
      VALUES (
        (NEW.data->>'client_reference_id')::uuid,
        NEW.data->>'payment_intent',
        (NEW.data#>>'{amount_total}')::numeric / 100,
        NEW.data->>'currency',
        'succeeded'
      );
    END IF;
  END IF;

  NEW.processed_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for stripe event processing
CREATE TRIGGER process_stripe_event_trigger
  BEFORE INSERT ON stripe_events
  FOR EACH ROW
  EXECUTE FUNCTION process_stripe_event();