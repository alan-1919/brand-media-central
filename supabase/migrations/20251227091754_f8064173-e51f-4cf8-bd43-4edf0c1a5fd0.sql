-- Fix 1: Update profiles RLS policy to explicitly deny anonymous access
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  ((auth.uid() = id) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Fix 2: Update handle_new_user function with input validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate and sanitize full_name (limit to 255 chars, trim whitespace)
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    TRIM(SUBSTRING(COALESCE(new.raw_user_meta_data->>'full_name', ''), 1, 255))
  );
  
  -- Assign visitor role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'visitor');
  
  RETURN new;
END;
$$;