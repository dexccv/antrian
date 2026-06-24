import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration using Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "placeholder-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "placeholder-auth-domain.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "placeholder-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "placeholder-project-id.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000"
};

// Check if we are using placeholder values (demo mode)
export const isDemoMode = 
  firebaseConfig.apiKey === "placeholder-api-key" || 
  firebaseConfig.projectId === "placeholder-project-id";

let app;
let auth;
let db;

try {
  if (isDemoMode) {
    console.warn("Queue Hub running in DEMO mode with local storage fallback. Configure VITE_FIREBASE_* env vars to connect to real Firebase.");
  }
  
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Failed to initialize Firebase SDK:", error);
}

export { app, auth, db };
export default app;
