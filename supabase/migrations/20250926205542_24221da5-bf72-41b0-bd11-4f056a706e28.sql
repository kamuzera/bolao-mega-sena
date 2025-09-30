-- Create user profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('admin', 'participante')),
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create contests table
CREATE TABLE public.concursos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero INTEGER UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    data_sorteio TIMESTAMPTZ NOT NULL,
    valor_cota DECIMAL(10,2) NOT NULL DEFAULT 10.00,
    max_cotas INTEGER NOT NULL DEFAULT 100,
    cotas_vendidas INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado', 'sorteado', 'finalizado')),
    numeros_sorteados INTEGER[],
    premio_total DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on contests
ALTER TABLE public.concursos ENABLE ROW LEVEL SECURITY;

-- Create entries table
CREATE TABLE public.participacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concurso_id UUID NOT NULL REFERENCES public.concursos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    numeros_escolhidos INTEGER[] NOT NULL,
    quantidade_cotas INTEGER NOT NULL DEFAULT 1,
    valor_total DECIMAL(10,2) NOT NULL,
    data_participacao TIMESTAMPTZ NOT NULL DEFAULT now(),
    numeros_acertados INTEGER DEFAULT 0,
    premiado BOOLEAN DEFAULT false,
    valor_premio DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on entries
ALTER TABLE public.participacoes ENABLE ROW LEVEL SECURITY;

-- Create settings table
CREATE TABLE public.configuracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chave TEXT UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descricao TEXT,
    tipo TEXT NOT NULL DEFAULT 'string' CHECK (tipo IN ('string', 'number', 'boolean', 'json')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on settings
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Insert default settings
INSERT INTO public.configuracoes (chave, valor, descricao, tipo) VALUES
('sistema_nome', 'Mega-Sena Bolão', 'Nome do sistema', 'string'),
('valor_cota_padrao', '10.00', 'Valor padrão da cota', 'number'),
('max_cotas_padrao', '100', 'Máximo de cotas padrão por concurso', 'number'),
('numeros_por_aposta', '6', 'Quantidade de números por aposta', 'number'),
('numero_maximo', '60', 'Número máximo da Mega-Sena', 'number');

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.user_id = auth.uid() AND p.tipo = 'admin'
        )
    );

-- Create RLS policies for contests
CREATE POLICY "Everyone can view open contests" ON public.concursos
    FOR SELECT USING (status IN ('aberto', 'fechado', 'sorteado', 'finalizado'));

CREATE POLICY "Admins can manage contests" ON public.concursos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.user_id = auth.uid() AND p.tipo = 'admin'
        )
    );

-- Create RLS policies for entries
CREATE POLICY "Users can view their own entries" ON public.participacoes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own entries" ON public.participacoes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all entries" ON public.participacoes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.user_id = auth.uid() AND p.tipo = 'admin'
        )
    );

-- Create RLS policies for settings
CREATE POLICY "Everyone can view settings" ON public.configuracoes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage settings" ON public.configuracoes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.user_id = auth.uid() AND p.tipo = 'admin'
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_concursos_updated_at
    BEFORE UPDATE ON public.concursos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_configuracoes_updated_at
    BEFORE UPDATE ON public.configuracoes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update contest quotas
CREATE OR REPLACE FUNCTION public.update_contest_quotas()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to update contest quotas
CREATE TRIGGER update_contest_quotas_trigger
    AFTER INSERT OR DELETE ON public.participacoes
    FOR EACH ROW EXECUTE FUNCTION public.update_contest_quotas();