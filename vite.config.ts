import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        '/make-server-aaac77aa': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // Add service role key to proxied requests
              if (env.SUPABASE_SERVICE_ROLE_KEY) {
                proxyReq.setHeader('X-Service-Role-Key', env.SUPABASE_SERVICE_ROLE_KEY);
              }
            });
          }
        },
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      }
    },

  }
})