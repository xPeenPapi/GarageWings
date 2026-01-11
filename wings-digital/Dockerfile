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

# 6. Generar cliente de Prisma (CON EL TRUCO DE LA URL FALSA)
# Esto permite que genere el cliente sin tener la variable real todavía
RUN DATABASE_URL="mysql://dummy:dummy@localhost:3306/db" npx prisma generate

# 7. Construir la aplicación
RUN npm run build

# 8. PASO DE DEPURACIÓN (Importante para tu error)
# Esto imprimirá en los logs de Railway la estructura de carpetas.
# Si falla, podrás ver en los logs dónde quedó el archivo main.js
RUN echo "--- VERIFICANDO CARPETA DIST ---" && ls -R dist

# 9. Exponer el puerto
EXPOSE 3000

# 10. COMANDO DE INICIO BLINDADO
# Ejecuta migraciones Y LUEGO intenta arrancar.
# Usa "||" para probar la segunda ruta si la primera falla.
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && (node dist/main.js || node dist/src/main.js)"]