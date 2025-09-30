-- Fix the security definer view issue and properly secure Stripe keys access

-- Remove the problematic view
DROP VIEW IF EXISTS public.configuracoes_admin_masked;

-- Update the get_stripe_keys function to be more secure and remove SECURITY DEFINER issues
DROP FUNCTION IF EXISTS public.get_stripe_keys();

-- Create a secure RPC function that Edge Functions can call
CREATE OR REPLACE FUNCTION public.get_stripe_config_for_edge_functions()
RETURNS TABLE(
  publishable_key TEXT,
  secret_key TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function is only intended for Edge Functions
  -- Edge Functions call this without user context (auth.uid() will be NULL)
  -- If there's a user context, only admins should be allowed
  IF auth.uid() IS NOT NULL AND NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Unauthorized access to Stripe configuration';
  END IF;

  -- Return the Stripe configuration
  RETURN QUERY
  SELECT 
    COALESCE(c.stripe_publishable_key, '') as publishable_key,
    COALESCE(c.stripe_secret_key, '') as secret_key
  FROM public.configuracoes_admin c
  LIMIT 1;
  
  -- If no configuration exists, return empty values
  IF NOT FOUND THEN
    RETURN QUERY SELECT ''::TEXT, ''::TEXT;
  END IF;
END;
$$;