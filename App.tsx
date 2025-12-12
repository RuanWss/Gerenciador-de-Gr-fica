
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

  // Roteamento baseado no Role (Terminais continuam isolados com fundo escuro)
  if (user?.role === UserRole.ATTENDANCE_TERMINAL) {
      return <AttendanceTerminal />;
  }
  
  if (user?.role === UserRole.STAFF_TERMINAL) {
      return <StaffAttendanceTerminal />;
  }
  
  // VERIFICAÇÃO DE MÚLTIPLOS ROLES
  if (user?.roles && user.roles.length > 1 && !sessionRole) {
      return (
          <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col items-center justify-center p-4">
              <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-200 shadow-2xl text-center">
                  <img 
                    src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" 
                    alt="Logo" 
                    className="h-20 w-auto mx-auto mb-6 object-contain"
                  />
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Olá, {user.name.split(' ')[0]}</h2>
                  <p className="text-gray-500 mb-8">Selecione qual painel deseja acessar agora:</p>
                  
                  <div className="space-y-4">
                      {user.roles.includes(UserRole.TEACHER) && (
                          <button 
                            onClick={() => setSessionRole(UserRole.TEACHER)}
                            className="w-full bg-white hover:bg-brand-50 hover:border-brand-500 text-gray-700 font-bold py-4 px-6 rounded-2xl flex items-center justify-between group transition-all duration-300 border border-gray-200 shadow-sm"
                          >
                              <div className="flex items-center gap-4">
                                  <div className="p-3 bg-gray-100 rounded-xl group-hover:bg-brand-100 text-brand-600 transition-colors">
                                      <LayoutGrid size={24} />
                                  </div>
                                  <span className="text-lg">Painel do Professor</span>
                              </div>
                              <span className="text-xs text-gray-400 group-hover:text-brand-600">Acessar &rarr;</span>
                          </button>
                      )}

                      {user.roles.includes(UserRole.PRINTSHOP) && (
                          <button 
                            onClick={() => setSessionRole(UserRole.PRINTSHOP)}
                            className="w-full bg-white hover:bg-blue-50 hover:border-blue-500 text-gray-700 font-bold py-4 px-6 rounded-2xl flex items-center justify-between group transition-all duration-300 border border-gray-200 shadow-sm"
                          >
                               <div className="flex items-center gap-4">
                                  <div className="p-3 bg-gray-100 rounded-xl group-hover:bg-blue-100 text-blue-600 transition-colors">
                                      <Printer size={24} />
                                  </div>
                                  <span className="text-lg">Painel da Escola</span>
                              </div>
                              <span className="text-xs text-gray-400 group-hover:text-blue-600">Acessar &rarr;</span>
                          </button>
                      )}
                  </div>

                  <button onClick={logout} className="mt-8 text-gray-500 hover:text-red-600 text-sm flex items-center justify-center gap-2 w-full transition-colors">
                      <LogOut size={14} /> Sair da conta
                  </button>
              </div>
          </div>
      );
  }

  const activeRole = sessionRole || user?.role;

  // Renderização Padrão (Tema Claro para Painéis Administrativos)
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center gap-4">
              <img 
                src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" 
                alt="Logo" 
                className="h-14 w-auto object-contain"
              />
              <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
              <span className="text-lg font-bold text-gray-700 hidden sm:block">
                {activeRole === UserRole.TEACHER ? 'Portal do Professor' : activeRole === UserRole.HR ? 'Gestão de RH' : 'Painel da Escola'}
              </span>
            </div>
            <div className="flex items-center gap-4">
               <span className="text-sm text-gray-500 hidden sm:block font-medium">{user?.email}</span>
               
               {user?.roles && user.roles.length > 1 && (
                   <button 
                    onClick={() => setSessionRole(null)}
                    className="p-2 rounded-md text-gray-400 hover:text-brand-600 hover:bg-gray-100 transition-colors hidden sm:block"
                    title="Trocar de Painel"
                   >
                       <LayoutGrid size={20} />
                   </button>
               )}

               <button 
                onClick={logout}
                className="p-2 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
        {activeRole === UserRole.HR && <HRDashboard />}
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
