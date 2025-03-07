/*
  # Add Profile Creation Trigger

  1. Changes
    - Create a trigger function to automatically create profiles for new users
    - Add trigger to auth.users table
    - Add policy for creating profiles

  This ensures that a profile is created whenever a new user signs up.
*/

-- Create trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add policy for creating profiles
CREATE POLICY "Allow profile creation for new users"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);