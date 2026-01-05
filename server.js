
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// --- PROXY NATIVO PARA GENNERA ---
// Atua como ponte entre o Navegador e a API da Gennera para evitar erros de CORS
app.all('/gennera-api/*', async (req, res) => {
  const targetPath = req.params[0];
  const targetUrl = `https://api2.gennera.com.br/api/v1/${targetPath}`;
  
  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers['authorization'] || '',
      }
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.json();
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Erro no Proxy Gennera:', error.message);
    res.status(500).json({ error: 'Falha ao conectar com o ERP Gennera via Proxy Interno' });
  }
});

// Entrega os arquivos estáticos da pasta 'dist' (gerada pelo vite build)
app.use(express.static(path.join(__dirname, 'dist')));

// Suporte ao roteamento do React (Single Page Application)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`BFF CEMAL (Proxy Gennera + Web) rodando na porta ${port}`);
});
