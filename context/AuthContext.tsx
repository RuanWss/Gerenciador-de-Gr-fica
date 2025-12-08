import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from 'firebase/auth';
import { getUserProfile } from '../services/firebaseService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
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
        // VERIFICAÇÃO DE LOGIN DE FREQUÊNCIA (TERMINAL)
        if (firebaseUser.email === 'frequencia.cemal@ceprofmal.com') {
             setUser({
                id: firebaseUser.uid,
                name: 'Terminal de Frequência',
                email: firebaseUser.email,
                role: UserRole.ATTENDANCE_TERMINAL,
                subject: '',
                classes: []
              });
              setLoading(false);
              return;
        }

        // VERIFICAÇÃO DE ADMIN (GRÁFICA)
        if (
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
              setLoading(false);
              return;
        }

        // Busca dados adicionais do Firestore (Role, Disciplina, Turmas)
        const userProfile = await getUserProfile(firebaseUser.uid);
        if (userProfile) {
          setUser(userProfile);
        } else {
          // Fallback se não tiver perfil no banco
          setUser({
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Professor',
            email: firebaseUser.email || '',
            role: UserRole.TEACHER, 
            subject: '',
            classes: []
          });
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
      console.error("Erro no login:", error);

      // AUTO-HEALING (CORREÇÃO AUTOMÁTICA):
      // Se der erro de credencial inválida, tentamos criar a conta automaticamente.
      // Isso facilita o acesso para novos usuários ou testes (como ruan.wss@gmail.com).
      if (
        error.code === 'auth/user-not-found' || 
        error.code === 'auth/invalid-credential' || 
        error.code === 'auth/invalid-login-credentials' ||
        error.code === 'auth/wrong-password'
      ) {
         try {
           console.log("Conta não encontrada ou senha incorreta. Tentando criar/registrar automaticamente para acesso...");
           // Tenta criar. Se o email já existir (mas senha errada), vai dar erro aqui.
           // Se não existir, cria e loga.
           await createUserWithEmailAndPassword(auth, email, password);
           return true; 
         } catch (createError: any) {
           console.error("Erro ao tentar criar conta automaticamente:", createError);
           // Se o erro for email-already-in-use, significa que a senha estava errada no login original.
           if (createError.code === 'auth/email-already-in-use') {
               console.warn("O e-mail já existe, mas a senha estava incorreta.");
           }
           return false;
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

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};