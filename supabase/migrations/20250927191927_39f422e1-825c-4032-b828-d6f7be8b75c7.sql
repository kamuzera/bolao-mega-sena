-- Fix security issues with admin configurations and general configurations

-- 1. Secure the configuracoes table by restricting it to authenticated users only
-- Currently it's publicly readable which exposes business configuration data
DROP POLICY IF EXISTS "Everyone can view settings" ON public.configuracoes;
DROP POLICY IF EXISTS "Todos podem ver configurações" ON public.configuracoes;

-- Create new policy that only allows authenticated users to view configurations
CREATE POLICY "Authenticated users can view settings" ON public.configuracoes
FOR SELECT 
TO authenticated
USING (true);

-- 2. Create a security definer function to safely retrieve Stripe keys for Edge Functions
CREATE OR REPLACE FUNCTION public.get_stripe_keys()
RETURNS TABLE(
  publishable_key TEXT,
  secret_key TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  -- Only allow Edge Functions (when no user context) or admin users
  IF current_user_id IS NOT NULL AND NOT is_admin(current_user_id) THEN
    RAISE EXCEPTION 'Access denied: Only admins can access Stripe keys';
  END IF;

  -- Return the keys
  RETURN QUERY
  SELECT 
    c.stripe_publishable_key,
    c.stripe_secret_key
  FROM public.configuracoes_admin c
  LIMIT 1;
END;
$$;

-- 3. Create a view that masks the secret key for frontend display
CREATE OR REPLACE VIEW public.configuracoes_admin_masked AS
SELECT 
  id,
  created_at,
  updated_at,
  percentual_comissao,
  cotas_gratuitas,
  stripe_publishable_key,
  -- Mask the secret key for security
  CASE 
    WHEN stripe_secret_key IS NOT NULL AND stripe_secret_key != '' AND length(stripe_secret_key) > 0
    THEN concat(substring(stripe_secret_key, 1, 12), '***')
    ELSE 'Não configurada'
  END AS stripe_secret_key_masked
FROM public.configuracoes_admin;