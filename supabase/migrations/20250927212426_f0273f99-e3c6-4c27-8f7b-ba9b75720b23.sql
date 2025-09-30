-- Fix the incorrect cotas_vendidas data
UPDATE public.concursos 
SET cotas_vendidas = (
    SELECT COALESCE(SUM(quantidade_cotas), 0)
    FROM public.participacoes 
    WHERE participacoes.concurso_id = concursos.id
);

-- Ensure trigger is working properly by recreating it
DROP TRIGGER IF EXISTS trigger_update_contest_quotas ON public.participacoes;

CREATE OR REPLACE FUNCTION public.update_contest_quotas()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE public.concursos 
        SET cotas_vendidas = (
            SELECT COALESCE(SUM(quantidade_cotas), 0)
            FROM public.participacoes 
            WHERE concurso_id = OLD.concurso_id
        )
        WHERE id = OLD.concurso_id;
        RETURN OLD;
    ELSE
        UPDATE public.concursos 
        SET cotas_vendidas = (
            SELECT COALESCE(SUM(quantidade_cotas), 0)
            FROM public.participacoes 
            WHERE concurso_id = COALESCE(NEW.concurso_id, OLD.concurso_id)
        )
        WHERE id = COALESCE(NEW.concurso_id, OLD.concurso_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_contest_quotas
    AFTER INSERT OR UPDATE OR DELETE
    ON public.participacoes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_contest_quotas();