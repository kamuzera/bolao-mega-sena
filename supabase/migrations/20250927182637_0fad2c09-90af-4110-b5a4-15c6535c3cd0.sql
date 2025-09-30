-- Adicionar campos para chaves do Stripe na tabela configuracoes_admin
ALTER TABLE public.configuracoes_admin 
ADD COLUMN stripe_publishable_key TEXT DEFAULT '',
ADD COLUMN stripe_secret_key TEXT DEFAULT '';

-- Comentários para documentação
COMMENT ON COLUMN public.configuracoes_admin.stripe_publishable_key IS 'Chave publicável do Stripe para uso no frontend';
COMMENT ON COLUMN public.configuracoes_admin.stripe_secret_key IS 'Chave secreta do Stripe para uso no backend';