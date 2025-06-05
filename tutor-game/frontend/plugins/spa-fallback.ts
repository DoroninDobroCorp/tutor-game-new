import { Plugin } from 'vite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export default function spaFallback(): Plugin {
  return {
    name: 'spa-fallback',
    configureServer(server) {
      // Serve index.html for all routes
      return () => {
        server.middlewares.use((req, res, next) => {
          // Skip API requests and static assets
          if (
            req.url?.startsWith('/api/') ||
            req.url?.includes('.') ||
            req.url?.startsWith('/@vite/') ||
            req.url?.startsWith('/node_modules/') ||
            req.url?.startsWith('/src/') ||
            req.url?.startsWith('/assets/')
          ) {
            return next();
          }

          // For all other routes, serve index.html
          const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf-8');
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html');
          res.end(html);
        });
      };
    },
  };
}
