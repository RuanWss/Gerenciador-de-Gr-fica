
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
  let targetPath = req.url.replace('/gennera-api', '');
  
  // Remove query params se houver, o fetch lida com eles via req.url original se necessário, 
  // mas aqui estamos reconstruindo. Se precisar de query strings:
  const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  
  // Limpa o targetPath para não ter a query string duplicada
  if (targetPath.includes('?')) {
    targetPath = targetPath.substring(0, targetPath.indexOf('?'));
  }

  // Garante que targetPath comece com /
  if (!targetPath.startsWith('/')) targetPath = '/' + targetPath;
  
  // URL base da API Gennera v1
  const targetUrl = `https://api2.gennera.com.br/api/v1${targetPath}${queryString}`;
  
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
    
    console.log(`[PROXY] Response: ${response.status}`);

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
      error: 'Falha na ponte com Gennera ERP',
      details: error.message 
    });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 Gateway CEMAL rodando na porta ${port}`);
});
