import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://server:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path, // No rewriting necessary, just pass through
        configure: (proxy, options) => {
          // Add detailed logging for debugging API calls
          proxy.on('error', (err, req, res) => {
            console.error('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`Proxying request to: ${req.url}`);
          });
        }
      },
      '/socket.io': {
        target: 'http://server:3000',
        ws: true,
        changeOrigin: true,
        secure: false
      }
    },
    hmr: {
      clientPort: 5173
    }
  },
  optimizeDeps: {
    include: ['socket.io-client']
  }
})