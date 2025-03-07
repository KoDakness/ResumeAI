/*
  # Enable Email Authentication and Storage Policies

  1. Authentication
    - Enable email/password authentication
    - Set up RLS for identities
  
  2. Storage
    - Create resumes bucket if it doesn't exist
    - Set up storage security policies
*/

-- Enable RLS on identities
ALTER TABLE auth.identities
ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view profiles
CREATE POLICY "Public profiles are viewable by everyone"
ON auth.identities FOR SELECT
TO authenticated
USING (true);

-- Create resumes bucket if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'resumes'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('resumes', 'resumes', false);
  END IF;
END $$;

-- Set up storage policies
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can upload their own resumes" ON storage.objects;
  DROP POLICY IF EXISTS "Users can read their own resumes" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own resumes" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own resumes" ON storage.objects;
END $$;

-- Create new policies
CREATE POLICY "Users can upload their own resumes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own resumes"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own resumes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'resumes' AND
  (storage.foldername(name))[1] = auth.uid()::text
);