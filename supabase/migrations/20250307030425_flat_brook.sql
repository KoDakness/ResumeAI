/*
  # Add complete RLS policies for review_usage table

  1. Changes
    - Adds INSERT policy for review_usage table
    - Adds UPDATE policy for review_usage table
    - Ensures users can only create and modify their own usage records

  2. Security
    - Restricts users to only create/update records where user_id matches their auth.uid()
    - Maintains data isolation between users
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read own usage" ON public.review_usage;
  DROP POLICY IF EXISTS "Users can create own usage record" ON public.review_usage;
  DROP POLICY IF EXISTS "Users can update own usage" ON public.review_usage;
END $$;

-- Re-create all policies
CREATE POLICY "Users can read own usage"
  ON public.review_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own usage record"
  ON public.review_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON public.review_usage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);