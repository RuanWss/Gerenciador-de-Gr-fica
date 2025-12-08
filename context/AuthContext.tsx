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
      console.warn("Falha no login inicial:", error.code);

      // AUTO-HEALING (CORREÇÃO AUTOMÁTICA):
      // Apenas tenta criar a conta se o erro for EXPLICITAMENTE de usuário não encontrado.
      // Erros de senha (invalid-credential, wrong-password) não devem tentar criar conta.
      if (error.code === 'auth/user-not-found') {
         try {
           console.log("Conta não encontrada. Tentando registrar automaticamente...");
           await createUserWithEmailAndPassword(auth, email, password);
           return true; 
         } catch (createError: any) {
           console.error("Erro ao tentar criar conta automaticamente:", createError.code);
           return false;
         }
      }

      // Se for senha errada ou credencial inválida, apenas retorna falso
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