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

# Expõe a porta
EXPOSE 3000

# Define variável de ambiente
ENV PORT=3000

# Comando para iniciar o servidor (gera o build com as variáveis atuais)
CMD ["npm", "start"]
