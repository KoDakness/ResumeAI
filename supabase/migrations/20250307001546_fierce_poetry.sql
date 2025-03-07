/*
  # Fix resume analysis process

  1. Changes
    - Add trigger to ensure analysis_result is never null
    - Add check constraint for valid analysis status values
    - Add default analysis_result structure

  2. Security
    - Maintain existing RLS policies
*/

-- Add check constraint for analysis status
ALTER TABLE resumes ADD CONSTRAINT valid_analysis_status CHECK (
  (analysis_result->>'status')::text IN ('processing', 'completed')
);

-- Add trigger to initialize analysis_result
CREATE OR REPLACE FUNCTION initialize_analysis_result()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.analysis_result IS NULL THEN
    NEW.analysis_result = jsonb_build_object(
      'status', 'processing',
      'message', 'Your resume is being analyzed...'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure analysis_result is never null
DROP TRIGGER IF EXISTS ensure_analysis_result ON resumes;
CREATE TRIGGER ensure_analysis_result
  BEFORE INSERT OR UPDATE ON resumes
  FOR EACH ROW
  EXECUTE FUNCTION initialize_analysis_result();