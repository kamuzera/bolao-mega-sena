-- Create missing payment records for existing participants that don't have payments
INSERT INTO public.pagamentos (
    user_id, 
    concurso_id, 
    quantidade_cotas, 
    valor_total, 
    forma_pagamento, 
    status
)
SELECT 
    p.user_id,
    p.concurso_id,
    p.quantidade_cotas,
    p.valor_total,
    'admin' as forma_pagamento,
    'confirmado' as status
FROM public.participacoes p
LEFT JOIN public.pagamentos pag ON pag.user_id = p.user_id AND pag.concurso_id = p.concurso_id
WHERE pag.id IS NULL;  -- Only insert if payment doesn't exist