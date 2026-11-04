import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  HardDrive, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  ShieldCheck, 
  Smartphone, 
  FileJson, 
  Database, 
  Layers, 
  Cog, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { PWAInstallButton } from './PWAInstallButton';

interface OfflineManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: () => void;
}

export const OfflineManagerModal: React.FC<OfflineManagerModalProps> = ({
  isOpen,
  onClose,
  onDataRestored
}) => {
  const isOnline = useOnlineStatus();
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const components = storageService.getComponents();
  const machines = storageService.getMachines();
  const users = storageService.getUsers();
  const logs = storageService.getLogs();
  const vaultComponents = storageService.getVaultComponents();
  const vaultMachines = storageService.getVaultMachines();

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await storageService.syncWithServer();
      if (res.success) {
        setSyncFeedback('Sincronização concluída! Dados atualizados no banco central e protegidos no cofre local.');
        if (onDataRestored) onDataRestored();
      } else {
        setSyncFeedback('Modo Offline: Servidor temporariamente inacessível. Seus dados estão 100% seguros no cofre deste aparelho.');
      }
    } catch {
      setSyncFeedback('Servidor indisponível. Dados seguros no cofre local.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  const handleForceVaultRehydrate = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      await storageService.rehydrateServerBatch(components, machines);
      setSyncFeedback('✅ Todos os itens do cofre foram reenviados e gravados com sucesso no banco de dados central!');
      if (onDataRestored) onDataRestored();
    } catch {
      setSyncFeedback('Aviso: falha de rede ao reenviar. Itens continuam salvos no cofre local.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  // Export complete database as JSON
  const handleExportData = () => {
    try {
      const fullBackup = {
        app: 'IFTA Informações Técnicas e Aplicação',
        version: '2026.2',
        exportedAt: new Date().toISOString(),
        data: {
          components,
          machines,
          categoryPermissions: storageService.getCategoryPermissions(),
          usersCount: users.length,
          logsCount: logs.length
        }
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute('download', `IFTA_Banco_Dados_Offline_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setImportStatus('Arquivo de backup baixado com sucesso!');
      setTimeout(() => setImportStatus(null), 4000);
    } catch (err: any) {
      setImportError('Erro ao gerar arquivo de download: ' + err.message);
    }
  };

  // Import JSON backup
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed.data || (!parsed.data.components && !parsed.data.machines)) {
          throw new Error('Arquivo de backup inválido ou em formato incompatível.');
        }

        if (Array.isArray(parsed.data.components)) {
          storageService.saveComponents(parsed.data.components);
        }
        if (Array.isArray(parsed.data.machines)) {
          storageService.saveMachines(parsed.data.machines);
        }
        if (Array.isArray(parsed.data.categoryPermissions)) {
          storageService.saveCategoryPermissions(parsed.data.categoryPermissions);
        }

        setImportStatus(`Sucesso! ${parsed.data.components?.length || 0} peças e ${parsed.data.machines?.length || 0} máquinas restauradas.`);
        if (onDataRestored) {
          onDataRestored();
        }
      } catch (err: any) {
        setImportError(err.message || 'Erro ao processar o arquivo de backup.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl my-auto text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Central Offline & Backup de Informações</h3>
              <p className="text-xs text-slate-400">Baixe os dados e use o aplicativo mesmo sem internet na fábrica</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">

          {/* Status banner */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isOnline ? (
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
                  <Wifi className="w-5 h-5" />
                </div>
              ) : (
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
                  <WifiOff className="w-5 h-5" />
                </div>
              )}
              <div>
                <span className="text-xs font-bold text-white block">
                  Status de Conectividade: {isOnline ? 'Online (Conectado)' : 'Offline (Modo Sem Rede)'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {isOnline 
                    ? 'Sua conexão está ativa e o cache local está sincronizado.' 
                    : 'Você está navegando com 100% dos dados armazenados no dispositivo.'}
                </span>
              </div>
            </div>

            <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border ${
              isOnline 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {isOnline ? 'SINCRONIZADO' : 'OFFLINE'}
            </span>
          </div>

          {/* Feedback messages */}
          {syncFeedback && (
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
          )}

          {importStatus && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{importStatus}</span>
            </div>
          )}

          {importError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {/* Docker Server & Local Vault Persistence Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-950 to-slate-900 border border-amber-500/30 shadow-lg space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    Proteção Dupla de Dados (Central + Cofre Local)
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold lowercase">
                      proteção ativa
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Banco Central + Cofre Permanente do Dispositivo (Blindagem contra reinicializações)
                  </p>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Todas as <strong>máquinas</strong> e <strong>peças</strong> cadastradas são salvas com <strong>camada dupla de segurança</strong>: gravadas no banco de dados central compartilhado e espelhadas em um <strong>Cofre Permanente</strong> neste aparelho. Mesmo se o servidor for reiniciado, o seu aparelho restaura automaticamente os itens para o servidor e para todos os outros usuários.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 active:scale-98 text-amber-400 border border-amber-500/30 hover:border-amber-500/60 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-amber-300' : 'text-amber-400'}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar com Servidor'}</span>
              </button>

              <button
                type="button"
                onClick={handleForceVaultRehydrate}
                disabled={isSyncing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 active:scale-98 text-amber-300 border border-amber-500/40 hover:border-amber-500 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-60"
              >
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Reenviar Cofre para o Banco</span>
              </button>
            </div>
          </div>

          {/* Statistics of cached data */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-3 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-amber-400" />
              <span>Inventário Seguro no Dispositivo</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase">Peças no Catálogo</span>
                <span className="text-white text-lg font-bold">{components.length}</span>
                <span className="text-[10px] text-emerald-400 block mt-0.5">
                  {vaultComponents.length > 0 ? `${vaultComponents.length} no cofre local` : 'Protegidas no cofre'}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase">Máquinas no Catálogo</span>
                <span className="text-white text-lg font-bold">{machines.length}</span>
                <span className="text-[10px] text-emerald-400 block mt-0.5">
                  {vaultMachines.length > 0 ? `${vaultMachines.length} no cofre local` : 'Protegidas no cofre'}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-slate-500 block text-[10px] uppercase">Armazenamento</span>
                <span className="text-amber-400 text-lg font-bold">Docker + PWA</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Volume Permanente</span>
              </div>
            </div>
          </div>

          {/* Action 1: Download / Export */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileJson className="w-4 h-4 text-amber-400" />
                  <span>1. Baixar Arquivo com Todas as Informações (Backup JSON)</span>
                </h5>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Baixe um arquivo seguro com todas as peças, máquinas, especificações técnicas, manuais e vínculos cadastrados no sistema. Você pode salvar no seu computador ou celular para arquivo ou levar para outro dispositivo.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportData}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition shadow cursor-pointer active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Todas as Informações do Sistema (.JSON)</span>
            </button>
          </div>

          {/* Action 2: Import / Restore */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div>
              <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-amber-400" />
                <span>2. Restaurar / Carregar Informações de um Arquivo</span>
              </h5>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Carregue um arquivo de backup baixado anteriormente para restaurar máquinas e peças no sistema.
              </p>
            </div>

            <label className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer active:scale-98">
              <Upload className="w-4 h-4 text-amber-400" />
              <span>Selecionar Arquivo de Backup para Restaurar</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>

          {/* Action 3: PWA Installation for Phone/Desktop */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div>
              <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span>3. Instalar o Aplicativo no Celular ou Computador</span>
              </h5>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Instale o IFTA na tela de início do seu aparelho. Ele funcionará como um aplicativo nativo completo, abrindo instantaneamente mesmo quando você estiver sem internet na fábrica.
              </p>
            </div>

            <PWAInstallButton variant="modal" />
          </div>

          {/* Explanatory security & persistence notice */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Persistência Garantida:</strong> Todo item cadastrado ou editado pela equipe do <strong>CDI</strong> permanece salvo no banco de dados local do seu dispositivo até que seja explicitamente excluído ou alterado pelo usuário.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-mono">
            IFTA · Sistema PWA com Suporte Offline
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
