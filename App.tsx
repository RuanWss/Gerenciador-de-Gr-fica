
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
import { AEEDashboard } from './pages/AEEDashboard';
import { UserRole } from './types';
import { LogOut, LayoutGrid, KeyRound, X, Save, AlertCircle, Book, GraduationCap, School, Heart, UserCircle2 } from 'lucide-react';
import { Button } from './components/Button';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, logout, changePassword } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  const [sessionRole, setSessionRole] = useState<UserRole | null>(null);
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

  useEffect(() => { if (!isAuthenticated) setSessionRole(null); }, [isAuthenticated]);

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setPasswordError('');
      if (newPassword.length < 6) return setPasswordError("Mínimo 6 caracteres.");
      if (newPassword !== confirmPassword) return setPasswordError("Senhas não coincidem.");
      setIsChangingPassword(true);
      try {
          await changePassword(newPassword);
          alert("Senha alterada!");
          setShowPasswordModal(false);
      } catch (error: any) { setPasswordError("Erro: " + error.message); } finally { setIsChangingPassword(false); }
  };
  
  if (currentPath === '/horarios' || currentHash === '#horarios') return <PublicSchedule />;
  if (currentPath === '/materiais' || currentHash === '#materiais') return <ClassroomFiles />;
  if (!isAuthenticated) return <Login />;

  // Terminais de uso específico (Sem barra de navegação padrão)
  if (user?.role === UserRole.ATTENDANCE_TERMINAL) return <AttendanceTerminal />;
  if (user?.role === UserRole.STAFF_TERMINAL) return <StaffAttendanceTerminal />;
  if (user?.role === UserRole.CLASSROOM) return <ClassroomFiles />;
  
  // Seletor de Perfil para usuários com múltiplas roles
  if (user?.roles && user.roles.length > 1 && !sessionRole) {
      return (
          <div className="fixed inset-0 z-50 bg-[#0f0f10] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/40 via-[#0f0f10] to-[#0f0f10] flex flex-col items-center justify-center p-4">
              <div className="max-w-5xl w-full">
                  <div className="text-center mb-12">
                      <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-24 w-auto mx-auto mb-6"/>
                      <h2 className="text-4xl font-bold text-white mb-2 uppercase tracking-tight">Bem-vindo, {user.name.split(' ')[0]}</h2>
                      <p className="text-gray-400">Selecione o painel que deseja acessar agora:</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-8 max-w-6xl mx-auto mb-16">
                      {user.roles.includes(UserRole.TEACHER) && (
                          <button onClick={() => setSessionRole(UserRole.TEACHER)} className="bg-white min-w-[280px] p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center hover:scale-105 transition-all group border-4 border-transparent hover:border-red-600">
                              <div className="h-24 w-24 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-6 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                <GraduationCap size={48} />
                              </div>
                              <span className="font-black text-gray-800 uppercase tracking-tight text-lg">Portal do Professor</span>
                          </button>
                      )}
                      {user.roles.includes(UserRole.PRINTSHOP) && (
                          <button onClick={() => setSessionRole(UserRole.PRINTSHOP)} className="bg-white min-w-[280px] p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center hover:scale-105 transition-all group border-4 border-transparent hover:border-blue-600">
                              <div className="h-24 w-24 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <School size={48} />
                              </div>
                              <span className="font-black text-gray-800 uppercase tracking-tight text-lg">Painel da Gráfica</span>
                          </button>
                      )}
                      {user.roles.includes(UserRole.AEE) && (
                          <button onClick={() => setSessionRole(UserRole.AEE)} className="bg-white min-w-[280px] p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center hover:scale-105 transition-all group border-4 border-transparent hover:border-pink-600">
                              <div className="h-24 w-24 bg-pink-50 text-pink-600 rounded-3xl flex items-center justify-center mb-6 group-hover:bg-pink-600 group-hover:text-white transition-colors">
                                <Heart size={48} />
                              </div>
                              <span className="font-black text-gray-800 uppercase tracking-tight text-lg">Portal AEE</span>
                          </button>
                      )}
                      {user.roles.includes(UserRole.HR) && (
                          <button onClick={() => setSessionRole(UserRole.HR)} className="bg-white min-w-[280px] p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center hover:scale-105 transition-all group border-4 border-transparent hover:border-orange-600">
                              <div className="h-24 w-24 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center mb-6 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                <AlertCircle size={48} />
                              </div>
                              <span className="font-black text-gray-800 uppercase tracking-tight text-lg">Gestão de RH</span>
                          </button>
                      )}
                      {user.roles.includes(UserRole.LIBRARY) && (
                          <button onClick={() => setSessionRole(UserRole.LIBRARY)} className="bg-white min-w-[280px] p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center hover:scale-105 transition-all group border-4 border-transparent hover:border-green-600">
                              <div className="h-24 w-24 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mb-6 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                <Book size={48} />
                              </div>
                              <span className="font-black text-gray-800 uppercase tracking-tight text-lg">Biblioteca</span>
                          </button>
                      )}
                  </div>

                  <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                      <button 
                        onClick={logout}
                        className="inline-flex items-center gap-3 px-8 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full border border-white/10 transition-all font-bold uppercase tracking-widest text-xs"
                      >
                        <UserCircle2 size={18}/> Trocar de Usuário / Sair
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  const activeRole = sessionRole || user?.role;

  return (
    <div className="min-h-screen bg-transparent text-gray-100 font-sans">
      <nav className="bg-black/30 backdrop-blur-md shadow-lg border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-20">
            <div className="flex items-center gap-4">
              <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-14 w-auto"/>
              <span className="text-lg font-bold text-gray-200">
                {activeRole === UserRole.TEACHER ? 'Portal do Professor' : activeRole === UserRole.HR ? 'Gestão de RH' : activeRole === UserRole.LIBRARY ? 'Painel da Biblioteca' : activeRole === UserRole.AEE ? 'Portal AEE' : 'Painel da Escola'}
              </span>
            </div>
            <div className="flex items-center gap-4">
               {/* BOTÃO DE TROCA DE PAINEL - VISÍVEL APENAS PARA MULTI-PERFIL */}
               {user?.roles && user.roles.length > 1 && (
                   <button 
                     onClick={() => setSessionRole(null)} 
                     className="p-2 text-gray-400 hover:text-brand-500 transition-colors"
                     title="Alternar Perfil"
                   >
                       <LayoutGrid size={22}/>
                   </button>
               )}
               <button onClick={() => setShowPasswordModal(true)} className="p-2 text-gray-400 hover:text-brand-500" title="Alterar Senha"><KeyRound size={20}/></button>
               <button onClick={logout} className="p-2 text-gray-400 hover:text-red-400" title="Sair"><LogOut size={20}/></button>
            </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeRole === UserRole.TEACHER && <TeacherDashboard />}
        {activeRole === UserRole.PRINTSHOP && <PrintShopDashboard />}
        {activeRole === UserRole.HR && <HRDashboard />}
        {activeRole === UserRole.LIBRARY && <LibraryDashboard />}
        {activeRole === UserRole.AEE && <AEEDashboard />}
      </main>

      {showPasswordModal && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#18181b] border border-gray-800 w-full max-w-md rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-white mb-6">Alterar Senha</h3>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                      <input type="password" placeholder="Nova Senha" className="w-full bg-black/30 border border-gray-700 rounded-lg p-2.5 text-white" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                      <input type="password" placeholder="Confirmar" className="w-full bg-black/30 border border-gray-700 rounded-lg p-2.5 text-white" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                      <div className="flex justify-end gap-3"><Button type="submit">Salvar</Button></div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

function App() { return ( <AuthProvider> <AppContent /> </AuthProvider> ); }
export default App;
