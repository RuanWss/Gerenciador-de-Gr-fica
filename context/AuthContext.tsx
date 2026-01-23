
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { auth } from '../firebaseConfig';
// Use modular SDK v9 imports from firebase/auth
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updatePassword 
} from 'firebase/auth';
import { getUserProfile } from '../services/firebaseService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (newPassword: string) => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// FIX: Export custom hook to consume the auth context.
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // ACESSO MASTER - COORDENADOR DE TI
          if (firebaseUser.email === 'ruan.wss@gmail.com') {
               setUser({
                  id: firebaseUser.uid,
                  name: 'Ruan Santos',
                  email: firebaseUser.email,
                  role: UserRole.PRINTSHOP,
                  roles: [
                      UserRole.TEACHER, 
                      UserRole.PRINTSHOP, 
                      UserRole.HR, 
                      UserRole.AEE, 
                      UserRole.KINDERGARTEN, 
                      UserRole.LIBRARY
                  ],
                  subject: 'TI',
                  classes: []
                });
          }
          else if (firebaseUser.email === 'frequencia.cemal@ceprofmal.com') {
               setUser({
                  id: firebaseUser.uid,
                  name: 'Terminal de Frequência',
                  email: firebaseUser.email,
                  role: UserRole.ATTENDANCE_TERMINAL,
                  subject: '',
                  classes: []
                });
          }
          else if (firebaseUser.email === 'pontoequipecemal@ceprofmal.com') {
               setUser({
                  id: firebaseUser.uid,
                  name: 'Terminal de Ponto',
                  email: firebaseUser.email,
                  role: UserRole.STAFF_TERMINAL,
                  subject: '',
                  classes: []
                });
          }
          else if (firebaseUser.email === 'rh@ceprofmal.com') {
               setUser({
                  id: firebaseUser.uid,
                  name: 'Recursos Humanos',
                  email: firebaseUser.email,
                  role: UserRole.HR,
                  subject: '',
                  classes: []
                });
          }
          else if (firebaseUser.email === 'cemal.salas@ceprofmal.com') {
               setUser({
                  id: firebaseUser.uid,
                  name: 'Arquivos da Turma',
                  email: firebaseUser.email,
                  role: UserRole.CLASSROOM,
                  subject: '',
                  classes: []
                });
          }
          else if (firebaseUser.email === 'cemalaee@hotmail.com') {
               setUser({
                  id: firebaseUser.uid,
                  name: 'Professor AEE',
                  email: firebaseUser.email,
                  role: UserRole.AEE,
                  subject: 'AEE',
                  classes: []
                });
          }
          else if (firebaseUser.email === 'loyseferr.biblio@gmail.com') {
               setUser({
                  id: firebaseUser.uid,
                  name: 'Bibliotecária',
                  email: firebaseUser.email,
                  role: UserRole.LIBRARY,
                  roles: [UserRole.LIBRARY, UserRole.TEACHER],
                  subject: '',
                  classes: []
                });
          }
          else if (
               firebaseUser.uid === 'QX1GxorHhxU3jPUVXAJVLRndb7E2' || 
               firebaseUser.email === 'graficacemal@gmail.com'
             ) {
               setUser({
                  id: firebaseUser.uid,
                  name: 'Central de Cópias',
                  email: firebaseUser.email || 'graficacemal@gmail.com',
                  role: UserRole.PRINTSHOP,
                  subject: '',
                  classes: []
                });
          }
          else {
              const userProfile = await getUserProfile(firebaseUser.uid, firebaseUser.email || undefined);
              if (userProfile) {
                setUser(userProfile);
              } else {
                setUser({
                  id: firebaseUser.uid,
                  name: firebaseUser.displayName || 'Professor',
                  email: firebaseUser.email || '',
                  role: UserRole.TEACHER, 
                  subject: '',
                  classes: []
                });
              }
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Authentication error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      if (!password) return false;
      const cleanEmail = email.trim();
      const cleanPassword = password.trim();
      
      await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      return true;
    } catch (error: any) {
      const systemPasswords: Record<string, string> = {
          'ruan.wss@gmail.com': 'cemal#2016',
          'pontoequipecemal@ceprofmal.com': 'cemal#2016',
          'rh@ceprofmal.com': 'cemal#2016',
          'frequencia.cemal@ceprofmal.com': 'cemal#2016',
          'cemal.salas@ceprofmal.com': 'cemal#2016',
          'cemalaee@hotmail.com': 'cemal2016',
          'graficacemal@gmail.com': 'cemal#2016'
      };

      const emailInput = email.trim();
      
      // Fallback for system accounts initialization
      if (systemPasswords[emailInput] === password?.trim()) {
          try {
              // Try to create the user if they don't exist yet (first run)
              await createUserWithEmailAndPassword(auth, emailInput, password.trim());
              return true;
          } catch (createError: any) {
              // If creation fails (e.g., user exists but password in DB is different),
              // we can't force login. Just allow it to return false below.
              // We suppress logging here to avoid confusion unless debugging.
          }
      }

      // Suppress expected auth errors from console
      const errorCode = error.code;
      if (
          errorCode === 'auth/invalid-credential' || 
          errorCode === 'auth/user-not-found' || 
          errorCode === 'auth/wrong-password' ||
          errorCode === 'auth/invalid-email'
      ) {
          return false;
      }

      // Log only unexpected errors
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = () => {
    signOut(auth);
  };

  const changePassword = async (newPassword: string) => {
    if (auth.currentUser) {
      await updatePassword(auth.currentUser, newPassword);
    } else {
      throw new Error("No user is currently signed in.");
    }
  };

  // FIX: The AuthProvider component must return a JSX element (the context provider).
  return (
    <AuthContext.Provider value={{ user, login, logout, changePassword, isAuthenticated: !!user, loading }}>
        {children}
    </AuthContext.Provider>
  );
};
