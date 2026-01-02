
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
import { UserRole, SystemConfig } from './types';
import { listenToSystemConfig } from './services/firebaseService';
import { LogOut, LayoutGrid, KeyRound, X, Save, AlertCircle, Book, GraduationCap, School, Heart, UserCircle2, Megaphone } from 'lucide-react';
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
  const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
    const handleLocationChange = () => {
        setCurrentPath(window.location.pathname);
        setCurrentHash(window.location.hash);
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    const unsubConfig = listenToSystemConfig(setSysConfig);
    return () => {
        window.removeEventListener('popstate', handleLocationChange);
        window.removeEventListener('hashchange', handleLocationChange);
        unsubConfig();
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
  
  const getBannerStyles = (type: string) => {
    switch(type) {
        case 'warning': return 'bg-yellow-500 text-yellow-950';
        case 'error': return 'bg-red-600 text-white';
        case 'success': return 'bg-green-600 text-white';
        default: return 'bg-blue-600 text-white';
    }
  };

  if (currentPath === '/horarios' || currentHash === '#horarios') return <PublicSchedule />;
  if (currentPath === '/materiais' || currentHash === '#materiais') return <ClassroomFiles />;
  if (!isAuthenticated) return <Login />;
  if (user?.role === UserRole.ATTENDANCE_TERMINAL) return <AttendanceTerminal />;
  if (user?.role === UserRole.STAFF_TERMINAL) return <StaffAttendanceTerminal />;
  if (user?.role === UserRole.CLASSROOM) return <ClassroomFiles />;
  
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
                              <span className="font-black text-gray-800 uppercase tracking-tight text-lg">Painel da Escola</span>
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
                      <button onClick={logout} className="inline-flex items-center gap-3 px-8 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full border border-white/10 transition-all font-bold uppercase tracking-widest text-xs">
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
      {sysConfig?.isBannerActive && sysConfig.bannerMessage && (
        <div className={`w-full py-3 px-4 flex items-center justify-center gap-3 shadow-md sticky top-0 z-[100] overflow-hidden ${getBannerStyles(sysConfig.bannerType)}`}>
            <div className="absolute inset-0 bg-white/10 animate-[pulse_2s_infinite]"></div>
            <Megaphone size={18} className="shrink-0 relative z-10" />
            <p className="font-black text-sm md:text-base text-center relative z-10 uppercase tracking-tight shadow-sm">
                AVISO: {sysConfig.bannerMessage}
            </p>
        </div>
      )}

      <nav className={`bg-black/30 backdrop-blur-md shadow-lg border-b border-white/10 sticky z-50 transition-all duration-300 ${sysConfig?.isBannerActive && sysConfig.bannerMessage ? 'top-[48px]' : 'top-0'}`}>
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-20">
            <div className="flex items-center gap-4">
              <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-14 w-auto"/>
              <span className="text-lg font-bold text-gray-200">
                {activeRole === UserRole.TEACHER ? 'Portal do Professor' : activeRole === UserRole.HR ? 'Gestão de RH' : activeRole === UserRole.LIBRARY ? 'Painel da Biblioteca' : activeRole === UserRole.AEE ? 'Portal AEE' : 'Painel da Escola'}
              </span>
            </div>
            <div className="flex items-center gap-4">
               {user?.roles && user.roles.length > 1 && (
                   <button onClick={() => setSessionRole(null)} className="p-2 text-gray-400 hover:text-brand-500 transition-colors" title="Alternar Perfil">
                       <LayoutGrid size={22}/>
                   </button>
               )}
               <button onClick={() => setShowPasswordModal(true)} className="p-2 text-gray-400 hover:text-brand-500" title="Alterar Senha"><KeyRound size={20}/></button>
               <button onClick={logout} className="p-2 text-gray-400 hover:text-red-400" title="Sair"><LogOut size={20}/></button>
            </div>
        </div>
      </nav>
      {/* Ajustado de max-w-7xl para w-full para evitar esconder as abas laterais */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {activeRole === UserRole.TEACHER && <TeacherDashboard />}
        {activeRole === UserRole.PRINTSHOP && <PrintShopDashboard />}
        {activeRole === UserRole.HR && <HRDashboard />}
        {activeRole === UserRole.LIBRARY && <LibraryDashboard />}
        {activeRole === UserRole.AEE && <AEEDashboard />}
      </main>

      {showPasswordModal && (
          <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#18181b] border border-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
                  <h3 className="text-xl font-bold text-white mb-6">Alterar Senha</h3>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                      <input type="password" placeholder="Nova Senha" className="w-full bg-black/30 border border-gray-700 rounded-lg p-2.5 text-white outline-none focus:border-red-500" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                      <input type="password" placeholder="Confirmar" className="w-full bg-black/30 border border-gray-700 rounded-lg p-2.5 text-white outline-none focus:border-red-500" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                      <div className="flex justify-end gap-3 pt-2"><Button type="submit">Salvar Nova Senha</Button></div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

function App() { return ( <AuthProvider> <AppContent /> </AuthProvider> ); }
export default App;
