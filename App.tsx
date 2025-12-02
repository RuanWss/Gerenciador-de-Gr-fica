import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import { Login } from './pages/Login';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { PrintShopDashboard } from './pages/PrintShopDashboard';
import { PublicSchedule } from './pages/PublicSchedule';
import { UserRole } from './types';
import { LogOut } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentHash, setCurrentHash] = useState(window.location.hash);

  useEffect(() => {
    const handleLocationChange = () => {
        setCurrentPath(window.location.pathname);
        setCurrentHash(window.location.hash);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
        window.removeEventListener('popstate', handleLocationChange);
        window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);
  
  // Rota segura para o Quadro de Horários (aceita /horarios ou /#horarios)
  if (currentPath === '/horarios' || currentHash === '#horarios') {
      return <PublicSchedule />;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-transparent">
      <nav className="bg-black/80 backdrop-blur-md shadow-lg border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center gap-4">
              <img 
                src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" 
                alt="Logo" 
                className="h-14 w-auto object-contain"
              />
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white border border-white/10">
                {user?.role === UserRole.TEACHER ? 'Portal do Professor' : 'Painel da Escola'}
              </span>
            </div>
            <div className="flex items-center gap-4">
               <span className="text-sm text-gray-300 hidden sm:block">{user?.email}</span>
               <button 
                onClick={logout}
                className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Sair"
               >
                 <LogOut size={20} />
               </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user?.role === UserRole.TEACHER && <TeacherDashboard />}
        {user?.role === UserRole.PRINTSHOP && <PrintShopDashboard />}
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;