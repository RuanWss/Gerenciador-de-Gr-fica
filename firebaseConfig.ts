
import * as firebaseApp from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDAKoXebsuV8kN9jZXa0md-aMUsbawusU4",
  authDomain: "area-do-adm.firebaseapp.com",
  projectId: "area-do-adm",
  storageBucket: "area-do-adm.firebasestorage.app",
  messagingSenderId: "310104062216",
  appId: "1:310104062216:web:43024933bc4ddc455054bd",
  measurementId: "G-YVH4JK7ME0"
};

// Initialize Firebase using the Modular SDK pattern
// Using namespace import and casting to any to avoid "no exported member" TS error if types are mismatched
const app = (firebaseApp as any).initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { firebaseConfig, app, auth, db, storage };
// No default export to enforce named imports consistency
