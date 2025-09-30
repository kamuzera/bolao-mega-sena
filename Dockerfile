# Use Node.js 18 como base
FROM node:18-alpine

# Define o diretório de trabalho
WORKDIR /app

# Copia package.json
COPY package.json ./

# Instala todas as dependências
RUN npm install

# Copia o código fonte
COPY . .

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
