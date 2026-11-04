import React, { useState } from 'react';
import { X, User, Check, Shield, Wrench, Zap, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { UserAccount } from '../types';
import { storageService } from '../services/storageService';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onProfileUpdated: (updatedUser: UserAccount) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated
}) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [username, setUsername] = useState(currentUser.username);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen || (currentUser.role !== 'CDI' && currentUser.role !== 'DESENVOLVEDOR')) return null;

  const getRoleIcon = () => {
    switch (currentUser.role) {
      case 'CDI':
      case 'DESENVOLVEDOR':
        return <Shield className="w-5 h-5 text-amber-400" />;
      case 'MECANICA':
      case 'MANUTENCAO':
        return <Wrench className="w-5 h-5 text-amber-400" />;
      case 'ELETRICA':
        return <Zap className="w-5 h-5 text-amber-400" />;
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!displayName.trim()) {
      setError('O nome do perfil não pode ficar em branco.');
      return;
    }

    if (!username.trim()) {
      setError('O identificador de login não pode ficar em branco.');
      return;
    }

    if (changePasswordOpen && newPassword) {
      if (newPassword.length < 4) {
        setError('A nova senha deve ter no mínimo 4 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('A confirmação de senha não confere com a nova senha digitada.');
        return;
      }
      storageService.updateUserPassword(currentUser.id, newPassword);
    }

    const oldName = currentUser.displayName;
    const updated = storageService.updateUserProfile(currentUser.id, {
      displayName: displayName.trim(),
      username: username.trim().toUpperCase()
    });

    if (updated) {
      storageService.addLog(
        updated.username,
        updated.role,
        'Alteração de Dados do Perfil',
        `Nome do perfil alterado de "${oldName}" para "${updated.displayName}".`
      );

      setSuccess('Perfil atualizado com sucesso!');
      onProfileUpdated(updated);
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
              {getRoleIcon()}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Editar Nome do Perfil
              </h3>
              <p className="text-xs text-slate-400">
                Personalize a identificação do seu perfil no sistema
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-lg text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* Role Pill */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-400">Perfil de Acesso:</span>
            <span className="font-mono font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {currentUser.role}
            </span>
          </div>

          {/* Display Name Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Nome de Exibição do Perfil *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex: Equipe de Manutenção Mecânica, Wellington Galvão..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Este nome aparecerá nas saudações, relatórios e fichas técnicas consultadas.
            </p>
          </div>

          {/* Username Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Identificador de Login (Usuário)
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex: MANUTENCAO"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 uppercase focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Optional Password Change Toggle */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setChangePasswordOpen(!changePasswordOpen)}
              className="flex items-center gap-1.5 text-xs text-amber-400/90 hover:text-amber-300 transition"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{changePasswordOpen ? 'Ocultar alteração de senha' : 'Deseja alterar a senha deste perfil também?'}</span>
            </button>

            {changePasswordOpen && (
              <div className="mt-3 space-y-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite a nova senha"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-lg transition shadow active:scale-[0.98]"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
