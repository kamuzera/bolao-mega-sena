-- Cria função para atualizar dados de perfil incluindo telefone
CREATE OR REPLACE FUNCTION public.set_profile_info(
    _user_id uuid,
    _nome text,
    _email text,
    _telefone text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, nome, email, telefone)
    VALUES (_user_id, _nome, _email, _telefone)
    ON CONFLICT (user_id)
    DO UPDATE
        SET nome = COALESCE(EXCLUDED.nome, public.profiles.nome),
            email = COALESCE(EXCLUDED.email, public.profiles.email),
            telefone = COALESCE(EXCLUDED.telefone, public.profiles.telefone),
            updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.set_profile_info(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_profile_info(uuid, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.set_profile_info(uuid, text, text, text) TO authenticated;

