
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
      external: [
        'react',
        'react-dom',
        '@google/genai',
        'lucide-react',
        'face-api.js'
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
});
