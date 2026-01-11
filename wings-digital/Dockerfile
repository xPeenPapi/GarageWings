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

# 6. Generar cliente de Prisma (Truco de URL falsa)
RUN DATABASE_URL="mysql://dummy:dummy@localhost:3306/db" npx prisma generate

# 7. Construir la aplicación
RUN npm run build

# 8. Exponer puerto
EXPOSE 3000

# 9. COMANDO MAESTRO
# A) Ejecuta las migraciones de base de datos.
# B) Usa el comando 'find' para buscar dónde rayos quedó el archivo 'main.js' dentro de la carpeta dist.
# C) Ejecuta ese archivo directamente con node.
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node $(find dist -name main.js | head -n 1)"]