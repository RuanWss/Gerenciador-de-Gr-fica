import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Instrui o Rollup a não incluir 'face-api.js' no bundle
      // A importação será resolvida pelo navegador via importmap (CDN)
      external: ['face-api.js'],
      output: {
        globals: {
          'face-api.js': 'faceapi'
        }
      }
    }
  }
});