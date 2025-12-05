import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { listenToSystemConfig } from '../services/firebaseService';
import { SystemConfig } from '../types';
import { Megaphone, CalendarClock, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
    const unsubscribe = listenToSystemConfig((config) => {
        setSysConfig(config);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const success = await login(email, password);
    if (!success) {
      setError('Credenciais inválidas. Verifique e-mail e senha.');
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
    <div className="min-h-screen flex flex-col bg-transparent relative">
      
      {/* Schedule Button */}
      <a 
        href="/#horarios"
        className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full transition-all text-sm font-medium shadow-lg"
      >
        <CalendarClock size={18} />
        <span className="hidden sm:inline">Quadro de Horários</span>
      </a>

      {/* System Banner */}
      {sysConfig?.isBannerActive && sysConfig.bannerMessage && (
          <div className={`w-full p-3 flex items-center justify-center gap-3 shadow-lg z-40 ${getBannerStyles(sysConfig.bannerType)}`}>
              <Megaphone size={20} className="shrink-0 animate-pulse" />
              <p className="font-bold text-sm md:text-base text-center shadow-black drop-shadow-sm">
                  AVISO: {sysConfig.bannerMessage}
              </p>
          </div>
      )}

      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-black/60 backdrop-blur-md p-10 rounded-xl shadow-2xl border border-white/10">
            <div className="text-center">
            <div className="mx-auto flex items-center justify-center mb-6">
                <img 
                src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" 
                alt="Logo CEMAL EQUIPE" 
                className="h-32 w-auto object-contain drop-shadow-lg"
                />
            </div>
            <h2 className="text-2xl font-bold text-white">Bem-vindo</h2>
            <p className="mt-2 text-sm text-gray-300">
                Acesse para enviar provas ou gerenciar impressões.
            </p>
            </div>
            <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="rounded-md shadow-sm -space-y-px">
                <div>
                <label htmlFor="email-address" className="sr-only">Email</label>
                <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="appearance-none rounded-t-md relative block w-full px-3 py-3 border border-gray-300 bg-white placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 focus:z-10 sm:text-sm"
                    placeholder="Endereço de Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                </div>
                <div className="relative">
                    <label htmlFor="password" className="sr-only">Senha</label>
                    <input 
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        className="appearance-none rounded-b-md relative block w-full px-3 py-3 border border-gray-300 bg-white placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 focus:z-10 sm:text-sm pr-10"
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center z-20 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
            </div>

            {error && (
                <div className="text-red-200 text-sm text-center bg-red-900/50 border border-red-500/50 p-2 rounded">
                {error}
                </div>
            )}

            <div>
                <Button type="submit" isLoading={isLoading} className="w-full h-12 text-lg font-bold tracking-wide shadow-lg shadow-brand-900/40 hover:shadow-brand-900/60 transform transition-all hover:-translate-y-0.5">
                Entrar no Sistema
                </Button>
            </div>
            </form>
        </div>
      </div>
    </div>
  );
};