import { readFileSync } from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    // Release builds pass the tag's version; local builds use package.json.
    __APP_VERSION__: JSON.stringify(process.env.APP_VERSION || pkg.version),
  },
  // The app is loaded from the phone, not over the network, so a larger bundle is fine.
  build: { chunkSizeWarningLimit: 800 },
  server: { port: 5173 },
});
