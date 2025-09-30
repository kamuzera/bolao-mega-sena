# Sistema de Concursos

Sistema web para gerenciamento de concursos e participações.

## Tecnologias Utilizadas

- **Frontend**: React + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase
- **Deploy**: Heroku

## Como executar

1. Instale as dependências:
```bash
npm install
```

2. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz com:

```bash
VITE_SUPABASE_URL=seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=chave_anon
```

Nas Edge Functions do Supabase, defina os segredos (no painel ou CLI):

```bash
supabase secrets set EVOLUTION_API_KEY=xxxxx
supabase secrets set EVOLUTION_SERVER_URL=https://api.seuservidor.com
# opcional: simular respostas sem conexão real
supabase secrets set EVOLUTION_SIMULATE=true
```

3. Execute o projeto:
```bash
npm run dev
```

## Scripts disponíveis

- `npm run dev` - Executa o servidor de desenvolvimento
- `npm run build` - Gera build de produção
- `npm run start` - Executa o servidor de produção
- `npm run lint` - Executa o linter