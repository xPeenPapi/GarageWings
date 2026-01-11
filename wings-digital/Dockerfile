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
RUN DATABASE_URL="mysql://dummy:dummy@localhost:3306/db" npx prisma generate

# 7. Construir la aplicación
RUN npm run build

# 8. 🔍 PASO DE DIAGNÓSTICO (Esto imprimirá la estructura de carpetas en los logs)
# Si vuelve a fallar, ve a los logs de Railway y busca "--- CONTENIDO DE DIST ---"
RUN echo "--- CONTENIDO DE DIST ---" && ls -R dist

# 9. Exponer el puerto
EXPOSE 3000

# 10. COMANDO DE INICIO INTELIGENTE
# Intenta arrancar 'dist/main.js'. Si falla, intenta 'dist/src/main.js'.
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && (node dist/main.js || node dist/src/main.js)"]