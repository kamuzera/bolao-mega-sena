-- Fix the function to have proper search_path to address security warning
CREATE OR REPLACE FUNCTION public.update_contest_quotas()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;