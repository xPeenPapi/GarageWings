# Imagen base
FROM node:20-alpine

# Directorio de trabajo
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Copiar solo el schema de Prisma (NO el config)
COPY prisma/schema.prisma ./prisma/
COPY prisma/migrations ./prisma/migrations

# Instalar dependencias
RUN npm ci

# Copiar el resto del código
COPY . .

# Generar Prisma Client (con DATABASE_URL dummy)
RUN DATABASE_URL="mysql://dummy:dummy@localhost:3306/db" npx prisma generate

# Build de NestJS
RUN npm run build

# Verificar que dist/main.js existe
RUN ls -la dist/ && test -f dist/main.js

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD npx prisma db push --accept-data-loss && node dist/main.js