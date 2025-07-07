import { createServer } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

export default function spaFallback() {
  return {
    name: 'spa-fallback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Skip API requests and static assets
        if (req.url.startsWith('/api/') || 
            req.url.includes('.') || 
            req.url.startsWith('/@vite/') ||
            req.url.startsWith('/node_modules/') ||
            req.url.startsWith('/src/') ||
            req.url.startsWith('/assets/')) {
          return next();
        }
        
        // For all other routes, serve index.html
        const filePath = resolve(__dirname, 'index.html');
        if (fs.existsSync(filePath)) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html');
          res.end(fs.readFileSync(filePath, 'utf-8'));
        } else {
          next();
        }
      });
    }
  };
}
