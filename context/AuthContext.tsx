
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
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
    // 1. Restaurar Sessão Virtual (Bypass Firebase)
    const virtualSession = localStorage.getItem('virtual_session');
    if (virtualSession) {
        try {
            const userData = JSON.parse(virtualSession);
            setUser(userData);
        } catch (e) {
            console.error("Sessão virtual inválida", e);
            localStorage.removeItem('virtual_session');
        }
    }

    // 2. Ouvir Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Se tiver sessão virtual ativa, ela tem prioridade sobre o estado 'null' do firebase
      const currentVirtual = localStorage.getItem('virtual_session');
      
      if (firebaseUser) {
        // Se logou no Firebase, sobrescreve a virtual
        localStorage.removeItem('virtual_session');

        // Lógica de mapeamento de usuários especiais do Firebase
        if (firebaseUser.email === 'frequencia.cemal@ceprofmal.com') {
             setUser({
                id: firebaseUser.uid,
                name: 'Terminal de Frequência',
                email: firebaseUser.email,
                role: UserRole.ATTENDANCE_TERMINAL,
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
            // Professores / Outros
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
        // Firebase deslogado. Só limpa user se não tiver sessão virtual.
        if (!currentVirtual) {
            setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    // --- BYPASS PARA CONTAS DE SISTEMA SOLICITADAS ---
    // Permite acesso imediato sem necessidade de criar user no Firebase Console
    
    // 1. Terminal de Ponto Equipe
    if (email === 'pontoequipecemal@ceprofmal.com' && password === 'cemal#2016') {
        const sysUser: User = {
            id: 'sys_staff_terminal',
            name: 'Terminal de Ponto',
            email: email,
            role: UserRole.STAFF_TERMINAL,
            subject: '',
            classes: []
        };
        setUser(sysUser);
        localStorage.setItem('virtual_session', JSON.stringify(sysUser));
        return true;
    }

    // 2. Painel de RH
    if (email === 'rh@ceprofmal.com' && password === 'cemal#2016') {
        const sysUser: User = {
            id: 'sys_rh_admin',
            name: 'Recursos Humanos',
            email: email,
            role: UserRole.HR,
            subject: '',
            classes: []
        };
        setUser(sysUser);
        localStorage.setItem('virtual_session', JSON.stringify(sysUser));
        return true;
    }

    // --- AUTENTICAÇÃO PADRÃO FIREBASE ---
    try {
      if (!password) return false;
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error: any) {
      console.warn("Falha no login:", error.code);
      return false;
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('virtual_session');
      setUser(null);
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
