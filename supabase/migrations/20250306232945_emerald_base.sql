/*
  # Configure Authentication Policies

  1. Changes
    - Create auth schema
    - Enable RLS on auth.users table
    - Add policy for users to read their own data

  Note: This migration sets up basic authentication policies.
  Email confirmation settings are managed through the Supabase dashboard.
*/

-- Create auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Add policy for users to read their own data
CREATE POLICY "Users can read own data"
ON auth.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);