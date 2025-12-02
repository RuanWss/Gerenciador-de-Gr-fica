import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Configuração real do projeto
const firebaseConfig = {
  apiKey: "AIzaSyDAKoXebsuV8kN9jZXa0md-aMUsbawusU4",
  authDomain: "area-do-adm.firebaseapp.com",
  projectId: "area-do-adm",
  storageBucket: "area-do-adm.firebasestorage.app",
  messagingSenderId: "310104062216",
  appId: "1:310104062216:web:43024933bc4ddc455054bd",
  measurementId: "G-YVH4JK7ME0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;