
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
import { InfantilDashboard } from './pages/InfantilDashboard';
import { UserRole, SystemConfig } from './types';
import { listenToSystemConfig } from './services/firebaseService';
import { LogOut, LayoutGrid, KeyRound, X, Save, AlertCircle, Book, GraduationCap, School, Heart, UserCircle2, Megaphone, Baby } from 'lucide-react';
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
  
  // SELEÇÃO DE PERFIL (Para usuários com múltiplas funções)
  if (user?.roles && user.roles.length > 1 && !sessionRole) {
      return (
          <div className="fixed inset-0 z-50 bg-[#0f0f10] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/40 via-[#0f0f10] to-[#0f0f10] flex flex-col items-center justify-center p-4">
              <div className="max-w-5xl w-full">
                  <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
                      <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-24 w-auto mx-auto mb-6 drop-shadow-2xl"/>
                      <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tight">Bem-vindo, {user.name.split(' ')[0]}</h2>
                      <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em]">Ambiente Integrado de Gestão Escolar</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-8 max-w-6xl mx-auto mb-16">
                      {/* ACESSO EXCLUSIVO PORTAL INFANTIL POR E-MAIL */}
                      {user.email === 'jessicasouza465@gmail.com' && user.roles.includes(UserRole.KINDERGARTEN) && (
                          <button onClick={() => setSessionRole(UserRole.KINDERGARTEN)} className="bg-white/5 backdrop-blur-xl min-w-[280px] p-12 rounded-[3.5rem] shadow-2xl flex flex-col items-center hover:scale-105 transition-all group border-2 border-orange-500/20 hover:border-orange-500 hover:bg-white/10">
                              <div className="h-24 w-24 bg-orange-600/20 text-orange-500 rounded-[2rem] flex items-center justify-center mb-6 group-hover:bg-orange-600 group-hover:text-white transition-all shadow-2xl shadow-orange-900/20">
                                <Baby size={48} />
                              </div>
                              <span className="font-black text-white uppercase tracking-widest text-sm">Portal Infantil</span>
                              <p className="text-[9px] text-gray-500 font-bold mt-2 uppercase tracking-widest">Nível: Ed. Infantil</p>
                          </button>
                      )}
                      {user.roles.includes(UserRole.TEACHER) && (
                          <button onClick={() => setSessionRole(UserRole.TEACHER)} className="bg-white/5 backdrop-blur-xl min-w-[280px] p-12 rounded-[3.5rem] shadow-2xl flex flex-col items-center hover:scale-105 transition-all group border-2 border-red-500/20 hover:border-red-500 hover:bg-white/10">
                              <div className="h-24 w-24 bg-red-600/20 text-red-500 rounded-[2rem] flex items-center justify-center mb-6 group-hover:bg-red-600 group-hover:text-white transition-all shadow-2xl shadow-red-900/20">
                                <GraduationCap size={48} />
                              </div>
                              <span className="font-black text-white uppercase tracking-widest text-sm">Portal Professor</span>
                              <p className="text-[9px] text-gray-500 font-bold mt-2 uppercase tracking-widest">Ensino Fundamental e Médio</p>
                          </button>
                      )}
                      {user.roles.includes(UserRole.PRINTSHOP) && (
                          <button onClick={() => setSessionRole(UserRole.PRINTSHOP)} className="bg-white/5 backdrop-blur-xl min-w-[280px] p-12 rounded-[3.5rem] shadow-2xl flex flex-col items-center hover:scale-105 transition-all group border-2 border-blue-500/20 hover:border-blue-500 hover:bg-white/10">
                              <div className="h-24 w-24 bg-blue-600/20 text-blue-500 rounded-[2rem] flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xl shadow-blue-900/20">
                                <School size={48} />
                              </div>
                              <span className="font-black text-white uppercase tracking-widest text-sm">Painel da Escola</span>
                              <p className="text-[9px] text-gray-500 font-bold mt-2 uppercase tracking-widest">Gestão Administrativa</p>
                          </button>
                      )}
                      {user.roles.includes(UserRole.AEE) && (
                          <button onClick={() => setSessionRole(UserRole.AEE)} className="bg-white/5 backdrop-blur-xl min-w-[280px] p-12 rounded-[3.5rem] shadow-2xl flex flex-col items-center hover:scale-105 transition-all group border-2 border-pink-500/20 hover:border-pink-500 hover:bg-white/10">
                              <div className="h-24 w-24 bg-pink-600/20 text-pink-500 rounded-[2rem] flex items-center justify-center mb-6 group-hover:bg-pink-600 group-hover:text-white transition-all shadow-2xl shadow-pink-900/20">
                                <Heart size={48} />
                              </div>
                              <span className="font-black text-white uppercase tracking-widest text-sm">Portal AEE</span>
                          </button>
                      )}
                      {user.roles.includes(UserRole.HR) && (
                          <button onClick={() => setSessionRole(UserRole.HR)} className="bg-white/5 backdrop-blur-xl min-w-[280px] p-12 rounded-[3.5rem] shadow-2xl flex flex-col items-center hover:scale-105 transition-all group border-2 border-orange-500/20 hover:border-orange-500 hover:bg-white/10">
                              <div className="h-24 w-24 bg-orange-600/20 text-orange-500 rounded-[2rem] flex items-center justify-center mb-6 group-hover:bg-orange-600 group-hover:text-white transition-all shadow-2xl shadow-orange-900/20">
                                <AlertCircle size={48} />
                              </div>
                              <span className="font-black text-white uppercase tracking-tight text-sm">Gestão de RH</span>
                          </button>
                      )}
                      {user.roles.includes(UserRole.LIBRARY) && (
                          <button onClick={() => setSessionRole(UserRole.LIBRARY)} className="bg-white/5 backdrop-blur-xl min-w-[280px] p-12 rounded-[3.5rem] shadow-2xl flex flex-col items-center hover:scale-105 transition-all group border-2 border-green-500/20 hover:border-green-500 hover:bg-white/10">
                              <div className="h-24 w-24 bg-green-600/20 text-green-500 rounded-[2rem] flex items-center justify-center mb-6 group-hover:bg-green-600 group-hover:text-white transition-all shadow-2xl shadow-green-900/20">
                                <Book size={48} />
                              </div>
                              <span className="font-black text-white uppercase tracking-tight text-sm">Biblioteca</span>
                          </button>
                      )}
                  </div>
                  <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                      <button onClick={logout} className="inline-flex items-center gap-3 px-10 py-4 bg-white/5 hover:bg-red-600/20 text-gray-400 hover:text-red-500 rounded-full border border-white/10 transition-all font-black uppercase tracking-widest text-[10px]">
                        <UserCircle2 size={18}/> Sair do Sistema
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

      <nav className={`bg-black/40 backdrop-blur-xl shadow-lg border-b border-white/5 sticky z-50 transition-all duration-300 ${sysConfig?.isBannerActive && sysConfig.bannerMessage ? 'top-[48px]' : 'top-0'}`}>
        <div className="w-full mx-auto px-8 flex justify-between h-20 items-center">
            <div className="flex items-center gap-6">
              <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-12 w-auto drop-shadow-lg"/>
              <div className="h-8 w-px bg-white/10"></div>
              <span className="text-xs font-black text-white uppercase tracking-widest">
                {activeRole === UserRole.KINDERGARTEN ? 'Portal Infantil' : activeRole === UserRole.TEACHER ? 'Portal do Professor' : activeRole === UserRole.HR ? 'Gestão de RH' : activeRole === UserRole.LIBRARY ? 'Painel da Biblioteca' : activeRole === UserRole.AEE ? 'Portal AEE' : 'Painel da Escola'}
              </span>
            </div>
            <div className="flex items-center gap-2">
               {user?.roles && user.roles.length > 1 && (
                   <button onClick={() => setSessionRole(null)} className="p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all" title="Trocar de Ambiente">
                       <LayoutGrid size={22}/>
                   </button>
               )}
               <button onClick={() => setShowPasswordModal(true)} className="p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all" title="Segurança"><KeyRound size={20}/></button>
               <button onClick={logout} className="p-3 text-red-500/50 hover:text-red-500 hover:bg-red-500/5 rounded-2xl transition-all" title="Encerrar Sessão"><LogOut size={20}/></button>
            </div>
        </div>
      </nav>
      <main className="w-full px-8 py-10">
        {activeRole === UserRole.KINDERGARTEN && user?.email === 'jessicasouza465@gmail.com' && <InfantilDashboard />}
        {activeRole === UserRole.TEACHER && <TeacherDashboard />}
        {activeRole === UserRole.PRINTSHOP && <PrintShopDashboard />}
        {activeRole === UserRole.HR && <HRDashboard />}
        {activeRole === UserRole.LIBRARY && <LibraryDashboard />}
        {activeRole === UserRole.AEE && <AEEDashboard />}
      </main>

      {showPasswordModal && (
          <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
              <div className="bg-[#18181b] border border-white/5 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-xl font-black text-white mb-8 uppercase tracking-widest">Segurança da Conta</h3>
                  <form onSubmit={handleChangePassword} className="space-y-6">
                      <input type="password" placeholder="Nova Senha" className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                      <input type="password" placeholder="Confirmar" className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-bold outline-none focus:border-red-600" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                      {passwordError && <p className="text-red-500 text-[10px] font-black uppercase text-center">{passwordError}</p>}
                      <div className="flex justify-end gap-3 pt-4"><Button type="submit" className="w-full h-16 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-900/40">Salvar Nova Senha</Button></div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

function App() { return ( <AuthProvider> <AppContent /> </AuthProvider> ); }
export default App;
