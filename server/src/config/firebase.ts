import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Initialize Firebase Admin
const initializeFirebase = () => {
  try {
    if (!admin.apps.length) {
      // Option 1: Using service account key file
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        const serviceAccountPath = resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
        const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } 
      // Option 2: Using environment variables
      else if (process.env.FIREBASE_PROJECT_ID) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
          })
        });
      } else {
        throw new Error('Firebase credentials not configured. Please set up environment variables.');
      }
      console.log('✅ Firebase Admin initialized successfully');
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase:', error);
    throw error;
  }
};

// Initialize Firebase
initializeFirebase();

// Get Firestore instance
export const db = getFirestore();

// Set Firestore settings
db.settings({
  ignoreUndefinedProperties: true,
  timestampsInSnapshots: true
});

// Collection names as constants
export const COLLECTIONS = {
  USERS: 'users',
  EVENTS: 'events',
  TEAMS: 'teams',
  TASKS: 'tasks',
  TASK_COMPLETIONS: 'taskCompletions',
  EVENT_INVITATIONS: 'eventInvitations'
} as const;

// Helper function to get a collection reference
export const getCollection = (collectionName: string) => {
  return db.collection(collectionName);
};

export default admin;
