# 1. Usar imagen base de Node
FROM node:20-alpine

# 2. Establecer directorio de trabajo
WORKDIR /app

# 3. Copiar archivos de dependencias
COPY package*.json ./
# Copiar carpeta prisma
COPY prisma ./prisma/

# 4. Instalar dependencias
RUN npm install

# 5. Copiar el resto del código
COPY . .

# 6. Generar cliente de Prisma
# ⚠️ AQUÍ ESTÁ EL TRUCO: Le pasamos una URL falsa para que el comando pase la validación.
# No te preocupes, no intenta conectarse, solo genera el código.
RUN DATABASE_URL="mysql://usuario:password@localhost:3306/db" npx prisma generate

# 7. Construir la aplicación
RUN npm run build

# 8. Exponer el puerto
EXPOSE 3000

# 9. Comando de inicio
# Aquí SÍ usará la DATABASE_URL real de Railway
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm run start:prod"]