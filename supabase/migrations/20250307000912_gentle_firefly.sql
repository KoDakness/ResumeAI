/*
  # Add resume deletion trigger and storage cleanup

  1. Changes
    - Add function to clean up storage files when a resume is deleted
    - Add trigger to automatically run cleanup on resume deletion
    
  2. Security
    - Function is set to SECURITY DEFINER to allow storage cleanup
*/

-- Create function to clean up storage files
CREATE OR REPLACE FUNCTION clean_up_resume_storage()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the file from storage
  -- Note: This requires proper storage bucket permissions
  PERFORM extensions.http_delete(
    url := storage.get_bucket_path('resumes') || '/' || OLD.file_path,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('request.jwt.claim.role')
    )
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to clean up storage on resume deletion
CREATE TRIGGER clean_up_resume_storage_trigger
  BEFORE DELETE ON resumes
  FOR EACH ROW
  EXECUTE FUNCTION clean_up_resume_storage();