/*
  # Add review usage triggers and functions

  1. Functions
    - `handle_new_user`: Creates review usage record for new users
    - `increment_review_usage`: Updates review count when analysis is completed

  2. Changes
    - Add triggers on auth.users and resumes tables
    - Safe handling of existing triggers
    - Proper error handling and validation

  3. Security
    - Functions execute with security definer
    - Proper search path settings
*/

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.review_usage (user_id, free_reviews_used)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Function to increment review usage
CREATE OR REPLACE FUNCTION public.increment_review_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only increment for free reviews when analysis is completed
  IF NEW.analysis_type = 'free' AND 
     NEW.analysis_result->>'status' = 'completed' AND
     (OLD IS NULL OR OLD.analysis_result->>'status' != 'completed') THEN
    
    UPDATE public.review_usage
    SET 
      free_reviews_used = free_reviews_used + 1,
      updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Safely create triggers
DO $$ 
BEGIN
  -- Create trigger for new user creation if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;

  -- Create trigger for review usage tracking if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_resume_analysis_completed'
    AND tgrelid = 'public.resumes'::regclass
  ) THEN
    CREATE TRIGGER on_resume_analysis_completed
      AFTER INSERT OR UPDATE ON public.resumes
      FOR EACH ROW EXECUTE FUNCTION public.increment_review_usage();
  END IF;
END $$;