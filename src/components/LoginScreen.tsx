import React, { useState } from 'react';
import { Shield, Lock, User, KeyRound, Wrench, Zap, Terminal, AlertCircle } from 'lucide-react';
import { UserAccount, UserRole } from '../types';
import { storageService } from '../services/storageService';

interface LoginScreenProps {
  onLoginSuccess: (user: UserAccount) => void;
  onShowSplashAgain?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onShowSplashAgain }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('MECANICA');
  const [username, setUsername] = useState('MECANICA');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick preset selector
  const handleSelectPreset = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage('');
    setPassword('');
    if (role === 'CDI' || role === 'DESENVOLVEDOR') {
      setUsername('CDI');
    } else if (role === 'MECANICA' || (role as string) === 'MANUTENCAO') {
      setUsername('MECANICA');
    } else if (role === 'ELETRICA') {
      setUsername('ELETRICA');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    const users = storageService.getUsers();
    const cleanUsername = username.trim().toUpperCase();
    const cleanPassword = password.trim();

    // Find user by username
    const matchedUser = users.find(u => u.username.toUpperCase() === cleanUsername);

    if (!matchedUser) {
      setErrorMessage(`Usuário "${username}" não encontrado no sistema IFTA.`);
      setIsSubmitting(false);
      return;
    }

    if (matchedUser.passwordHash !== cleanPassword) {
      setErrorMessage('Senha incorreta para o perfil selecionado. Verifique as credenciais.');
      setIsSubmitting(false);
      return;
    }

    // Success! Update last login and write to system log
    matchedUser.lastLogin = new Date().toISOString();
    storageService.saveUsers(users);
    storageService.setCurrentUser(matchedUser);

    storageService.addLog(
      matchedUser.username,
      matchedUser.role,
      matchedUser.role === 'DESENVOLVEDOR' ? 'Autenticação Administrativa' : 'Autenticação no Sistema',
      `Login com sucesso via perfil ${matchedUser.role}`
    );

    onLoginSuccess(matchedUser);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative">
      {/* Background blueprint pattern */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-5 flex flex-col items-center">
          <div className="w-48 h-48 sm:w-60 sm:h-60 md:w-64 md:h-64 rounded-3xl border-2 border-amber-500/40 shadow-2xl shadow-indigo-900/40 mb-5 overflow-hidden flex items-center justify-center bg-slate-900">
            <img
              src="/assets/aistudio/logo_afta_c1e6655b.jpeg"
              alt="Logo IFTA - Bello Alimentos"
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            IFTA Informações Técnicas e Aplicação
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Autenticação segura de perfis operacionais e engenharia
          </p>
        </div>

        {/* Profile Selector Buttons */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-1 mb-4 grid grid-cols-3 gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => handleSelectPreset('MECANICA')}
            className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-lg text-xs font-medium transition-all ${
              selectedRole === 'MECANICA' || (selectedRole as string) === 'MANUTENCAO'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Wrench className="w-4 h-4 mb-1" />
            <span>Mecânica</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset('ELETRICA')}
            className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-lg text-xs font-medium transition-all ${
              selectedRole === 'ELETRICA'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Zap className="w-4 h-4 mb-1" />
            <span>Elétrica</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPreset('CDI')}
            className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-lg text-xs font-medium transition-all ${
              selectedRole === 'CDI' || selectedRole === 'DESENVOLVEDOR'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Shield className="w-4 h-4 mb-1" />
            <span className="font-bold">CDI</span>
          </button>
        </div>

        {/* Card Form */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-sm">
          <form onSubmit={handleLogin} className="space-y-4">
            {errorMessage && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-950/60 border border-red-800/80 text-red-200 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Usuário / Identificação
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nome do usuário"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold rounded-lg transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>Entrar no Sistema</span>
            </button>
          </form>

        </div>

        {/* Developer branding and splash revisit */}
        <div className="flex items-center justify-between text-xs text-slate-500 mt-4 px-1">
          <span>Desenvolvido por <strong>Wellington Galvão</strong></span>
          {onShowSplashAgain && (
            <button 
              onClick={onShowSplashAgain}
              className="text-amber-400/80 hover:text-amber-300 underline"
            >
              Ver Logo / Apresentação
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
