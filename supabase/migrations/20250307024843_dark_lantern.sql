/*
  # Update Resume Analysis Schema

  1. Changes
    - Update valid_analysis_status constraint to handle the new analysis result structure
    - Add support for detailed analysis fields including skills, experience, keywords, and format
    - Ensure backward compatibility with existing records

  2. Security
    - Maintains existing RLS policies
*/

ALTER TABLE resumes DROP CONSTRAINT IF EXISTS valid_analysis_status;

ALTER TABLE resumes ADD CONSTRAINT valid_analysis_status CHECK (
  (analysis_result IS NULL) OR (
    (analysis_result->>'status' IN ('processing', 'completed', 'error')) AND
    (
      (analysis_result->>'status' = 'processing') OR
      (analysis_result->>'status' = 'error') OR
      (
        (analysis_result->>'status' = 'completed') AND
        (analysis_result ? 'summary') AND
        ((analysis_result->'summary') ? 'score') AND
        ((analysis_result->'summary') ? 'strengths') AND
        ((analysis_result->'summary') ? 'improvements') AND
        ((analysis_result->'summary') ? 'details') AND
        ((analysis_result->'summary') ? 'messages') AND
        ((analysis_result->'summary'->'messages') ? 'intro') AND
        ((analysis_result->'summary'->'messages') ? 'ats') AND
        ((analysis_result->'summary'->'messages') ? 'impact') AND
        ((analysis_result->'summary'->'messages') ? 'clarity') AND
        ((analysis_result->'summary'->'messages') ? 'skills') AND
        ((analysis_result->'summary'->'messages') ? 'experience') AND
        ((analysis_result->'summary'->'messages') ? 'action_plan')
      )
    )
  )
);