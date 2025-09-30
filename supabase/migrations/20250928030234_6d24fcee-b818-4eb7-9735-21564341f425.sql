-- Permitir que participantes vejam outros participantes do mesmo concurso
DROP POLICY IF EXISTS "Usuários podem ver suas participações" ON public.participacoes;
DROP POLICY IF EXISTS "Users can view their own entries" ON public.participacoes;

-- Nova política para permitir ver participações do mesmo concurso
CREATE POLICY "Users can view participations in same contests they participate in" 
ON public.participacoes 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.participacoes p2 
    WHERE p2.concurso_id = participacoes.concurso_id 
    AND p2.user_id = auth.uid()
  )
);