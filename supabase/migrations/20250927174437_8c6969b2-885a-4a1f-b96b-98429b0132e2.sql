-- Verificar e limpar todos os triggers relacionados a participacoes
SELECT tgname, tgrelid::regclass, tgfoid::regproc 
FROM pg_trigger 
WHERE tgrelid = 'participacoes'::regclass;

-- Remover TODOS os triggers existentes relacionados a cotas
DROP TRIGGER IF EXISTS update_quotas_on_participacao_change ON participacoes;
DROP TRIGGER IF EXISTS update_contest_quotas_trigger ON participacoes;
DROP TRIGGER IF EXISTS participacoes_quota_trigger ON participacoes;

-- Recriar a função corretamente
CREATE OR REPLACE FUNCTION public.update_contest_quotas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.concursos 
        SET cotas_vendidas = cotas_vendidas + NEW.quantidade_cotas
        WHERE id = NEW.concurso_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Ajustar diferença: remover antigas e adicionar novas
        UPDATE public.concursos 
        SET cotas_vendidas = cotas_vendidas - OLD.quantidade_cotas + NEW.quantidade_cotas
        WHERE id = NEW.concurso_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.concursos 
        SET cotas_vendidas = cotas_vendidas - OLD.quantidade_cotas
        WHERE id = OLD.concurso_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$function$;

-- Criar apenas UM trigger
CREATE TRIGGER update_quotas_on_participacao_change
    AFTER INSERT OR UPDATE OR DELETE ON participacoes
    FOR EACH ROW EXECUTE FUNCTION update_contest_quotas();

-- Recalcular todas as cotas para corrigir valores incorretos
UPDATE concursos 
SET cotas_vendidas = COALESCE((
    SELECT SUM(quantidade_cotas) 
    FROM participacoes 
    WHERE concurso_id = concursos.id
), 0);