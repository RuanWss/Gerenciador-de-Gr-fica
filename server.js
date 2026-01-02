
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

// Middleware para servir arquivos estáticos da build
app.use(express.static(path.join(__dirname, 'dist')));

// Redireciona todas as rotas para o index.html (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Aplicação rodando na porta ${port}`);
});
