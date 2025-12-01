import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('prof@escola.com');
  const [password, setPassword] = useState('123');
  const { login } = useAuth();
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, password)) {
      setError('');
    } else {
      setError('Credenciais inválidas. Verifique e-mail e senha.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-black/60 backdrop-blur-md p-10 rounded-xl shadow-2xl border border-white/10">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center mb-6">
             <img 
               src="https://i.ibb.co/kgxf99k5/LOGOS-10-ANOS-BRANCA-E-VERMELHA.png" 
               alt="Logo SchoolPrint" 
               className="h-32 w-auto object-contain drop-shadow-lg"
             />
          </div>
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
                className="appearance-none rounded-t-md relative block w-full px-3 py-3 border border-gray-600 bg-gray-900/50 placeholder-gray-400 text-white focus:outline-none focus:ring-brand-500 focus:border-brand-500 focus:z-10 sm:text-sm"
                placeholder="Endereço de Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
                <label htmlFor="password" className="sr-only">Senha</label>
                <input 
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="appearance-none rounded-b-md relative block w-full px-3 py-3 border border-gray-600 bg-gray-900/50 placeholder-gray-400 text-white focus:outline-none focus:ring-brand-500 focus:border-brand-500 focus:z-10 sm:text-sm"
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>
          </div>

          {error && (
            <div className="text-red-300 text-sm text-center bg-red-900/30 border border-red-800 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-center text-xs text-gray-400 mb-4">
             <span className="cursor-pointer hover:text-white hover:underline transition-colors" onClick={() => {setEmail('prof@escola.com'); setPassword('123');}}>Sou Professor</span>
             <span>|</span>
             <span className="cursor-pointer hover:text-white hover:underline transition-colors" onClick={() => {setEmail('grafica@escola.com'); setPassword('123');}}>Sou Gráfica</span>
          </div>

          <div>
            <Button type="submit" className="w-full h-12 text-lg font-bold tracking-wide shadow-lg shadow-brand-900/50">
              Entrar no Sistema
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};