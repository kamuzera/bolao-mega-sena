-- Remover políticas problemáticas que causam recursão infinita
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage contests" ON public.concursos;  
DROP POLICY IF EXISTS "Admins can view all entries" ON public.participacoes;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.configuracoes;
DROP POLICY IF EXISTS "Apenas admins podem gerenciar configurações admin" ON public.configuracoes_admin;

-- Criar função security definer para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND tipo = 'admin'
  );
$$;

-- Recriar políticas usando a função security definer
CREATE POLICY "Usuários podem ver seu próprio perfil"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins podem ver todos os perfis"
ON public.profiles FOR ALL
USING (public.is_admin(auth.uid()));

-- Políticas para concursos
CREATE POLICY "Todos podem ver concursos"
ON public.concursos FOR SELECT
USING (status IN ('aberto', 'fechado', 'sorteado', 'finalizado'));

CREATE POLICY "Admins podem gerenciar concursos"
ON public.concursos FOR ALL
USING (public.is_admin(auth.uid()));

-- Políticas para participações
CREATE POLICY "Usuários podem ver suas participações"
ON public.participacoes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas participações"
ON public.participacoes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins podem ver todas as participações"
ON public.participacoes FOR ALL
USING (public.is_admin(auth.uid()));

-- Políticas para configurações
CREATE POLICY "Todos podem ver configurações"
ON public.configuracoes FOR SELECT
USING (true);

CREATE POLICY "Admins podem gerenciar configurações"
ON public.configuracoes FOR ALL
USING (public.is_admin(auth.uid()));

-- Políticas para configurações admin
CREATE POLICY "Admins podem gerenciar configurações admin"
ON public.configuracoes_admin FOR ALL
USING (public.is_admin(auth.uid()));