/*
  # Add analysis results table and functions

  1. New Tables
    - `analysis_results`
      - `id` (uuid, primary key)
      - `resume_id` (uuid, references resumes)
      - `content` (jsonb)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `analysis_results` table
    - Add policy for authenticated users to read their own analysis results
*/

-- Create analysis_results table
CREATE TABLE IF NOT EXISTS analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid REFERENCES resumes(id) ON DELETE CASCADE,
  content jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- Add policy for users to read their own analysis results
CREATE POLICY "Users can read own analysis results"
  ON analysis_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM resumes
      WHERE resumes.id = analysis_results.resume_id
      AND resumes.user_id = auth.uid()
    )
  );