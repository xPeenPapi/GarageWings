# 1. Usamos Node 20 (versión estable y compatible)
FROM node:20-alpine

# 2. Creamos la carpeta de la app dentro del contenedor
WORKDIR /app

# 3. Copiamos los archivos de configuración primero (para aprovechar caché)
COPY package*.json ./
# ⚠️ IMPORTANTE: Copiamos la carpeta prisma explícitamente
COPY prisma ./prisma/

# 4. Instalamos dependencias
RUN npm install

# 5. Copiamos todo el código fuente del backend
COPY . .

# 6. Generamos el cliente de Prisma
# Al estar en /app y haber copiado ./prisma, el comando estándar funciona
RUN npx prisma generate

# 7. Construimos la aplicación NestJS
RUN npm run build

# 8. Exponemos el puerto 3000
EXPOSE 3000

# 9. COMANDO DE ARRANQUE (Aquí ocurre la magia)
# Usamos "sh -c" para ejecutar migraciones Y LUEGO arrancar el servidor
# Esto asegura que la base de datos esté lista antes de iniciar
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm run start:prod"]