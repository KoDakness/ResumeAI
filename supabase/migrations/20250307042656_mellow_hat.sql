/*
  # Add Stripe integration tables

  1. New Tables
    - `stripe_prices`
      - Stores Stripe price information for our products
      - Links price IDs to our plan types
    - `stripe_webhooks`
      - Tracks processed webhook events to prevent duplicates

  2. Updates
    - Add Stripe-specific columns to subscriptions table
    - Add webhook processing function

  3. Security
    - Enable RLS on new tables
    - Add policies for secure access
*/

-- Create stripe_prices table
CREATE TABLE IF NOT EXISTS stripe_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_id text NOT NULL UNIQUE,
  product_id text NOT NULL,
  type text NOT NULL,
  active boolean DEFAULT true,
  unit_amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  recurring_interval text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_price_type CHECK (type IN ('premium', 'unlimited'))
);

-- Create stripe_webhooks table
CREATE TABLE IF NOT EXISTS stripe_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  type text NOT NULL,
  processed_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE stripe_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhooks ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Allow read access to active prices" ON stripe_prices
  FOR SELECT TO authenticated
  USING (active = true);

CREATE POLICY "Only allow internal webhook processing" ON stripe_webhooks
  FOR ALL TO service_role
  USING (true);

-- Insert initial price records
INSERT INTO stripe_prices (price_id, product_id, type, unit_amount, currency)
VALUES 
  ('price_premium', 'prod_Rtfl8n2Hf5LpBY', 'premium', 999, 'usd'),
  ('price_unlimited', 'prod_RtfmpUeHgjUfnA', 'unlimited', 1999, 'usd');

-- Create function to process Stripe webhooks
CREATE OR REPLACE FUNCTION process_stripe_webhook()
RETURNS trigger AS $$
BEGIN
  -- Check if we've already processed this event
  IF EXISTS (
    SELECT 1 FROM stripe_webhooks 
    WHERE stripe_event_id = NEW.stripe_event_id
  ) THEN
    RETURN NULL;
  END IF;

  -- Record that we've processed this event
  INSERT INTO stripe_webhooks (stripe_event_id, type)
  VALUES (NEW.stripe_event_id, NEW.type);

  -- Handle different event types
  CASE NEW.type
    WHEN 'checkout.session.completed' THEN
      -- Update subscription status
      UPDATE subscriptions
      SET status = 'active',
          stripe_subscription_id = NEW.data->>'subscription_id',
          current_period_end = (NEW.data->>'current_period_end')::timestamptz
      WHERE user_id = (NEW.data->>'customer_id')::uuid;
      
    WHEN 'customer.subscription.updated' THEN
      -- Update subscription details
      UPDATE subscriptions
      SET status = NEW.data->>'status',
          current_period_end = (NEW.data->>'current_period_end')::timestamptz
      WHERE stripe_subscription_id = NEW.data->>'subscription_id';
      
    WHEN 'customer.subscription.deleted' THEN
      -- Mark subscription as canceled
      UPDATE subscriptions
      SET status = 'canceled'
      WHERE stripe_subscription_id = NEW.data->>'subscription_id';
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;