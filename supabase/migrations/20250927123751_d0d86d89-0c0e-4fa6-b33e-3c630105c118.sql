-- Corrigir search_path nas funções existentes
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
    INSERT INTO public.profiles (user_id, nome, email, tipo)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
        NEW.email,
        'participante'
    );
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_contest_quotas()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.concursos 
        SET cotas_vendidas = cotas_vendidas + NEW.quantidade_cotas
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

-- Recriar triggers para as funções atualizadas
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_concursos_updated_at ON public.concursos;
DROP TRIGGER IF EXISTS update_configuracoes_updated_at ON public.configuracoes;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_participacoes_on_insert ON public.participacoes;
DROP TRIGGER IF EXISTS update_participacoes_on_delete ON public.participacoes;

-- Recriar triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_concursos_updated_at
BEFORE UPDATE ON public.concursos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_configuracoes_updated_at
BEFORE UPDATE ON public.configuracoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_participacoes_on_insert
AFTER INSERT ON public.participacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_contest_quotas();

CREATE TRIGGER update_participacoes_on_delete
AFTER DELETE ON public.participacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_contest_quotas();