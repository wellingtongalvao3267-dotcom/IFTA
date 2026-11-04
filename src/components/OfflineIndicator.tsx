import React from 'react';
import { WifiOff, ShieldCheck } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  onOpenManager?: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ onOpenManager }) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div 
      onClick={onOpenManager}
      className={`fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-500/95 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-slate-950 shadow-2xl border border-amber-400 animate-in fade-in slide-in-from-bottom-2 ${
        onOpenManager ? 'cursor-pointer hover:bg-amber-400 transition' : ''
      }`}
      title="Clique para gerenciar o banco de dados offline"
    >
      <WifiOff className="w-4 h-4 text-slate-950 animate-pulse" />
      <div className="flex flex-col">
        <span>Modo Offline Ativo</span>
        <span className="text-[10px] font-normal text-slate-900">
          Dados e máquinas disponíveis localmente · Clique para backup
        </span>
      </div>
    </div>
  );
};
