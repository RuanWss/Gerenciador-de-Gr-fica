
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
import { LibraryDashboard } from './pages/LibraryDashboard';
import { UserRole } from './types';
import { LogOut, LayoutGrid, Printer, KeyRound, X, Save, AlertCircle, Book } from 'lucide-react';
import { Button } from './components/Button';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, logout, changePassword } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  
  // Estado para controlar a role selecionada na sessão (se o usuário tiver múltiplas)
  const [sessionRole, setSessionRole] = useState<UserRole | null>(null);

  // Estados para o Modal de Senha
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setPasswordError('');

      if (newPassword.length < 6) {
          setPasswordError("A senha deve ter pelo menos 6 caracteres.");
          return;
      }

      if (newPassword !== confirmPassword) {
          setPasswordError("As senhas não coincidem.");
          return;
      }

      setIsChangingPassword(true);
      try {
          await changePassword(newPassword);
          alert("Senha alterada com sucesso!");
          setShowPasswordModal(false);
          setNewPassword('');
          setConfirmPassword('');
      } catch (error: any) {
          console.error(error);
          if (error.code === 'auth/requires-recent-login') {
              setPasswordError("Por segurança, faça login novamente antes de alterar a senha.");
          } else {
              setPasswordError("Erro ao alterar senha: " + error.message);
          }
      } finally {
          setIsChangingPassword(false);
      }
  };
  
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

                      {user.roles.includes(UserRole.LIBRARY) && (
                          <button 
                            onClick={() => setSessionRole(UserRole.LIBRARY)}
                            className="group bg-white p-10 rounded-3xl shadow-2xl border border-gray-100 hover:scale-[1.02] transition-all duration-300 flex flex-col items-center text-center relative overflow-hidden"
                          >
                               <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600"></div>
                               <div className="h-24 w-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-lg group-hover:scale-110 duration-300">
                                  <Book size={48} />
                              </div>
                              <h3 className="text-2xl font-bold text-gray-900 mb-3">Painel da Biblioteca</h3>
                              <p className="text-gray-500 text-sm leading-relaxed">
                                  Gestão de acervo, controle de empréstimos, alunos e impressão de recibos.
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
                {activeRole === UserRole.TEACHER ? 'Portal do Professor' : 
                 activeRole === UserRole.HR ? 'Gestão de RH' : 
                 activeRole === UserRole.LIBRARY ? 'Painel da Biblioteca' :
                 'Painel da Escola'}
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
                onClick={() => setShowPasswordModal(true)}
                className="p-2 rounded-md text-gray-400 hover:text-brand-500 hover:bg-brand-500/10 transition-colors"
                title="Alterar Senha"
               >
                 <KeyRound size={20} />
               </button>

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
        {activeRole === UserRole.LIBRARY && <LibraryDashboard />}
      </main>

      {/* MODAL DE ALTERAÇÃO DE SENHA */}
      {showPasswordModal && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
              <div className="bg-[#18181b] border border-gray-800 w-full max-w-md rounded-2xl shadow-2xl p-6">
                  <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <KeyRound className="text-brand-500" size={20}/> Alterar Senha
                      </h3>
                      <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-white transition-colors">
                          <X size={20}/>
                      </button>
                  </div>
                  
                  <form onSubmit={handleChangePassword} className="space-y-4">
                      {passwordError && (
                          <div className="bg-red-900/20 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm flex items-start gap-2">
                              <AlertCircle size={16} className="mt-0.5 shrink-0"/>
                              <span>{passwordError}</span>
                          </div>
                      )}
                      
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nova Senha</label>
                          <input 
                              type="password" 
                              className="w-full bg-black/30 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
                              placeholder="Mínimo 6 caracteres"
                              value={newPassword}
                              onChange={e => setNewPassword(e.target.value)}
                              required
                          />
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirmar Nova Senha</label>
                          <input 
                              type="password" 
                              className="w-full bg-black/30 border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
                              placeholder="Repita a senha"
                              value={confirmPassword}
                              onChange={e => setConfirmPassword(e.target.value)}
                              required
                          />
                      </div>

                      <div className="pt-4 flex justify-end gap-3">
                          <Button type="button" variant="outline" onClick={() => setShowPasswordModal(false)} className="border-gray-700 text-gray-400 hover:bg-white/5 hover:text-white">
                              Cancelar
                          </Button>
                          <Button type="submit" isLoading={isChangingPassword} className="shadow-lg shadow-brand-900/20">
                              <Save size={16} className="mr-2"/> Salvar Nova Senha
                          </Button>
                      </div>
                  </form>
              </div>
          </div>
      )}
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
