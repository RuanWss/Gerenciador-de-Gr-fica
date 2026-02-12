import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { listenToSystemConfig } from '../services/firebaseService';
import { SystemConfig } from '../types';
import { Megaphone, Eye, EyeOff, FolderOpen, ShieldCheck, GraduationCap } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isStudentMode, setIsStudentMode] = useState(false);
  const [studentCode, setStudentCode] = useState('');
  
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
    const unsubscribe = listenToSystemConfig(
      (config) => {
        setSysConfig(config);
      },
      (error) => {
        if (error.code !== 'permission-denied') {
            console.warn("System config listener error:", error);
        }
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    let loginEmail = email;
    let loginPass = password;

    if (isStudentMode) {
        // Formata o código do aluno para o formato de email interno
        loginEmail = `${studentCode.toUpperCase().trim()}@aluno.cemal`;
        loginPass = password.toUpperCase().trim();
    }
    
    const success = await login(loginEmail, loginPass);
    if (!success) {
      setError(isStudentMode ? 'Acesso negado. Verifique seu código e senha.' : 'Credenciais inválidas. Verifique e-mail e senha.');
    }
    setIsLoading(false);
  };

  const getBannerStyles = (type: string) => {
    switch(type) {
        case 'warning': return 'bg-yellow-500/90 text-yellow-50';
        case 'error': return 'bg-red-600/90 text-white';
        case 'success': return 'bg-green-600/90 text-white';
        default: return 'bg-blue-600/90 text-white';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent relative items-center justify-center overflow-hidden">
      
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black via-red-950/20 to-black pointer-events-none" />
      
      {/* Classroom Files Button */}
      <a 
        href="/#materiais"
        className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full transition-all text-sm font-medium shadow-lg"
      >
        <FolderOpen size={18} />
        <span className="hidden sm:inline">Arquivos da Turma</span>
      </a>

      {/* System Banner */}
      {sysConfig?.isBannerActive && sysConfig.bannerMessage && (
          <div className={`w-full p-3 flex items-center justify-center gap-3 shadow-lg z-40 fixed top-0 ${getBannerStyles(sysConfig.bannerType)}`}>
              <Megaphone size={20} className="shrink-0 animate-pulse" />
              <p className="font-bold text-sm md:text-base text-center shadow-black drop-shadow-sm">
                  AVISO: {sysConfig.bannerMessage}
              </p>
          </div>
      )}

      <div className="w-full max-w-md space-y-8 bg-black/60 backdrop-blur-md p-10 rounded-2xl shadow-2xl border border-white/10 relative z-10 transition-all duration-500">
            <div className="text-center">
            <div className="mx-auto flex items-center justify-center mb-6">
                <img 
                src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" 
                alt="CEMAL EQUIPE" 
                className="h-28 w-auto object-contain drop-shadow-lg"
                />
            </div>
            
            {/* Mode Toggle */}
            <div className="flex bg-black/40 p-1 rounded-2xl border border-white/10 mb-8 w-full max-w-xs mx-auto">
                <button 
                    type="button" 
                    onClick={() => { setIsStudentMode(false); setError(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isStudentMode ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                    <ShieldCheck size={14}/> Equipe
                </button>
                <button 
                    type="button" 
                    onClick={() => { setIsStudentMode(true); setError(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isStudentMode ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                    <GraduationCap size={14}/> Aluno
                </button>
            </div>

            <h2 className="text-2xl font-bold text-white tracking-tight">{isStudentMode ? 'Portal do Aluno' : 'Acesso Restrito'}</h2>
            <p className="mt-2 text-sm text-gray-400">
                {isStudentMode ? 'Insira suas credenciais de acesso' : 'Painel de gestão escolar'}
            </p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
                {isStudentMode ? (
                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Login (Código)</label>
                        <input
                            type="text"
                            required
                            maxLength={6}
                            className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white font-mono text-center text-xl tracking-[0.5em] uppercase outline-none focus:border-blue-600 transition-all placeholder-gray-700"
                            placeholder="ABC123"
                            value={studentCode}
                            onChange={(e) => setStudentCode(e.target.value)}
                        />
                    </div>
                ) : (
                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">E-mail Corporativo</label>
                        <input
                            type="email"
                            autoComplete="email"
                            required
                            className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white font-medium outline-none focus:border-red-600 transition-all text-sm"
                            placeholder="seu.nome@escola.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                )}
                
                <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest ml-1">Senha</label>
                    <div className="relative">
                        <input 
                            type={showPassword ? "text" : "password"}
                            required
                            className={`w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white font-medium outline-none transition-all text-sm pr-12 ${isStudentMode ? 'focus:border-blue-600 font-mono tracking-widest uppercase' : 'focus:border-red-600'}`}
                            placeholder={isStudentMode ? "CÓDIGO" : "••••••••"}
                            maxLength={isStudentMode ? 6 : undefined}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center z-20 text-gray-500 hover:text-white transition-colors"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className={`text-sm text-center p-3 rounded-xl border ${isStudentMode ? 'bg-blue-900/20 border-blue-500/30 text-blue-200' : 'bg-red-900/20 border-red-500/30 text-red-200'}`}>
                    {error}
                </div>
            )}

            <div>
                <Button type="submit" isLoading={isLoading} className={`w-full h-14 text-sm font-black uppercase tracking-widest shadow-lg transform transition-all hover:-translate-y-0.5 rounded-2xl ${isStudentMode ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/40' : 'bg-red-600 hover:bg-red-700 shadow-red-900/40'}`}>
                    {isStudentMode ? 'Acessar Portal' : 'Entrar no Sistema'}
                </Button>
            </div>
            </form>
        </div>
    </div>
  );
};