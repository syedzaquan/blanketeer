import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { qrcode } from 'vite-plugin-qrcode';

export default defineConfig({
  plugins: [react(), qrcode()],
  server: {
    host: true,
  },
  // Use relative base for sub-path routing on GitHub Pages
  base: './',
});
