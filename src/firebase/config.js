// src/firebase/config.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCPwDtyIpbsLd1xxN8jUuAe-f171JoCeOs",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "metrolog-e02d9.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "metrolog-e02d9",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "metrolog-e02d9.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "830683172695",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:830683172695:web:5e407f71ec9e4e60b27812",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);