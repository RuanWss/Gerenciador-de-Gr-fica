
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// --- PROXY PARA API GENNERA ---
app.all('/gennera-api/*', async (req, res) => {
  // Pega tudo o que vem depois de /gennera-api
  const urlParts = req.url.split('/gennera-api');
  const pathWithParams = urlParts[1] || '/';
  
  // URL absoluta do ERP Gennera (v1 para API2)
  const targetUrl = `https://api2.gennera.com.br/api/v1${pathWithParams}`;
  
  console.log(`[PROXY] Chamando: ${targetUrl}`);

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers['authorization'] || '',
      },
      body: (req.method !== 'GET' && req.method !== 'HEAD') ? JSON.stringify(req.body) : undefined
    });

    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      const text = await response.text();
      res.status(response.status).send(text);
    }
  } catch (error) {
    console.error('[PROXY ERROR]:', error.message);
    res.status(500).json({ error: 'Erro de conexão com Gennera', details: error.message });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 Gateway CEMAL rodando na porta ${port}`);
});
