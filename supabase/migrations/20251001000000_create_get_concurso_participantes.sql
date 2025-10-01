CREATE OR REPLACE FUNCTION public.get_participantes_concurso(p_concurso_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  concurso_id uuid,
  numeros_escolhidos integer[],
  quantidade_cotas integer,
  valor_total numeric,
  data_participacao timestamptz,
  premiado boolean,
  valor_premio numeric,
  nome text,
  email text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH authorized AS (
    SELECT
      public.is_admin(auth.uid()) AS is_admin,
      EXISTS (
        SELECT 1
        FROM public.participacoes p
        WHERE p.concurso_id = p_concurso_id
          AND p.user_id = auth.uid()
      ) AS is_participant
  )
  SELECT
    pa.id,
    pa.user_id,
    pa.concurso_id,
    pa.numeros_escolhidos,
    pa.quantidade_cotas,
    pa.valor_total,
    pa.data_participacao,
    pa.premiado,
    pa.valor_premio,
    pr.nome,
    pr.email
  FROM public.participacoes pa
  JOIN public.profiles pr ON pr.user_id = pa.user_id
  CROSS JOIN authorized a
  WHERE pa.concurso_id = p_concurso_id
    AND (a.is_admin OR a.is_participant);
$$;

GRANT EXECUTE ON FUNCTION public.get_participantes_concurso(uuid) TO authenticated;
