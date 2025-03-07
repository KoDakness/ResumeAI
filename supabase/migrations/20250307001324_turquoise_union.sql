/*
  # Add storage cleanup function and trigger

  1. Changes
    - Add function to clean up storage files when resumes are deleted
    - Add trigger to automatically clean up files on resume deletion

  2. Security
    - Function runs with security definer to ensure proper storage access
*/

-- Create function to clean up storage files
CREATE OR REPLACE FUNCTION clean_up_resume_storage()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete the file from storage
  DELETE FROM storage.objects
  WHERE bucket_id = 'resumes'
  AND name = OLD.file_path;
  
  RETURN OLD;
END;
$$;

-- Add trigger to clean up storage files when resumes are deleted
DROP TRIGGER IF EXISTS clean_up_resume_storage_trigger ON resumes;
CREATE TRIGGER clean_up_resume_storage_trigger
  BEFORE DELETE ON resumes
  FOR EACH ROW
  EXECUTE FUNCTION clean_up_resume_storage();