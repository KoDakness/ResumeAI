/*
  # Set up Stripe integration tables and functions

  1. New Tables
    - `stripe_customers`: Links Supabase users to Stripe customers
    - `stripe_checkout_sessions`: Tracks checkout session status
    - `stripe_prices`: Stores product price information
    - `stripe_webhooks`: Tracks processed webhook events

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for secure access
*/

-- Create stripe_customers table if it doesn't exist
CREATE TABLE IF NOT EXISTS stripe_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  stripe_customer_id text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stripe_checkout_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS stripe_checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  stripe_session_id text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'expired')),
  price_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create stripe_prices table if it doesn't exist
CREATE TABLE IF NOT EXISTS stripe_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_id text NOT NULL UNIQUE,
  product_id text NOT NULL,
  type text NOT NULL CHECK (type IN ('premium', 'unlimited')),
  active boolean DEFAULT true,
  unit_amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  recurring_interval text,
  created_at timestamptz DEFAULT now()
);

-- Create stripe_webhooks table if it doesn't exist
CREATE TABLE IF NOT EXISTS stripe_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  type text NOT NULL,
  processed_at timestamptz DEFAULT now()
);

-- Enable RLS
DO $$
BEGIN
  ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE stripe_checkout_sessions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE stripe_prices ENABLE ROW LEVEL SECURITY;
  ALTER TABLE stripe_webhooks ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Add RLS policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stripe_customers' 
    AND policyname = 'Users can read own customer data'
  ) THEN
    CREATE POLICY "Users can read own customer data" ON stripe_customers
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stripe_customers' 
    AND policyname = 'Master accounts can read all customer data'
  ) THEN
    CREATE POLICY "Master accounts can read all customer data" ON stripe_customers
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_master = true
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stripe_checkout_sessions' 
    AND policyname = 'Users can read own checkout sessions'
  ) THEN
    CREATE POLICY "Users can read own checkout sessions" ON stripe_checkout_sessions
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stripe_checkout_sessions' 
    AND policyname = 'Master accounts can read all checkout sessions'
  ) THEN
    CREATE POLICY "Master accounts can read all checkout sessions" ON stripe_checkout_sessions
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_master = true
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stripe_prices' 
    AND policyname = 'Allow read access to active prices'
  ) THEN
    CREATE POLICY "Allow read access to active prices" ON stripe_prices
      FOR SELECT TO authenticated
      USING (active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stripe_webhooks' 
    AND policyname = 'Only allow internal webhook processing'
  ) THEN
    CREATE POLICY "Only allow internal webhook processing" ON stripe_webhooks
      FOR ALL TO service_role
      USING (true);
  END IF;
END $$;

-- Insert initial price records if they don't exist
INSERT INTO stripe_prices (price_id, product_id, type, unit_amount)
SELECT 'price_premium', 'prod_Rtfl8n2Hf5LpBY', 'premium', 999
WHERE NOT EXISTS (
  SELECT 1 FROM stripe_prices WHERE price_id = 'price_premium'
);

INSERT INTO stripe_prices (price_id, product_id, type, unit_amount)
SELECT 'price_unlimited', 'prod_RtfmpUeHgjUfnA', 'unlimited', 1999
WHERE NOT EXISTS (
  SELECT 1 FROM stripe_prices WHERE price_id = 'price_unlimited'
);