import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    define: {
      __VITE_IMGBB_API_KEY__: JSON.stringify(env.VITE_IMGBB_API_KEY || ''),
    },
  }
})
