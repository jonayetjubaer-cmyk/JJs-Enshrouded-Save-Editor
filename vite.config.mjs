import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = fileURLToPath(new URL('./build-assets/game/', import.meta.url));
const previewAssets = {
  name: 'jj-preview-game-assets',
  configureServer(server) {
    server.middlewares.use('/game', async (req, res, next) => {
      try {
        const file = path.resolve(gameRoot, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
        if (!file.startsWith(gameRoot) || !(await stat(file)).isFile()) { res.statusCode = 404; res.end(); return; }
        const ext = path.extname(file);
        res.setHeader('Content-Type', { '.webp': 'image/webp', '.otf': 'font/otf', '.ttf': 'font/ttf' }[ext] || 'application/octet-stream');
        createReadStream(file).on('error', next).pipe(res);
      } catch { res.statusCode = 404; res.end(); }
    });
  },
};

export default defineConfig({
  root: 'src',
  base: './',
  plugins: [react(), previewAssets],
  build: { outDir: '../dist', emptyOutDir: true },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
});
