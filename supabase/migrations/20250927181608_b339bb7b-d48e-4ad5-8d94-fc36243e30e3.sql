-- Criar tabela de pagamentos
CREATE TABLE public.pagamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  concurso_id UUID NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  quantidade_cotas INTEGER NOT NULL DEFAULT 1,
  valor_total NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  forma_pagamento TEXT NOT NULL DEFAULT 'pix',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_pagamentos_concurso FOREIGN KEY (concurso_id) REFERENCES public.concursos(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para pagamentos
CREATE POLICY "Usuários podem ver seus próprios pagamentos"
ON public.pagamentos
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios pagamentos"
ON public.pagamentos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins podem gerenciar todos os pagamentos"
ON public.pagamentos
FOR ALL
USING (is_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_pagamentos_updated_at
BEFORE UPDATE ON public.pagamentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_pagamentos_user_id ON public.pagamentos(user_id);
CREATE INDEX idx_pagamentos_concurso_id ON public.pagamentos(concurso_id);
CREATE INDEX idx_pagamentos_status ON public.pagamentos(status);
CREATE INDEX idx_pagamentos_stripe_session_id ON public.pagamentos(stripe_checkout_session_id);