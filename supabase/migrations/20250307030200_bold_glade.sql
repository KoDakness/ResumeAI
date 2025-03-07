/*
  # Add INSERT policy for review_usage table

  1. Changes
    - Adds INSERT policy for review_usage table to allow authenticated users to create their own usage records
    - Ensures users can only create records for themselves

  2. Security
    - Restricts users to only create records where user_id matches their auth.uid()
*/

-- Add INSERT policy for review_usage table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'review_usage' 
    AND policyname = 'Users can create own usage record'
  ) THEN
    CREATE POLICY "Users can create own usage record"
      ON public.review_usage
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;