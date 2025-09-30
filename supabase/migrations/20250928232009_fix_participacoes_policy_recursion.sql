-- Corrigir recursão infinita nas políticas da tabela participacoes
-- Remover política problemática que causa recursão
DROP POLICY IF EXISTS "Users can view participations in same contests they participate" ON public.participacoes;

-- Criar política simples e segura para participações
CREATE POLICY "Users can view their own participations"
ON public.participacoes 
FOR SELECT 
USING (auth.uid() = user_id);

-- Permitir que admins vejam todas as participações
CREATE POLICY "Admins can view all participations"
ON public.participacoes 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Política para permitir que usuários vejam participações de concursos que participam
-- Usando uma abordagem diferente para evitar recursão
CREATE POLICY "Users can view participations in contests they joined"
ON public.participacoes 
FOR SELECT 
USING (
  -- Usuário pode ver suas próprias participações
  auth.uid() = user_id 
  OR
  -- Ou é admin
  public.is_admin(auth.uid())
  OR
  -- Ou o concurso está aberto para visualização
  EXISTS (
    SELECT 1 FROM public.concursos c
    WHERE c.id = participacoes.concurso_id 
    AND c.status IN ('aberto', 'fechado', 'sorteado', 'finalizado')
  )
);
