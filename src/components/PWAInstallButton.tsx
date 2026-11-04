import React, { useState } from 'react';
import { Download, Smartphone, X, Check, HelpCircle } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'navbar' | 'modal' | 'prominent';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'navbar'
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running in standalone mode (already installed), no need to prompt
  if (isInstalled) {
    if (variant === 'modal') {
      return (
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Aplicativo já instalado no dispositivo (Modo PWA Ativo)</span>
        </div>
      );
    }
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'navbar') {
      return (
        <button
          type="button"
          onClick={install}
          title="Instalar IFTA no seu dispositivo para acesso offline"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-sm cursor-pointer ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Instalar App</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={install}
        className={`flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition shadow cursor-pointer ${className}`}
      >
        <Smartphone className="w-4 h-4" />
        <span>Instalar Aplicativo no Dispositivo (PWA)</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          <span>Instalar no iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Instalar no iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
                <p>Para usar o aplicativo 100% offline no iOS Safari:</p>
                <ol className="list-decimal pl-4 space-y-2">
                  <li>Toque no botão de <strong>Compartilhar</strong> (ícone do quadrado com a seta para cima) na barra do Safari.</li>
                  <li>Role as opções para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.</li>
                  <li>Toque em <strong>"Adicionar"</strong> no canto superior direito.</li>
                </ol>
                <p className="text-[11px] text-amber-400">
                  O IFTA ficará disponível como um app nativo na tela do seu telefone, pronto para uso mesmo sem internet!
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // If browser doesn't trigger prompt yet, provide manual hint on modal
  if (variant === 'modal') {
    return (
      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Instalação no Dispositivo:</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          Você pode instalar o IFTA clicando no ícone de instalação na barra de endereço do navegador (Chrome/Edge) ou no menu de opções do celular "Adicionar à tela inicial".
        </p>
      </div>
    );
  }

  return null;
};
