
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      // Usamos 'classic' para garantir compatibilidade com o JSX vindo de CDNs
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
      // Mapeamento de módulos que não devem ser empacotados (carregados via index.html)
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        'firebase/app',
        '@firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'firebase/storage',
        '@firebase/storage',
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
          '@firebase/app': 'firebase',
          'firebase/auth': 'firebase',
          'firebase/firestore': 'firebase',
          'firebase/storage': 'firebase',
          '@firebase/storage': 'firebase',
        }
      }
    }
  }
});
