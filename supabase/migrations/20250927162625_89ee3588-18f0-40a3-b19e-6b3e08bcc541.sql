-- Atualizar a função handle_new_user para incluir telefone
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (user_id, nome, email, telefone, tipo)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
        NEW.email,
        NEW.raw_user_meta_data->>'telefone',
        'participante'
    );
    RETURN NEW;
END;
$function$;