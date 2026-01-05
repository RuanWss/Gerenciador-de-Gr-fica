
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// --- PROXY NATIVO PARA GENNERA ---
// Isso substitui o Proxy do Google Cloud e resolve o CORS
app.all('/gennera-api/*', async (req, res) => {
  const targetPath = req.params[0];
  const targetUrl = `https://api2.gennera.com.br/api/v1/${targetPath}`;
  
  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers['authorization'] || '',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Erro no Proxy Interno:', error);
    res.status(500).json({ error: 'Falha ao conectar com o ERP Gennera' });
  }
});

// Entrega os arquivos da pasta 'dist'
app.use(express.static(path.join(__dirname, 'dist')));

// Redireciona todas as rotas para o index.html (padrão SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Sistema CEMAL com Proxy Interno rodando na porta ${port}`);
});
