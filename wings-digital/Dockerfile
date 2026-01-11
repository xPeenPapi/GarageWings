# 1. Imagen base
FROM node:20-alpine

# 2. Directorio de trabajo
WORKDIR /app

# 3. Copiar package files
COPY package*.json ./

# 4. Copiar Prisma schema
COPY prisma ./prisma/

# 5. Instalar dependencias
RUN npm install

# 6. Copiar código fuente
COPY . .

# 7. Build de NestJS
RUN npm run build

# 8. Exponer puerto
EXPOSE 3000

# 9. Script de inicio
CMD npx prisma db push --accept-data-loss && node dist/main.js