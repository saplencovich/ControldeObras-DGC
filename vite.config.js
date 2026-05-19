import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // permite usar "@/..." en imports
    },
  },
  plugins: [react()],
  server: {
    host: true,
    port: 5173, // opcional, puerto de desarrollo
  },
});