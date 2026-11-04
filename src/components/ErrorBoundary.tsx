import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[IFTA ERROR BOUNDARY] Erro não tratado capturado:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetSession = () => {
    try {
      sessionStorage.clear();
      // Keep vault intact but clear temporary UI state
    } catch {}
    window.location.reload();
  };

  private handleHardReset = () => {
    if (window.confirm('Deseja restaurar as configurações padrão do catálogo técnico local? Seus itens salvos no cofre do servidor não serão perdidos.')) {
      try {
        sessionStorage.clear();
        localStorage.removeItem('ifta_components_v1');
        localStorage.removeItem('ifta_machines_v1');
      } catch {}
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 selection:bg-amber-500/20">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
            
            {/* Header Icon */}
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
              <AlertTriangle className="w-8 h-8" />
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
              {this.props.fallbackTitle || 'Recuperação do Sistema IFTA'}
            </h2>
            
            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              O aplicativo detectou um formato de dados inconsistente ao renderizar a tela. Seus dados cadastrados permanecem salvos com segurança no cofre.
            </p>

            {/* Technical Detail Collapsible / Quiet Box */}
            {this.state.error && (
              <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 mb-6 text-left overflow-x-auto">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block font-semibold mb-1">
                  Detalhes Técnicos:
                </span>
                <p className="font-mono text-xs text-amber-300 break-words">
                  {this.state.error.name}: {this.state.error.message}
                </p>
              </div>
            )}

            {/* Recovery Actions */}
            <div className="w-full flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recarregar Aplicativo</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetSession}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-amber-400" />
                <span>Trocar Perfil / Login</span>
              </button>
            </div>

            {/* Quiet fallback link */}
            <button
              type="button"
              onClick={this.handleHardReset}
              className="mt-5 text-[11px] text-slate-500 hover:text-slate-400 underline underline-offset-2 transition cursor-pointer"
            >
              Restaurar integridade dos dados locais
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
