import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    react(),
    // Copy CAD engine worker files to assets/ so the browser can load them.
    // These are Web Workers + optional WASM (LibreDWG for DWG support).
    viteStaticCopy({
      targets: [
        {
          // DXF parser worker (pure JS)
          src: 'node_modules/@mlightcad/data-model/dist/dxf-parser-worker.js',
          dest: 'assets',
        },
        {
          // DWG parser worker (LibreDWG WebAssembly — binary DWG format)
          src: 'node_modules/@mlightcad/cad-simple-viewer/dist/*-worker.js',
          dest: 'assets',
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Prevent Vite from inlining large WASM blobs
  build: {
    modulePreload: false,
    assetsInlineLimit: 0,
  },
  server: {
    port: 9834,
    host: true,
    proxy: {
      // Long timeout for DWG upload + conversion (other /api routes are fast)
      '/api/v1/cad': {
        target: 'http://localhost:9833',
        changeOrigin: true,
        timeout: 300000, // 5 min
        proxyTimeout: 300000,
      },
      '/api': {
        target: 'http://localhost:9833',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:9831',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth/, ''),
      },
      '/martin': {
        target: 'http://localhost:9836',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/martin/, ''),
      },
    },
  },
  preview: {
    port: 9834,
  },
})
