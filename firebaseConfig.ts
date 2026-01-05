
// Use modular SDK v9 imports
// Fixing "no exported member" errors by using @firebase/app directly
import { initializeApp } from '@firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
// Import getStorage from the modular storage package
// Fixing "no exported member" errors by using @firebase/storage directly
import { getStorage } from '@firebase/storage';

// Estas são as credenciais do seu projeto Firebase
export const firebaseConfig = {
  apiKey: "AIzaSyDAKoXebsuV8kN9jZXa0md-aMUsbawusU4",
  authDomain: "area-do-adm.firebaseapp.com",
  projectId: "area-do-adm",
  storageBucket: "area-do-adm.firebasestorage.app",
  messagingSenderId: "310104062216",
  appId: "1:310104062216:web:43024933bc4ddc455054bd",
  measurementId: "G-YVH4JK7ME0"
};

// Initialize Firebase with modular SDK
// Create the main Firebase app instance
const app = initializeApp(firebaseConfig);

// Initialize Firebase services using the app instance
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
export const storage = getStorage(app);

export default app;
