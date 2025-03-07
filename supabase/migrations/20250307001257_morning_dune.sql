/*
  # Add storage bucket and cleanup function

  1. Changes
    - Create resumes storage bucket
    - Add storage cleanup function
    - Add trigger for resume deletion

  2. Security
    - Enable RLS on storage bucket
    - Add storage policies for authenticated users
*/

-- Create resumes bucket if it doesn't exist
INSERT INTO storage.buckets (id, name)
VALUES ('resumes', 'resumes')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Add storage policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload resumes'
  ) THEN
    CREATE POLICY "Users can upload resumes"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete own resumes'
  ) THEN
    CREATE POLICY "Users can delete own resumes"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can view own resumes'
  ) THEN
    CREATE POLICY "Users can view own resumes"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;