-- Atualizar usuário kamuzera@gmail.com para administrador
UPDATE public.profiles 
SET tipo = 'admin' 
WHERE email = 'kamuzera@gmail.com';

-- Criar tabela de configurações para benefícios do admin
CREATE TABLE IF NOT EXISTS public.configuracoes_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  percentual_comissao DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  cotas_gratuitas INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir configurações padrão
INSERT INTO public.configuracoes_admin (percentual_comissao, cotas_gratuitas) 
VALUES (10.00, 3) ON CONFLICT DO NOTHING;

-- Adicionar RLS
ALTER TABLE public.configuracoes_admin ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para configurações admin
CREATE POLICY "Apenas admins podem gerenciar configurações admin" 
ON public.configuracoes_admin 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.tipo = 'admin'
));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_configuracoes_admin_updated_at
BEFORE UPDATE ON public.configuracoes_admin
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();