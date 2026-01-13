# 🤖 Configuración de OpenRouter para Predicciones con IA

## ¿Qué es OpenRouter?

OpenRouter es un servicio que te permite acceder a múltiples modelos de IA (Claude, GPT-4, Llama, etc.) a través de una sola API. Para este proyecto, usamos **Claude 3.5 Sonnet** de Anthropic para generar predicciones inteligentes basadas en tus datos de ventas.

---

## 📋 Pasos para Obtener tu API Key

### 1️⃣ Crear Cuenta en OpenRouter

1. Ve a **https://openrouter.ai/**
2. Haz clic en **"Sign In"** (esquina superior derecha)
3. Selecciona una opción para registrarte:
   - Google
   - GitHub
   - Email
4. Completa el proceso de registro

### 2️⃣ Obtener tu API Key

1. Una vez dentro de tu cuenta, ve a: **https://openrouter.ai/keys**
2. Haz clic en **"Create Key"**
3. Dale un nombre descriptivo (ej: "GarageWings-Predicciones")
4. Haz clic en **"Create"**
5. **¡IMPORTANTE!** Copia la API key inmediatamente, se muestra solo una vez
   - Debería empezar con: `sk-or-v1-...`

### 3️⃣ Agregar Créditos (GRATIS)

OpenRouter te da **$5 USD en créditos GRATIS** para empezar:

1. Ve a: **https://openrouter.ai/credits**
2. Verás tu balance actual ($5.00 si es cuenta nueva)
3. **No necesitas tarjeta de crédito para usar los créditos gratuitos**

**Costo por predicción:**
- Cada predicción cuesta aproximadamente **$0.01 - $0.03 USD**
- Con $5 USD puedes generar entre **150-500 predicciones**

---

## ⚙️ Configurar en tu Proyecto

### 1. Abrir el archivo `.env`

En la carpeta `wings-digital`, abre el archivo `.env` y busca esta línea:

```env
OPENROUTER_API_KEY=sk-or-v1-REEMPLAZA_CON_TU_API_KEY_DE_OPENROUTER
```

### 2. Reemplazar con tu API Key

Cambia `REEMPLAZA_CON_TU_API_KEY_DE_OPENROUTER` por la API key que copiaste:

```env
OPENROUTER_API_KEY=sk-or-v1-abc123def456ghi789jkl...
```

### 3. Guardar el archivo

Guarda los cambios en el archivo `.env`

### 4. Reiniciar el servidor backend

Si el servidor ya está corriendo, **debes reiniciarlo** para que cargue la nueva variable de entorno:

```bash
# Detén el servidor (Ctrl+C)
# Luego vuelve a iniciarlo:
npm run start:dev
```

---

## ✅ Verificar que Funciona

1. Inicia sesión como **gerente** en tu aplicación
2. Ve al **Dashboard de Gerente**
3. En la pestaña **"Resumen"**, busca la tarjeta **"🤖 Predicción de Ventas con IA"**
4. Haz clic en **"Generar Predicción"**
5. Deberías ver:
   - Estado de carga: "Analizando datos de ventas..."
   - Datos de la semana (Total ventas, órdenes, ticket promedio)
   - **Análisis Inteligente** generado por Claude
   - Top 5 productos más vendidos

---

## 🔒 Seguridad

⚠️ **NUNCA compartas tu API key públicamente**

- No la subas a GitHub
- No la incluyas en capturas de pantalla
- No la compartas con nadie

El archivo `.env` debe estar en tu `.gitignore` para evitar subirlo accidentalmente.

---

## 🆘 Solución de Problemas

### Error: "No se pudo generar la predicción"

**Posibles causas:**
1. API key incorrecta o no configurada
2. Sin créditos en OpenRouter
3. Servidor no reiniciado después de configurar `.env`

**Soluciones:**
1. Verifica que la API key en `.env` sea correcta
2. Revisa tu balance en https://openrouter.ai/credits
3. Reinicia el servidor backend (`npm run start:dev`)

### Error: "Invalid API key"

- Verifica que copiaste la API key completa
- Asegúrate de que empiece con `sk-or-v1-`
- Genera una nueva key en https://openrouter.ai/keys

### No se muestran datos de ventas

- Asegúrate de tener órdenes **PAGADAS** en los últimos 7 días
- Verifica que estás logueado como gerente de la sucursal correcta

---

## 📊 ¿Qué Analiza la IA?

El sistema envía a Claude:
1. **Ventas por día** de los últimos 7 días
2. **Top 5 productos** más vendidos
3. **Ticket promedio**
4. **Total de órdenes y ventas**

Claude responde con:
- 📈 **Análisis de tendencias** (días fuertes vs débiles)
- 🔥 **Insights sobre productos** populares
- 💡 **Recomendaciones** de mejora
- 🎯 **Predicciones** para la próxima semana
- ⚠️ **Alertas** de patrones inusuales

---

## 💰 Costos y Límites

| Concepto | Valor |
|----------|-------|
| Créditos gratis | $5.00 USD |
| Costo por predicción | ~$0.01 - $0.03 USD |
| Predicciones con $5 | 150 - 500 |
| Modelo usado | Claude 3.5 Sonnet |
| Max tokens respuesta | 1500 tokens |

---

## 🎉 ¡Listo!

Ahora puedes usar el poder de la IA para obtener predicciones inteligentes basadas en tus datos reales de ventas. El sistema analiza patrones, identifica tendencias y te da recomendaciones personalizadas para mejorar tu negocio.

**¿Necesitas más créditos?**
Puedes agregar fondos en: https://openrouter.ai/credits

---

**Desarrollado con ❤️ para GarageWings**
