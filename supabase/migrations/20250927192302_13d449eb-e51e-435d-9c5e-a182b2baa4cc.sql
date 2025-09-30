-- Final security fix: Make Stripe keys completely inaccessible from frontend
-- Only Edge Functions should access the keys

-- Drop existing policy (without IF EXISTS since it's not supported)
DROP POLICY "Admins podem gerenciar configurações admin" ON public.configuracoes_admin;

-- Create separate policies for different operations
-- Allow admins to view non-sensitive data  
CREATE POLICY "Admins can view admin config" ON public.configuracoes_admin
FOR SELECT 
USING (is_admin(auth.uid()));

-- Allow admins to update admin config
CREATE POLICY "Admins can update admin config" ON public.configuracoes_admin
FOR UPDATE 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Allow admins to insert new config
CREATE POLICY "Admins can insert admin config" ON public.configuracoes_admin
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

-- Update the RPC function to be more restrictive - only for Edge Functions
DROP FUNCTION public.get_stripe_config_for_edge_functions();

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
    RAISE EXCEPTION 'Access denied: Stripe keys can only be accessed by server functions';
  END IF;

  -- Return the Stripe configuration (only for Edge Functions)
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