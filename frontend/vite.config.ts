import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type PluginOption} from 'vite';

export function createViteConfig(portal: 'client' | 'admin' = 'client') {
  const plugins: PluginOption[] = [react(), tailwindcss()];
  if (portal === 'admin') {
    plugins.push({
      name: 'dentacore-admin-entry',
      configureServer(server) {
        server.middlewares.use((request, _response, next) => {
          if (request.url === '/') request.url = '/admin.html';
          next();
        });
      },
    });
  } else {
    plugins.push({
      name: 'dentacore-admin-port-redirect',
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          if (request.url === '/admin' || request.url === '/admin/' || request.url === '/admin.html') {
            const host = (request.headers.host ?? 'localhost:3000').replace(/:\d+$/, ':3001');
            response.statusCode = 302;
            response.setHeader('Location', `http://${host}/`);
            response.end();
            return;
          }
          next();
        });
      },
    });
  }

  return defineConfig(() => ({
    plugins,
    build: {
      rollupOptions: {
        input: {
          client: path.resolve(__dirname, 'index.html'),
          admin: path.resolve(__dirname, 'admin.html'),
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: portal === 'admin' ? 3001 : 3000,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: process.env.DENTACORE_API_PROXY ?? 'http://localhost:5000',
          changeOrigin: true,
        },
        '/hubs': {
          target: process.env.DENTACORE_API_PROXY ?? 'http://localhost:5000',
          changeOrigin: true,
          ws: true,
        },
      },
    },
  }));
}

export default createViteConfig();
