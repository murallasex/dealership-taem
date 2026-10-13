import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Servir archivos estáticos del proyecto
app.use(express.static(__dirname));

// Fallback a index.html (compatible con Express 5)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` Dealership TAEM - Servidor Local Listo`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(`===============================================`);
});
