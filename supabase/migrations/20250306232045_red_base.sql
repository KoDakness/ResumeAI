/*
  # Create storage bucket for resumes

  1. Storage
    - Create a new bucket called 'resumes' for storing resume files
    - Enable RLS policies for secure access

  2. Security
    - Add policy for authenticated users to upload their own resumes
    - Add policy for authenticated users to read their own resumes
*/

-- Create bucket for storing resumes
INSERT INTO storage.buckets (id, name)
VALUES ('resumes', 'resumes');

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for the storage bucket
CREATE POLICY "Users can upload their own resumes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own resumes"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);