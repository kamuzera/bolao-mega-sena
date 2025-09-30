-- Add 'admin' as a valid payment method for manual participant additions
ALTER TABLE public.pagamentos 
DROP CONSTRAINT IF EXISTS pagamentos_forma_pagamento_check;

ALTER TABLE public.pagamentos 
ADD CONSTRAINT pagamentos_forma_pagamento_check 
CHECK (forma_pagamento IN ('pix', 'stripe', 'admin'));