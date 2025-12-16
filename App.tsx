
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

  if (user?.role === UserRole.CLASSROOM) {
      return <ClassroomFiles />;
  }
  
  // VERIFICAÇÃO DE MÚLTIPLOS ROLES
  if (user?.roles && user.roles.length > 1 && !sessionRole) {
      return (
          <div className="fixed inset-0 z-50 bg-[#0f0f10] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/40 via-[#0f0f10] to-[#0f0f10] flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
              <div className="max-w-5xl w-full">
                  <div className="text-center mb-12">
                      <img 
                        src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" 
                        alt="Logo" 
                        className="h-24 w-auto mx-auto mb-6 object-contain drop-shadow-2xl"
                      />
                      <h2 className="text-4xl font-bold text-white mb-2">Bem-vindo, {user.name.split(' ')[0]}</h2>
                      <p className="text-gray-400 text-lg">Selecione o painel que deseja acessar:</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                      {user.roles.includes(UserRole.TEACHER) && (
                          <button 
                            onClick={() => setSessionRole(UserRole.TEACHER)}
                            className="group bg-white p-10 rounded-3xl shadow-2xl border border-gray-100 hover:scale-[1.02] transition-all duration-300 flex flex-col items-center text-center relative overflow-hidden"
                          >
                              <div className="absolute top-0 left-0 w-full h-2 bg-red-600"></div>
                              <div className="h-24 w-24 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6 group-hover:bg-red-600 group-hover:text-white transition-colors shadow-lg group-hover:scale-110 duration-300">
                                  <LayoutGrid size={48} />
                              </div>
                              <h3 className="text-2xl font-bold text-gray-900 mb-3">Portal do Professor</h3>
                              <p className="text-gray-500 text-sm leading-relaxed">
                                  Acesso para envio de provas, materiais de aula, planejamento e gestão acadêmica.
                              </p>
                          </button>
                      )}

                      {user.roles.includes(UserRole.PRINTSHOP) && (
                          <button 
                            onClick={() => setSessionRole(UserRole.PRINTSHOP)}
                            className="group bg-white p-10 rounded-3xl shadow-2xl border border-gray-100 hover:scale-[1.02] transition-all duration-300 flex flex-col items-center text-center relative overflow-hidden"
                          >
                               <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
                               <div className="h-24 w-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-lg group-hover:scale-110 duration-300">
                                  <Printer size={48} />
                              </div>
                              <h3 className="text-2xl font-bold text-gray-900 mb-3">Painel da Escola</h3>
                              <p className="text-gray-500 text-sm leading-relaxed">
                                  Gestão de impressões, calendário escolar, turmas, alunos e configurações do sistema.
                              </p>
                          </button>
                      )}
                  </div>

                  <button onClick={logout} className="mt-16 text-white/40 hover:text-white text-xs flex items-center justify-center gap-2 w-full transition-colors uppercase tracking-widest font-bold">
                      <LogOut size={16} /> Sair da conta
                  </button>
              </div>
          </div>
      );
  }

  const activeRole = sessionRole || user?.role;

  // Renderização Padrão (Fundo Transparente para mostrar gradiente global)
  return (
    <div className="min-h-screen bg-transparent text-gray-100 font-sans">
      <nav className="bg-black/30 backdrop-blur-md shadow-lg border-b border-white/10 sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center gap-4">
              <img 
                src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" 
                alt="Logo" 
                className="h-14 w-auto object-contain"
              />
              <div className="h-8 w-px bg-white/10 hidden sm:block"></div>
              <span className="text-lg font-bold text-gray-200 hidden sm:block">
                {activeRole === UserRole.TEACHER ? 'Portal do Professor' : activeRole === UserRole.HR ? 'Gestão de RH' : 'Painel da Escola'}
              </span>
            </div>
            <div className="flex items-center gap-4">
               <span className="text-sm text-gray-300 hidden sm:block font-medium">{user?.email}</span>
               
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
                className="p-2 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
