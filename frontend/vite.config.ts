import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");

export default defineConfig({
  base: "/",
  plugins: [react()],
  appType: "spa",

  // Server configuration
  server: {
    port: 3003,
    strictPort: true,
    host: true,
    cors: true,
    open: true,
    hmr: {
      host: "localhost",
      protocol: "ws",
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:3002",
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: "ws://localhost:3002",
        ws: true,
        changeOrigin: true,
      },
      // Proxy for uploaded files
      "/uploads": {
        target: "http://localhost:3002",
        changeOrigin: true,
        secure: false,
      },
    },
    // This is the key part for SPA fallback
    fs: {
      strict: false,
    },
  },

  // Build configuration
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
    },
    sourcemap: true,
    minify: "esbuild",
    outDir: "dist",
    emptyOutDir: true,
  },

  // Resolve configuration
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
