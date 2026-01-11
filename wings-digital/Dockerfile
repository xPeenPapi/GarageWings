# 1. Usar imagen base de Node
FROM node:20-alpine

# 2. Establecer directorio de trabajo
WORKDIR /app

# 3. Copiar archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# 4. Instalar dependencias
RUN npm install

# 5. Copiar el resto del código
COPY . .

# 6. Generar cliente de Prisma (Truco de URL falsa para que no falle el build)
RUN DATABASE_URL="mysql://dummy:dummy@localhost:3306/db" npx prisma generate

# 7. Construir la aplicación
RUN npm run build

# 8. PASO DE DEPURACIÓN: Esto nos mostrará en los logs dónde está el archivo
RUN echo "--- BUSCANDO EL ARCHIVO MAIN.JS ---" && find dist -name "main.js"

# 9. Exponer puerto
EXPOSE 3000

# 10. EL CAMBIO CLAVE:
# Ya NO usamos "npm run start:prod".
# Usamos un comando directo que busca el archivo main.js y lo ejecuta.
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node $(find dist -name main.js | head -n 1)"]