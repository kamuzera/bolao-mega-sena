-- Adicionar campo telefone na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN telefone text;

-- Adicionar comentário para documentar o campo
COMMENT ON COLUMN public.profiles.telefone IS 'Número de telefone do usuário para WhatsApp (formato: +5511999999999)';