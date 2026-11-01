import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    // Relative base ensures asset URLs (./assets/...) load under GitHub Pages repository subpaths
    base: './',
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'github-pages-helper',
        closeBundle() {
          try {
            const distPath = fileURLToPath(new URL('./dist', import.meta.url));
            if (fs.existsSync(distPath)) {
              // Prevent GitHub Pages from ignoring files or using Jekyll
              fs.writeFileSync(path.join(distPath, '.nojekyll'), '');
              
              // Duplicate index.html to 404.html for SPA reload routing
              const indexPath = path.join(distPath, 'index.html');
              const notFoundPath = path.join(distPath, '404.html');
              if (fs.existsSync(indexPath)) {
                fs.copyFileSync(indexPath, notFoundPath);
              }
            }
          } catch (e) {
            console.warn('GitHub Pages helper notice:', e);
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('.', import.meta.url)),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
