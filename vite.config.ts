
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      // Usamos 'classic' para que o Vite transforme JSX em React.createElement
      // Isso evita a dependência de 'react/jsx-runtime' que falha ao externalizar CDN
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
      // Definimos como externos todos os módulos que você carrega via CDN no index.html
      external: [
        'react',
        'react-dom',
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
          'firebase/app': 'firebase',
          'firebase/auth': 'firebase',
          'firebase/firestore': 'firebase',
          'firebase/storage': 'firebase',
        }
      }
    }
  }
});
