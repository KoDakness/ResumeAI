/*
  # Add messages to analysis results

  1. Changes
    - Add messages field to analysis_results table content
    - Add messages field to resumes table analysis_result
    - Update valid_analysis_status constraint to include message fields

  2. Security
    - Maintain existing RLS policies
*/

-- Add messages validation to analysis_results
ALTER TABLE analysis_results
DROP CONSTRAINT IF EXISTS valid_analysis_content;

ALTER TABLE analysis_results
ADD CONSTRAINT valid_analysis_content CHECK (
  content ? 'score' AND 
  content ? 'strengths' AND 
  content ? 'improvements' AND
  content ? 'messages' AND
  content -> 'messages' ? 'intro' AND
  content -> 'messages' ? 'ats' AND
  content -> 'messages' ? 'impact' AND
  content -> 'messages' ? 'clarity'
);

-- Update resumes table analysis_result validation
ALTER TABLE resumes
DROP CONSTRAINT IF EXISTS valid_analysis_status;

ALTER TABLE resumes
ADD CONSTRAINT valid_analysis_status CHECK (
  (analysis_result ->> 'status')::text = ANY (ARRAY['processing'::text, 'completed'::text]) AND
  (
    (analysis_result ->> 'status')::text != 'completed' OR
    (
      analysis_result -> 'summary' ? 'score' AND
      analysis_result -> 'summary' ? 'strengths' AND
      analysis_result -> 'summary' ? 'improvements' AND
      analysis_result -> 'summary' ? 'messages' AND
      analysis_result -> 'summary' -> 'messages' ? 'intro' AND
      analysis_result -> 'summary' -> 'messages' ? 'ats' AND
      analysis_result -> 'summary' -> 'messages' ? 'impact' AND
      analysis_result -> 'summary' -> 'messages' ? 'clarity'
    )
  )
);