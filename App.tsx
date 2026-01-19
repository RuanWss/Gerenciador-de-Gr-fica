
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { PrintShopDashboard } from './pages/PrintShopDashboard';
import { PublicSchedule } from './pages/PublicSchedule';
import { ClassroomFiles } from './pages/ClassroomFiles';
import { AttendanceTerminal } from './pages/AttendanceTerminal';
import { StaffAttendanceTerminal } from './pages/StaffAttendanceTerminal';
import { HRDashboard } from './pages/HRDashboard';
import { LibraryDashboard } from './pages/LibraryDashboard';
import { AEEDashboard } from './pages/AEEDashboard';
import { InfantilDashboard } from './pages/InfantilDashboard';
import { UserRole } from './types';
import { LogOut, LayoutGrid, Heart, BookOpen, Baby, GraduationCap, Printer, Users } from 'lucide-react';

const AppContent = () => {
    const { user, isAuthenticated, logout, loading } = useAuth();
    const [sessionRole, setSessionRole] = useState(null);
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

    if (loading) return null;

    if (currentPath === '/horarios' || currentHash === '#horarios') return <PublicSchedule />;
    if (currentPath === '/materiais' || currentHash === '#materiais') return <ClassroomFiles />;
    
    if (!isAuthenticated) return <Login />;

    // Terminais específicos
    if (user?.role === UserRole.ATTENDANCE_TERMINAL) return <AttendanceTerminal />;
    if (user?.role === UserRole.STAFF_TERMINAL) return <StaffAttendanceTerminal />;

    const activeRole = sessionRole || user?.role;

    // Seletor de Perfil
    if (user?.roles && user.roles.length > 1 && !sessionRole) {
        return (
            <div className="fixed inset-0 bg-[#0f0f10] flex flex-col items-center justify-center p-6">
                <div className="max-w-5xl w-full text-center">
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-24 mx-auto mb-10 drop-shadow-2xl" alt="Logo"/>
                    <h2 className="text-3xl font-black text-white mb-12 uppercase tracking-tighter">Escolha o seu Ambiente</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {user.roles.includes(UserRole.TEACHER) && (
                            <button onClick={() => setSessionRole(UserRole.TEACHER)} className="group bg-[#18181b] border border-white/10 p-8 rounded-[2.5rem] hover:bg-red-600 transition-all shadow-2xl flex flex-col items-center justify-center gap-4 h-48">
                                <GraduationCap size={40} className="text-gray-500 group-hover:text-white transition-colors"/>
                                <span className="font-black uppercase text-xs text-white tracking-widest">Professor</span>
                            </button>
                        )}
                        {user.roles.includes(UserRole.PRINTSHOP) && (
                            <button onClick={() => setSessionRole(UserRole.PRINTSHOP)} className="group bg-[#18181b] border border-white/10 p-8 rounded-[2.5rem] hover:bg-blue-600 transition-all shadow-2xl flex flex-col items-center justify-center gap-4 h-48">
                                <Printer size={40} className="text-gray-500 group-hover:text-white transition-colors"/>
                                <span className="font-black uppercase text-xs text-white tracking-widest">Escola / Cópias</span>
                            </button>
                        )}
                        {user.roles.includes(UserRole.HR) && (
                            <button onClick={() => setSessionRole(UserRole.HR)} className="group bg-[#18181b] border border-white/10 p-8 rounded-[2.5rem] hover:bg-green-600 transition-all shadow-2xl flex flex-col items-center justify-center gap-4 h-48">
                                <Users size={40} className="text-gray-500 group-hover:text-white transition-colors"/>
                                <span className="font-black uppercase text-xs text-white tracking-widest">RH</span>
                            </button>
                        )}
                        {user.roles.includes(UserRole.AEE) && (
                            <button onClick={() => setSessionRole(UserRole.AEE)} className="group bg-[#18181b] border border-white/10 p-8 rounded-[2.5rem] hover:bg-purple-600 transition-all shadow-2xl flex flex-col items-center justify-center gap-4 h-48">
                                <Heart size={40} className="text-gray-500 group-hover:text-white transition-colors"/>
                                <span className="font-black uppercase text-xs text-white tracking-widest">AEE / Inclusão</span>
                            </button>
                        )}
                        {user.roles.includes(UserRole.LIBRARY) && (
                            <button onClick={() => setSessionRole(UserRole.LIBRARY)} className="group bg-[#18181b] border border-white/10 p-8 rounded-[2.5rem] hover:bg-yellow-600 transition-all shadow-2xl flex flex-col items-center justify-center gap-4 h-48">
                                <BookOpen size={40} className="text-gray-500 group-hover:text-white transition-colors"/>
                                <span className="font-black uppercase text-xs text-white tracking-widest">Biblioteca</span>
                            </button>
                        )}
                        {user.roles.includes(UserRole.KINDERGARTEN) && (
                            <button onClick={() => setSessionRole(UserRole.KINDERGARTEN)} className="group bg-[#18181b] border border-white/10 p-8 rounded-[2.5rem] hover:bg-orange-600 transition-all shadow-2xl flex flex-col items-center justify-center gap-4 h-48">
                                <Baby size={40} className="text-gray-500 group-hover:text-white transition-colors"/>
                                <span className="font-black uppercase text-xs text-white tracking-widest">Infantil</span>
                            </button>
                        )}
                    </div>
                    <button onClick={logout} className="mt-16 text-gray-500 hover:text-white font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 mx-auto">
                        <LogOut size={16}/> Encerrar Sessão
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <nav className="h-20 bg-black/40 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-8 sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <img src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" className="h-10 w-auto" alt="Logo"/>
                    <div className="h-6 w-px bg-white/10"></div>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">
                        {activeRole === UserRole.PRINTSHOP ? 'Painel Administrativo' : 
                         activeRole === UserRole.TEACHER ? 'Portal do Professor' : 
                         activeRole === UserRole.AEE ? 'Atendimento Educacional Especializado' :
                         activeRole === UserRole.HR ? 'Recursos Humanos' :
                         activeRole === UserRole.LIBRARY ? 'Biblioteca' :
                         activeRole === UserRole.KINDERGARTEN ? 'Portal Infantil' : 'Sistema CEMAL'}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    {user?.roles && user.roles.length > 1 && (
                        <button onClick={() => setSessionRole(null)} className="p-3 text-gray-400 hover:text-white transition-all bg-white/5 rounded-xl border border-white/5" title="Trocar Perfil">
                            <LayoutGrid size={20}/>
                        </button>
                    )}
                    <button onClick={logout} className="p-3 text-red-500/50 hover:text-red-500 transition-all bg-white/5 rounded-xl border border-white/5" title="Sair">
                        <LogOut size={20}/>
                    </button>
                </div>
            </nav>
            <main className="p-8">
                {activeRole === UserRole.TEACHER && <TeacherDashboard />}
                {activeRole === UserRole.PRINTSHOP && <PrintShopDashboard />}
                {activeRole === UserRole.HR && <HRDashboard />}
                {activeRole === UserRole.LIBRARY && <LibraryDashboard />}
                {activeRole === UserRole.AEE && <AEEDashboard />}
                {activeRole === UserRole.KINDERGARTEN && <InfantilDashboard />}
            </main>
        </div>
    );
};

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}
