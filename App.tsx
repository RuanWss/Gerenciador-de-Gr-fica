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
import { LogOut, LayoutGrid, KeyRound, GraduationCap, School, Heart, Megaphone, UserCircle2 } from 'lucide-react';
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
          alert("Senha alterada com sucesso!");
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
  
  if (user?.roles && user.roles.length > 1 && !sessionRole) {
      return (
          <div className="fixed inset-0 z-50 bg-[#0f0f10] flex flex-col items-center justify-center p-4">
              <div className="max-w-5xl w-full text-center">
                  <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-24 mx-auto mb-12"/>
                  <h2 className="text-4xl font-bold text-white mb-12 uppercase tracking-tight">Qual ambiente deseja acessar?</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mb-12">
                      {user.roles.includes(UserRole.TEACHER) && (
                          <button onClick={() => setSessionRole(UserRole.TEACHER)} className="bg-white p-10 rounded-[2.5rem] flex flex-col items-center hover:scale-105 transition-all group border-4 border-transparent hover:border-red-600 shadow-2xl">
                              <GraduationCap size={64} className="text-red-600 mb-4" />
                              <span className="font-black text-gray-800 uppercase text-xs tracking-widest">Portal do Professor</span>
                          </button>
                      )}
                      {user.roles.includes(UserRole.PRINTSHOP) && (
                          <button onClick={() => setSessionRole(UserRole.PRINTSHOP)} className="bg-white p-10 rounded-[2.5rem] flex flex-col items-center hover:scale-105 transition-all group border-4 border-transparent hover:border-blue-600 shadow-2xl">
                              <School size={64} className="text-blue-600 mb-4" />
                              <span className="font-black text-gray-800 uppercase text-xs tracking-widest">Gráfica e Gestão</span>
                          </button>
                      )}
                      {user.roles.includes(UserRole.AEE) && (
                          <button onClick={() => setSessionRole(UserRole.AEE)} className="bg-white p-10 rounded-[2.5rem] flex flex-col items-center hover:scale-105 transition-all group border-4 border-transparent hover:border-pink-600 shadow-2xl">
                              <Heart size={64} className="text-pink-600 mb-4" />
                              <span className="font-black text-gray-800 uppercase text-xs tracking-widest">Portal AEE</span>
                          </button>
                      )}
                  </div>
                  <button onClick={logout} className="text-gray-500 hover:text-white flex items-center gap-2 mx-auto uppercase text-[10px] font-black tracking-widest transition-colors"><UserCircle2 size={16}/> Sair do Sistema</button>
              </div>
          </div>
      );
  }

  const activeRole = sessionRole || user?.role;

  return (
    <div className="h-screen flex flex-col bg-[#0f0f10] text-gray-100 font-sans overflow-hidden">
      {sysConfig?.isBannerActive && sysConfig.bannerMessage && (
        <div className={`w-full py-2 px-4 flex items-center justify-center gap-3 sticky top-0 z-[100] ${getBannerStyles(sysConfig.bannerType)}`}>
            <Megaphone size={16} className="shrink-0 animate-pulse" />
            <p className="font-black text-xs uppercase tracking-tight">{sysConfig.bannerMessage}</p>
        </div>
      )}

      <nav className="bg-black/40 backdrop-blur-md border-b border-white/10 shrink-0">
        <div className="w-full mx-auto px-6 flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-10 w-auto"/>
              <div className="h-6 w-px bg-white/10 hidden md:block"></div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hidden md:block">
                SISTEMA EQUIPE CEMAL
              </span>
            </div>
            <div className="flex items-center gap-4">
               {user?.roles && user.roles.length > 1 && (
                   <button onClick={() => setSessionRole(null)} className="p-2 text-gray-400 hover:text-white transition-colors"><LayoutGrid size={20}/></button>
               )}
               <button onClick={() => setShowPasswordModal(true)} className="p-2 text-gray-400 hover:text-white transition-colors"><KeyRound size={20}/></button>
               <button onClick={logout} className="p-2 text-gray-400 hover:text-red-400 transition-colors"><LogOut size={20}/></button>
            </div>
        </div>
      </nav>

      <main className="flex-1 relative overflow-hidden">
        {activeRole === UserRole.TEACHER && <TeacherDashboard />}
        {activeRole === UserRole.PRINTSHOP && <PrintShopDashboard />}
        {activeRole === UserRole.HR && <HRDashboard />}
        {activeRole === UserRole.LIBRARY && <LibraryDashboard />}
        {activeRole === UserRole.AEE && <AEEDashboard />}
      </main>

      {showPasswordModal && (
          <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[#18181b] border border-gray-800 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl">
                  <h3 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">Segurança</h3>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                      <input type="password" placeholder="Nova Senha" className="w-full bg-black/30 border border-gray-700 rounded-xl p-4 text-white focus:border-red-600 outline-none" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                      <input type="password" placeholder="Confirmar Senha" className="w-full bg-black/30 border border-gray-700 rounded-xl p-4 text-white focus:border-red-600 outline-none" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                      <Button type="submit" isLoading={isChangingPassword} className="w-full h-14 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-900/20">Salvar Nova Senha</Button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

function App() { return ( <AuthProvider> <AppContent /> </AuthProvider> ); }
export default App;