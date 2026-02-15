import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

// Firebase configuration for frontend
// Use define'd values from vite.config.ts for Docker compatibility
// These are PUBLIC values and safe to expose in frontend code
const getEnv = (key: string, fallback = '') => (window as any)[`__${key}__`] || (import.meta.env as any)[key] || fallback;

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN', 'osrs-bingo-516ec.firebaseapp.com'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID', 'osrs-bingo-516ec'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET', 'osrs-bingo-516ec.appspot.com'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID'),
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);

export default app;
