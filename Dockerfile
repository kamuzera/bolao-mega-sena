# Use Node.js 18 como base
FROM node:18-alpine

# Define o diretório de trabalho
WORKDIR /app

# Copia package.json e package-lock.json (se existir)
COPY package*.json ./

# Instala dependências
RUN npm ci --only=production

# Copia o código fonte
COPY . .

# Instala todas as dependências (incluindo devDependencies para build)
RUN npm install

# Executa o build
RUN npm run build

# Remove devDependencies para reduzir tamanho da imagem
RUN npm prune --production

# Expõe a porta
EXPOSE 3000

# Define variável de ambiente
ENV PORT=3000

# Comando para iniciar o servidor
CMD ["node", "server.cjs"]
