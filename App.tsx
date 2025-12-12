
import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import { Login } from './pages/Login';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { PrintShopDashboard } from './pages/PrintShopDashboard';
import { PublicSchedule } from './pages/PublicSchedule';
import { AttendanceTerminal } from './pages/AttendanceTerminal';
import { StaffAttendanceTerminal } from './pages/StaffAttendanceTerminal';
import { HRDashboard } from './pages/HRDashboard';
import { ClassroomFiles } from './pages/ClassroomFiles';
import { UserRole } from './types';
import { LogOut, LayoutGrid, Printer } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  
  // Estado para controlar a role selecionada na sessão (se o usuário tiver múltiplas)
  const [sessionRole, setSessionRole] = useState<UserRole | null>(null);

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

  // Se o usuário deslogar, reseta a role da sessão
  useEffect(() => {
      if (!isAuthenticated) {
          setSessionRole(null);
      }
  }, [isAuthenticated]);
  
  if (currentPath === '/horarios' || currentHash === '#horarios') {
      return <PublicSchedule />;
  }

  if (currentPath === '/materiais' || currentHash === '#materiais') {
      return <ClassroomFiles />;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Roteamento baseado no Role
  if (user?.role === UserRole.ATTENDANCE_TERMINAL) {
      return <AttendanceTerminal />;
  }
  
  if (user?.role === UserRole.STAFF_TERMINAL) {
      return <StaffAttendanceTerminal />;
  }
  
  if (user?.role === UserRole.HR) {
      return <HRDashboard />;
  }

  // VERIFICAÇÃO DE MÚLTIPLOS ROLES
  if (user?.roles && user.roles.length > 1 && !sessionRole) {
      return (
          <div className="fixed inset-0 z-50 bg-[#0f0f10] flex flex-col items-center justify-center p-4">
              <div className="max-w-md w-full bg-[#18181b] rounded-3xl p-8 border border-gray-800 shadow-2xl text-center">
                  <img 
                    src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" 
                    alt="Logo" 
                    className="h-16 w-auto mx-auto mb-6 opacity-80"
                  />
                  <h2 className="text-2xl font-bold text-white mb-2">Olá, {user.name.split(' ')[0]}</h2>
                  <p className="text-gray-400 mb-8">Selecione qual painel deseja acessar agora:</p>
                  
                  <div className="space-y-4">
                      {user.roles.includes(UserRole.TEACHER) && (
                          <button 
                            onClick={() => setSessionRole(UserRole.TEACHER)}
                            className="w-full bg-[#27272a] hover:bg-brand-600 hover:text-white text-gray-200 font-bold py-4 px-6 rounded-2xl flex items-center justify-between group transition-all duration-300 border border-gray-700 hover:border-brand-500"
                          >
                              <div className="flex items-center gap-4">
                                  <div className="p-3 bg-black/40 rounded-xl group-hover:bg-white/20 transition-colors">
                                      <LayoutGrid size={24} />
                                  </div>
                                  <span className="text-lg">Painel do Professor</span>
                              </div>
                              <span className="text-xs text-gray-500 group-hover:text-white/80">Acessar &rarr;</span>
                          </button>
                      )}

                      {user.roles.includes(UserRole.PRINTSHOP) && (
                          <button 
                            onClick={() => setSessionRole(UserRole.PRINTSHOP)}
                            className="w-full bg-[#27272a] hover:bg-blue-600 hover:text-white text-gray-200 font-bold py-4 px-6 rounded-2xl flex items-center justify-between group transition-all duration-300 border border-gray-700 hover:border-blue-500"
                          >
                               <div className="flex items-center gap-4">
                                  <div className="p-3 bg-black/40 rounded-xl group-hover:bg-white/20 transition-colors">
                                      <Printer size={24} />
                                  </div>
                                  <span className="text-lg">Painel da Escola</span>
                              </div>
                              <span className="text-xs text-gray-500 group-hover:text-white/80">Acessar &rarr;</span>
                          </button>
                      )}
                  </div>

                  <button onClick={logout} className="mt-8 text-gray-500 hover:text-white text-sm flex items-center justify-center gap-2 w-full">
                      <LogOut size={14} /> Sair da conta
                  </button>
              </div>
          </div>
      );
  }

  const activeRole = sessionRole || user?.role;

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
                {activeRole === UserRole.TEACHER ? 'Portal do Professor' : 'Painel da Escola'}
              </span>
            </div>
            <div className="flex items-center gap-4">
               <span className="text-sm text-gray-300 hidden sm:block">{user?.email}</span>
               
               {user?.roles && user.roles.length > 1 && (
                   <button 
                    onClick={() => setSessionRole(null)}
                    className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors hidden sm:block"
                    title="Trocar de Painel"
                   >
                       <LayoutGrid size={20} />
                   </button>
               )}

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
        {activeRole === UserRole.TEACHER && <TeacherDashboard />}
        {activeRole === UserRole.PRINTSHOP && <PrintShopDashboard />}
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
