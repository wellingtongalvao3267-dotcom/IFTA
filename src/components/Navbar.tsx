import React from 'react';
import { Search, QrCode, LogOut, Settings, X, HardDrive, RefreshCw } from 'lucide-react';
import { UserAccount } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  currentUser: UserAccount;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenQrScanner: () => void;
  onOpenAdminPanel?: () => void;
  onOpenEditProfile?: () => void;
  onOpenOfflineManager?: () => void;
  onLogout: () => void;
  isAdminOpen?: boolean;
  isRealtimeConnected?: boolean;
  onManualSync?: () => void;
  isSyncing?: boolean;
  onBack?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  searchQuery,
  onSearchChange,
  onOpenQrScanner,
  onOpenAdminPanel,
  onOpenOfflineManager,
  onLogout,
  isAdminOpen,
  isRealtimeConnected = true,
  onManualSync,
  isSyncing = false
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 md:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col gap-2.5">
        
        {/* Linha 1 (Superior): Logo Ampliada + Barra de Busca + Escanear QR e Sair */}
        <div className="flex items-center justify-between gap-3 md:gap-6">
          
          {/* Logo Ampliada e Nome da Marca */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border-2 border-amber-500/60 shadow-lg shadow-amber-500/20 bg-slate-950 flex items-center justify-center shrink-0">
              <img
                src="/assets/aistudio/logo_afta_c1e6655b.jpeg"
                alt="IFTA"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-base sm:text-lg md:text-2xl font-black tracking-tight text-white whitespace-nowrap leading-tight">
                IFTA
              </span>
              <span className="hidden sm:inline text-[10px] md:text-xs text-amber-400 uppercase tracking-wider font-mono font-bold">
                Informações Técnicas & Aplicação
              </span>
            </div>
          </div>

          {/* Search Bar Zone (Lupa no topo do app para pesquisas) */}
          <div className="flex-1 max-w-xl relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Pesquisar código (ex: MOT-IND), nome, fabricante, categoria ou máquina..."
              className="w-full pl-9 pr-8 py-1.5 md:py-2 bg-slate-950/80 border border-slate-700/80 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg text-xs md:text-sm text-slate-100 placeholder-slate-500 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Canto superior direito: Opção para escanear QR Code */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenQrScanner}
              title="Escanear QR Code da Peça"
              className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3.5 md:py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-[0.97] rounded-lg transition shadow-md shadow-amber-500/20 whitespace-nowrap cursor-pointer ring-1 ring-amber-300/50"
            >
              <QrCode className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline font-bold">Escanear QR</span>
            </button>
          </div>
        </div>

        {/* Linha 2 (Segunda Linha): 4 botões alinhados e centralizados */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 pt-1 border-t border-slate-800/60 overflow-x-auto">
          {/* 1. Offline */}
          {onOpenOfflineManager && (
            <button
              type="button"
              onClick={onOpenOfflineManager}
              title="Baixar Informações & Modo Offline"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 active:scale-[0.97] rounded-lg border border-slate-700 transition whitespace-nowrap cursor-pointer shrink-0"
            >
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>Offline / Backup</span>
            </button>
          )}

          {/* Botão de Instalação PWA */}
          <PWAInstallButton variant="navbar" />

          {/* 2. Admin Panel Toggle (Painel CDI) */}
          {(currentUser.role === 'CDI' || currentUser.role === 'DESENVOLVEDOR') && onOpenAdminPanel && (
            <button
              onClick={onOpenAdminPanel}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition whitespace-nowrap shrink-0 ${
                isAdminOpen
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span>Painel CDI</span>
            </button>
          )}

          {/* 3. Sincronização em Tempo Real com o Banco */}
          {onManualSync && (
            <button
              type="button"
              onClick={onManualSync}
              disabled={isSyncing}
              title={isRealtimeConnected ? "Sincronizar com o banco central. Canal em tempo real ativo." : "Canal offline/reconectando. Clique para sincronizar agora."}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 active:scale-[0.97] transition cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : isRealtimeConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className="hidden sm:inline font-mono text-[11px]">
                {isSyncing ? 'Sincronizando...' : isRealtimeConnected ? 'Banco Ativo' : 'Sincronizar'}
              </span>
            </button>
          )}

          {/* 4. Sair do Sistema (descido do canto superior direito para a segunda linha) */}
          <button
            onClick={onLogout}
            title="Sair do Sistema"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/40 text-xs font-semibold text-slate-300 hover:text-red-400 active:scale-[0.97] transition cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
};
