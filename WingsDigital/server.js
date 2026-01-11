const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

// Servir archivos estáticos desde la carpeta dist/wings-digital/browser
app.use(express.static(path.join(__dirname, 'dist/wings-digital/browser')));

// Redirigir todas las rutas a index.html (para Angular routing)
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/wings-digital/browser/index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});