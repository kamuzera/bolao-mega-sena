-- Remover política existente e recriar
DROP POLICY IF EXISTS "Users can view participations in same contests they participate in" ON public.participacoes;

-- Nova política para permitir ver participações do mesmo concurso
CREATE POLICY "Users can view participations in same contests they participate" 
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