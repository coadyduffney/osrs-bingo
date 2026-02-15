import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables - needed for Docker builds where .env isn't automatically available
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    define: {
      __VITE_IMGBB_API_KEY__: JSON.stringify(env.VITE_IMGBB_API_KEY || ''),
      __VITE_API_URL__: JSON.stringify(env.VITE_API_URL || ''),
      __VITE_FIREBASE_API_KEY__: JSON.stringify(env.VITE_FIREBASE_API_KEY || ''),
      __VITE_FIREBASE_AUTH_DOMAIN__: JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN || ''),
      __VITE_FIREBASE_PROJECT_ID__: JSON.stringify(env.VITE_FIREBASE_PROJECT_ID || ''),
      __VITE_FIREBASE_STORAGE_BUCKET__: JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET || ''),
      __VITE_FIREBASE_MESSAGING_SENDER_ID__: JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''),
      __VITE_FIREBASE_APP_ID__: JSON.stringify(env.VITE_FIREBASE_APP_ID || ''),
    },
  }
})
