# Imagen base
FROM node:20-alpine

# Directorio de trabajo
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Copiar Prisma schema
COPY prisma/schema.prisma ./prisma/
COPY prisma/migrations ./prisma/migrations

# Instalar dependencias
RUN npm ci

# Copiar el resto del código
COPY . .

# Generar Prisma Client
RUN DATABASE_URL="mysql://dummy:dummy@localhost:3306/db" npx prisma generate

# Build de NestJS
RUN npm run build

# Verificar estructura generada
RUN echo "=== Contenido de dist/ ===" && ls -la dist/

# Exponer puerto
EXPOSE 3000

# Comando de inicio - USAR LA RUTA CORRECTA
CMD npx prisma db push --accept-data-loss && node dist/src/main.js