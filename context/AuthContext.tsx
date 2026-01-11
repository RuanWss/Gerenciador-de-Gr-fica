
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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
            const userProfile = await getUserProfile(firebaseUser.uid);
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
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      if (!password) return false;
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          const systemPasswords: Record<string, string> = {
              'ruan.wss@gmail.com': 'cemal#2016',
              'pontoequipecemal@ceprofmal.com': 'cemal#2016',
              'rh@ceprofmal.com': 'cemal#2016',
              'frequencia.cemal@ceprofmal.com': 'cemal#2016',
              'cemal.salas@ceprofmal.com': 'cemal#2016',
              'cemalaee@hotmail.com': 'cemal2016'
          };

          if (systemPasswords[email] === password) {
              try {
                  await createUserWithEmailAndPassword(auth, email, password);
                  return true;
              } catch (createError) {
                  return false;
              }
          }
      }
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro no logout", error);
    }
  };

  const changePassword = async (newPassword: string) => {
    if (auth.currentUser) {
      await updatePassword(auth.currentUser, newPassword);
    } else {
      throw new Error("Usuário não autenticado");
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, changePassword, isAuthenticated: !!user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
