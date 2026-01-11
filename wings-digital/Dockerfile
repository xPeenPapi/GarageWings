# 1. Imagen base
FROM node:20-alpine

# 2. Directorio de trabajo
WORKDIR /app

# 3. Copiar archivos de dependencias
COPY package*.json ./

# 4. Copiar Prisma
COPY prisma ./prisma/

# 5. Instalar dependencias
RUN npm ci

# 6. Copiar TODO el código fuente (incluyendo src/)
COPY . .

# 7. IMPORTANTE: Compilar el proyecto NestJS
RUN npm run build

# 8. Verificar que se creó dist/main.js
RUN ls -la dist/

# 9. Exponer puerto
EXPOSE 3000

# 10. Comando de inicio
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/main.js"]