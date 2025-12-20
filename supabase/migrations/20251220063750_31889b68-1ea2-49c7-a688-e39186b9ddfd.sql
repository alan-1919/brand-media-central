-- Add explicit INSERT policy on profiles table to document that direct inserts are blocked
-- Profile creation is intentionally handled only via the handle_new_user trigger
CREATE POLICY "Profiles created only via trigger"
  ON public.profiles FOR INSERT
  WITH CHECK (false);

-- Fix the update_updated_at_column function by setting search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;