-- First, let's check if the trigger exists and is working properly
-- Update cotas_vendidas for all concursos to match actual participacoes
UPDATE public.concursos 
SET cotas_vendidas = (
    SELECT COALESCE(SUM(quantidade_cotas), 0)
    FROM public.participacoes 
    WHERE participacoes.concurso_id = concursos.id
);

-- Recreate the trigger to ensure it's working properly
DROP TRIGGER IF EXISTS trigger_update_contest_quotas ON public.participacoes;

CREATE TRIGGER trigger_update_contest_quotas
    AFTER INSERT OR UPDATE OR DELETE
    ON public.participacoes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_contest_quotas();