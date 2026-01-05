
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      // Usamos 'classic' para evitar a dependência de 'react/jsx-runtime' 
      // que falha ao tentar resolver sub-pacotes via CDN no build.
      jsxRuntime: 'classic',
    }),
  ],
  server: {
    proxy: {
      '/gennera-api': {
        target: 'https://api2.gennera.com.br/api/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gennera-api/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      // Definimos como externos todos os módulos carregados via CDN.
      // É necessário incluir caminhos específicos como 'react-dom/client'.
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'firebase/storage',
        '@google/genai',
        'lucide-react',
        'face-api.js'
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-dom/client': 'ReactDOM',
          'firebase/app': 'firebase',
          'firebase/auth': 'firebase',
          'firebase/firestore': 'firebase',
          'firebase/storage': 'firebase',
        }
      }
    }
  }
});
