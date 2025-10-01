-- Garante que administradores possam atualizar qualquer perfil
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.profiles;

CREATE POLICY "Admins podem ver todos os perfis"
ON public.profiles FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

