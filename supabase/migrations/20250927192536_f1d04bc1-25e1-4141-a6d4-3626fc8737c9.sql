-- Final security fix: Restrict Stripe key access to Edge Functions only

-- Update the RPC function to be more restrictive - only for Edge Functions
DROP FUNCTION IF EXISTS public.get_stripe_config_for_edge_functions();

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
  -- Only allow calls when there's no user context (Edge Functions)
  -- If auth.uid() is NOT NULL, it means this is being called from a client with a user logged in
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Access denied: Stripe keys can only be accessed by server functions, not client applications';
  END IF;

  -- Return the Stripe configuration (only for Edge Functions without user context)
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