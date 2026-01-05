import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// --- PROXY PARA API GENNERA ---
// Este endpoint atua como um Backend-for-Frontend (BFF) para evitar erros de CORS 
// e simplificar a integração com o ERP.
app.all('/gennera-api/*', async (req, res) => {
  // Captura o restante da URL após /gennera-api/
  let targetPath = req.params[0] || req.url.split('/gennera-api/')[1];
  
  // Limpeza de barras duplicadas
  if (targetPath && targetPath.startsWith('/')) {
    targetPath = targetPath.substring(1);
  }
  
  const targetUrl = `https://api2.gennera.com.br/api/v1/${targetPath}`;
  
  console.log(`[PROXY] Chamando Gennera: ${req.method} ${targetUrl}`);

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers['authorization'] || '',
      }
    };

    // Repassa o corpo da requisição para métodos de escrita
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && Object.keys(req.body).length > 0) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get('content-type');
    
    console.log(`[PROXY] Resposta Gennera: ${response.status}`);

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

// Entrega os arquivos estáticos da pasta 'dist' (build do Vite)
app.use(express.static(path.join(__dirname, 'dist')));

// Suporte ao roteamento do React (Single Page Application)
// Redireciona todas as rotas não tratadas para o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 BFF CEMAL (Proxy Gennera + Web) rodando na porta ${port}`);
});