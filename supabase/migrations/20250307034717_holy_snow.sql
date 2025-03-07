/*
  # Add master account functionality

  1. Changes
    - Add `is_master` column to profiles table
    - Add policy to allow master accounts to bypass subscription checks
    - Add policy to allow master accounts to read all resumes
    - Add policy to allow master accounts to read all analysis results

  2. Security
    - Only authenticated users can access these features
    - Master account status can only be set via direct database access
    - Regular users cannot modify their master status
*/

-- Add master account flag to profiles
ALTER TABLE profiles 
ADD COLUMN is_master boolean DEFAULT false;

-- Update policies for resumes table to allow master access
CREATE POLICY "Master accounts can read all resumes"
ON resumes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_master = true
  )
  OR user_id = auth.uid()
);

-- Update policies for analysis_results to allow master access
CREATE POLICY "Master accounts can read all analysis results"
ON analysis_results
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_master = true
  )
  OR EXISTS (
    SELECT 1 FROM resumes
    WHERE resumes.id = analysis_results.resume_id
    AND resumes.user_id = auth.uid()
  )
);

-- Update the free review limit check function to bypass for master accounts
CREATE OR REPLACE FUNCTION check_free_review_limit()
RETURNS trigger AS $$
BEGIN
  -- Check if user is a master account
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_master = true
  ) THEN
    RETURN NEW;
  END IF;

  -- Regular user check
  IF NEW.analysis_type = 'free' AND (
    SELECT free_reviews_used >= 3
    FROM review_usage
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Free review limit reached';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;