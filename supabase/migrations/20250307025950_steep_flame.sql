/*
  # Add review usage tracking

  1. New Functions
    - `handle_new_user`: Creates review usage record for new users
    - `increment_review_usage`: Updates review count when analysis is completed

  2. Triggers
    - `on_auth_user_created`: Tracks new user creation
    - `on_resume_analysis_completed`: Updates review usage count

  3. Security
    - Functions run with SECURITY DEFINER to ensure proper access
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
    
    INSERT INTO public.review_usage (user_id, free_reviews_used)
    VALUES (NEW.user_id, 1)
    ON CONFLICT (user_id) DO UPDATE
    SET 
      free_reviews_used = COALESCE(review_usage.free_reviews_used, 0) + 1,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for new user creation if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Create trigger for review usage tracking if it doesn't exist
DO $$ 
BEGIN
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