import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // The API runs separately in development; same-origin proxying keeps the session cookie simple.
    proxy: { '/api': 'http://localhost:4000' },
  },
});
