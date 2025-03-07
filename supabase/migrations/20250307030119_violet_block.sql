/*
  # Create review usage records for existing users

  1. Changes
    - Creates profiles for auth users if they don't exist
    - Creates review usage records for users
    - Sets default values for free_reviews_used
    - Ensures RLS policies are in place

  2. Security
    - Enables RLS on review_usage table
    - Adds policies for users to read their own usage (if not exists)
*/

-- First ensure profiles exist for all auth users
INSERT INTO public.profiles (id, email)
SELECT 
  id,
  email
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Create review usage records for users with profiles
INSERT INTO public.review_usage (user_id, free_reviews_used)
SELECT 
  profiles.id,
  0
FROM public.profiles
LEFT JOIN public.review_usage ON profiles.id = review_usage.user_id
WHERE review_usage.user_id IS NULL;

-- Enable RLS
ALTER TABLE public.review_usage ENABLE ROW LEVEL SECURITY;

-- Add RLS policies if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'review_usage' 
    AND policyname = 'Users can read own usage'
  ) THEN
    CREATE POLICY "Users can read own usage"
      ON public.review_usage
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;