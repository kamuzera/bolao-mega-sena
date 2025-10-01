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
  WITH requester AS (
    SELECT
      auth.uid() AS current_user,
      public.is_admin(auth.uid()) AS is_admin,
      EXISTS (
        SELECT 1
        FROM public.profiles pr
        WHERE pr.user_id = auth.uid()
          AND pr.tipo = 'participante'
      ) AS is_participante_role
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
    CASE 
      WHEN r.is_admin OR pa.user_id = r.current_user THEN pr.email
      ELSE NULL
    END AS email
  FROM public.participacoes pa
  JOIN public.profiles pr ON pr.user_id = pa.user_id
  CROSS JOIN requester r
  WHERE pa.concurso_id = p_concurso_id
    AND (r.is_admin OR r.is_participante_role);
$$;

GRANT EXECUTE ON FUNCTION public.get_participantes_concurso(uuid) TO authenticated;
