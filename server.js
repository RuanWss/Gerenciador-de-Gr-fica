
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
  // Extrai o path removendo o prefixo /gennera-api
  // Ex: /gennera-api/institutions/891/classes -> /institutions/891/classes
  const targetPath = req.url.replace('/gennera-api', '');
  
  // Monta a URL final para a API da Gennera
  // Importante: A URL base da Gennera termina em /v1
  const targetUrl = `https://api2.gennera.com.br/api/v1${targetPath}`;
  
  console.log(`[PROXY] Request: ${req.method} -> ${targetUrl}`);

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers['authorization'] || '',
      }
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && Object.keys(req.body).length > 0) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get('content-type');
    
    console.log(`[PROXY] Response Status: ${response.status}`);

    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      const text = await response.text();
      res.status(response.status).send(text);
    }
  } catch (error) {
    console.error('[PROXY ERROR]:', error.message);
    res.status(500).json({ 
      error: 'Falha ao conectar com o ERP Gennera via Proxy Interno',
      details: error.message 
    });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 BFF CEMAL (Proxy Gennera + Web) rodando na porta ${port}`);
});
