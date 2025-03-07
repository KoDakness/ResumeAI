/*
  # Add RLS policies for analysis results

  1. Security
    - Enable RLS on analysis_results table
    - Add policy for authenticated users to insert analysis results for their own resumes
    - Add policy for authenticated users to read their own analysis results
*/

ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create analysis results for their own resumes"
  ON analysis_results
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM resumes
      WHERE resumes.id = analysis_results.resume_id
      AND resumes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read their own analysis results"
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