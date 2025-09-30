-- Fix security issue: Clean up duplicate RLS policies and strengthen access control for sensitive data

-- Remove duplicate policies on profiles table
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Add explicit policy to prevent any unauthorized access to profiles
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles FOR ALL
TO anon
USING (false);

-- Add explicit policy to ensure authenticated users can only access their own data
CREATE POLICY "Authenticated users own profile access"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own profile"
ON public.profiles FOR UPDATE  
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure configuracoes_admin is only accessible to authenticated admin users
-- Add explicit denial for anonymous access
CREATE POLICY "Deny anonymous access to admin config"
ON public.configuracoes_admin FOR ALL
TO anon
USING (false);