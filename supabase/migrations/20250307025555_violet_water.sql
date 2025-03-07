/*
  # Track review usage and add download URL

  1. New Tables
    - `review_usage`
      - `user_id` (uuid, references profiles)
      - `free_reviews_used` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Changes
    - Add download_url column to resumes table
    - Add RLS policies for review_usage table
    - Add trigger to update review usage count
*/

-- Create review_usage table
CREATE TABLE IF NOT EXISTS review_usage (
  user_id uuid PRIMARY KEY REFERENCES profiles(id),
  free_reviews_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add download_url to resumes
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS download_url text;

-- Enable RLS
ALTER TABLE review_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own usage"
  ON review_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update review usage
CREATE OR REPLACE FUNCTION update_review_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Create or update usage record
  INSERT INTO review_usage (user_id, free_reviews_used)
  VALUES (NEW.user_id, 1)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    free_reviews_used = review_usage.free_reviews_used + 1,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for updating usage on new free analysis
CREATE TRIGGER update_review_usage_trigger
  AFTER INSERT ON resumes
  FOR EACH ROW
  WHEN (NEW.analysis_type = 'free')
  EXECUTE FUNCTION update_review_usage();

-- Function to check free review limit
CREATE OR REPLACE FUNCTION check_free_review_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.analysis_type = 'free' THEN
    -- Check if user has reached free limit
    IF EXISTS (
      SELECT 1 FROM review_usage 
      WHERE user_id = NEW.user_id 
      AND free_reviews_used >= 3
    ) THEN
      RAISE EXCEPTION 'Free review limit reached';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check limit before insert
CREATE TRIGGER check_free_review_limit_trigger
  BEFORE INSERT ON resumes
  FOR EACH ROW
  EXECUTE FUNCTION check_free_review_limit();