import React, { useState } from 'react';
import { 
  Users, 
  FileText, 
  ShieldCheck, 
  Sliders, 
  Download, 
  Trash2, 
  Plus, 
  Edit3, 
  Key, 
  Check, 
  Search,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowLeft
} from 'lucide-react';
import { ComponentItem, UserAccount, AccessLog, CategoryAccessRule, UserRole } from '../types';
import { storageService } from '../services/storageService';
import { INITIAL_CATEGORIES } from '../data/initialData';
import { TechnicalItemImage } from './TechnicalItemImage';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  components: ComponentItem[];
  onAddNewComponent: () => void;
  onEditComponent: (component: ComponentItem) => void;
  onDeleteComponent: (id: string) => void;
  onDataRefresh: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  components,
  onAddNewComponent,
  onEditComponent,
  onDeleteComponent,
  onDataRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'components' | 'users' | 'permissions' | 'logs'>('components');

  // Users state
  const [users, setUsers] = useState<UserAccount[]>(storageService.getUsers());
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [userUpdateSuccess, setUserUpdateSuccess] = useState<string | null>(null);

  // Category permissions state
  const [categoryRules, setCategoryRules] = useState<CategoryAccessRule[]>(storageService.getCategoryPermissions());
  const [permSaved, setPermSaved] = useState(false);

  // Logs state
  const [logs, setLogs] = useState<AccessLog[]>(storageService.getLogs());
  const [logSearch, setLogSearch] = useState('');
  const [compToDelete, setCompToDelete] = useState<ComponentItem | null>(null);

  if (!isOpen) return null;

  const handleStartEditUser = (u: UserAccount) => {
    setEditingUserId(u.id);
    setEditDisplayName(u.displayName);
    setEditUsername(u.username);
    setEditPassword('');
  };

  const handleSaveUser = (userId: string) => {
    if (!editDisplayName.trim()) return;
    
    storageService.updateUserProfile(userId, {
      displayName: editDisplayName.trim(),
      username: editUsername.trim().toUpperCase()
    });

    if (editPassword.trim()) {
      storageService.updateUserPassword(userId, editPassword.trim());
    }

    setUsers(storageService.getUsers());
    setUserUpdateSuccess(`Perfil "${editDisplayName.trim()}" atualizado com sucesso!`);
    setEditingUserId(null);
    setEditPassword('');
    setTimeout(() => setUserUpdateSuccess(null), 3000);
    storageService.addLog(
      'DESENVOLVEDOR', 
      'DESENVOLVEDOR', 
      'Edição de Perfil de Usuário', 
      `Nome do perfil e credenciais atualizados para: ${editDisplayName.trim()}`
    );
    onDataRefresh();
  };

  // Toggle category permission for a role
  const handleToggleCatPerm = (cat: string, role: UserRole) => {
    const updated = categoryRules.map(rule => {
      if (rule.category === cat) {
        const hasRole = rule.allowedRoles.includes(role);
        const newRoles = hasRole
          ? rule.allowedRoles.filter(r => r !== role)
          : [...rule.allowedRoles, role];
        return { ...rule, allowedRoles: newRoles };
      }
      return rule;
    });

    // If category wasn't in rules yet
    if (!updated.some(r => r.category === cat)) {
      updated.push({
        category: cat,
        allowedRoles: ['DESENVOLVEDOR', role]
      });
    }

    setCategoryRules(updated);
    storageService.saveCategoryPermissions(updated);
    setPermSaved(true);
    setTimeout(() => setPermSaved(false), 2000);
    onDataRefresh();
  };

  // Export CSV
  const handleExportCSV = () => {
    const csvContent = storageService.exportLogsCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ifta_logs_acesso_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    storageService.addLog('DESENVOLVEDOR', 'DESENVOLVEDOR', 'Exportação de Logs', 'Relatório CSV de auditoria baixado.');
  };

  // Clear logs
  const handleClearLogs = () => {
    if (confirm('Deseja realmente limpar todos os logs de acesso gravados?')) {
      storageService.clearLogs();
      setLogs([]);
      storageService.addLog('DESENVOLVEDOR', 'DESENVOLVEDOR', 'Limpeza de Logs', 'Histórico de auditoria reiniciado.');
    }
  };

  // Reset to factory data
  const handleResetFactory = () => {
    if (confirm('Atenção: Isso restaurará todos os dados originais (peças, usuários padrão e permissões). Deseja prosseguir?')) {
      storageService.resetAllData();
      setUsers(storageService.getUsers());
      setCategoryRules(storageService.getCategoryPermissions());
      setLogs(storageService.getLogs());
      onDataRefresh();
      alert('Dados restaurados para o padrão de fábrica.');
    }
  };

  const filteredLogs = logs.filter(l => 
    l.username.toLowerCase().includes(logSearch.toLowerCase()) ||
    l.action.toLowerCase().includes(logSearch.toLowerCase()) ||
    (l.details && l.details.toLowerCase().includes(logSearch.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl my-auto">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              title="Voltar ao catálogo"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 hover:border-amber-500/50 text-slate-200 hover:text-white text-xs font-bold transition shadow-sm cursor-pointer group"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-400 group-hover:-translate-x-0.5 transition-transform" />
              <span>Voltar</span>
            </button>
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Painel de Gestão e Documentação do CDI
              </h2>
              <p className="text-xs text-slate-400">
                Gestão pública com senha para cadastro, edição de peças e máquinas, contas e auditoria
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900 overflow-x-auto gap-4 text-xs font-medium shrink-0">
          <button
            onClick={() => setActiveTab('components')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'components'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Peças & Banco de Dados ({components.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Gestão de Usuários</span>
          </button>

          <button
            onClick={() => setActiveTab('permissions')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'permissions'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Permissões por Usuário</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'logs'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Logs de Acesso do Sistema ({logs.length})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: Components Management */}
          {activeTab === 'components' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-slate-400">
                  Gerencie todas as peças, motores, sensores, esquemas e documentações cadastradas.
                </p>
                <button
                  onClick={onAddNewComponent}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition shadow self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Nova Peça / Componente</span>
                </button>
              </div>

              {/* Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Código / Tag</th>
                      <th className="px-4 py-3 font-semibold">Nome da Peça</th>
                      <th className="px-4 py-3 font-semibold">Categoria</th>
                      <th className="px-4 py-3 font-semibold">Fabricante / Modelo</th>
                      <th className="px-4 py-3 font-semibold">Acesso Permitido</th>
                      <th className="px-4 py-3 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {components.map((comp) => (
                      <tr key={comp.id} className="hover:bg-slate-900/40 transition">
                        <td className="px-4 py-3 font-mono text-amber-400 font-semibold whitespace-nowrap">
                          {comp.tagCode}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-200">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded border border-slate-800 overflow-hidden shrink-0 bg-slate-900 shadow-sm">
                              <TechnicalItemImage
                                src={comp.imageUrl}
                                alt={comp.name}
                                category={comp.category}
                                tagCode={comp.tagCode}
                                aspectRatio="square"
                                showBlueprintToggle={false}
                                allowZoom={false}
                              />
                            </div>
                            <span className="line-clamp-1">{comp.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                          {comp.category}
                        </td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                          {comp.manufacturer}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                            {comp.visibleToRoles.map((role) => (
                              <span key={role} className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                                {role === 'DESENVOLVEDOR' ? 'DEV' : role}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => onEditComponent(comp)}
                            title="Editar Peça"
                            className="p-1.5 text-slate-400 hover:text-amber-300 rounded hover:bg-slate-800 transition mr-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCompToDelete(comp)}
                            title="Excluir Peça"
                            className="p-1.5 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Users Management */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {userUpdateSuccess && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-lg text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{userUpdateSuccess}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-xs text-slate-400">
                  Gerencie o nome do perfil, identificador de acesso e senhas dos 3 perfis do sistema IFTA.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {users.map((u) => (
                  <div key={u.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-amber-400">
                          {u.username}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">
                          Perfil: {u.role}
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-white mb-1">
                        {u.displayName}
                      </h4>

                      <p className="text-xs text-slate-400 mb-3">
                        Último acesso: <span className="font-mono text-slate-300">{u.lastLogin || 'Sem registro'}</span>
                      </p>

                      <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800/80 mb-3 font-mono text-xs text-slate-400 flex items-center justify-between">
                        <span>Senha:</span>
                        <span className="text-amber-300">••••••••</span>
                      </div>
                    </div>

                    <div>
                      {editingUserId === u.id ? (
                        <div className="space-y-2.5 pt-2 border-t border-slate-800">
                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                              Nome do Perfil / Exibição:
                            </label>
                            <input
                              type="text"
                              value={editDisplayName}
                              onChange={(e) => setEditDisplayName(e.target.value)}
                              placeholder="Nome do perfil..."
                              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                              Login / Usuário:
                            </label>
                            <input
                              type="text"
                              value={editUsername}
                              onChange={(e) => setEditUsername(e.target.value)}
                              placeholder="Identificador de login..."
                              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 font-mono uppercase"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                              Nova Senha (opcional):
                            </label>
                            <input
                              type="text"
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                              placeholder="Deixe em branco para manter"
                              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 font-mono"
                            />
                          </div>

                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleSaveUser(u.id)}
                              className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded transition"
                            >
                              Salvar Dados
                            </button>
                            <button
                              onClick={() => setEditingUserId(null)}
                              className="px-2.5 py-1.5 bg-slate-800 text-slate-300 text-xs rounded hover:bg-slate-700"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEditUser(u)}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 rounded text-xs font-medium transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar Nome e Senha do Perfil</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Category Permissions for MECANICA and ELETRICA */}
          {activeTab === 'permissions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    Matriz de Liberação de Bancos de Dados por Categoria
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Selecione quais categorias de peças os perfis <strong>MECANICA</strong> e <strong>ELETRICA</strong> podem consultar. O perfil <strong>CDI</strong> possui acesso irrestrito para cadastrar e editar tudo.
                  </p>
                </div>
                {permSaved && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Permissões salvas!
                  </span>
                )}
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Categoria / Banco</th>
                      <th className="px-4 py-3 font-semibold text-center">MECANICA (bello2026)</th>
                      <th className="px-4 py-3 font-semibold text-center">ELETRICA (bello0099)</th>
                      <th className="px-4 py-3 font-semibold text-center">CDI (Público c/ Senha)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {INITIAL_CATEGORIES.map((cat) => {
                      const rule = categoryRules.find(r => r.category === cat);
                      const hasMec = rule ? (rule.allowedRoles.includes('MECANICA') || rule.allowedRoles.includes('MANUTENCAO')) : false;
                      const hasElet = rule ? rule.allowedRoles.includes('ELETRICA') : false;

                      return (
                        <tr key={cat} className="hover:bg-slate-900/40 transition">
                          <td className="px-4 py-3 font-semibold text-slate-200">
                            {cat}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={hasMec}
                              onChange={() => handleToggleCatPerm(cat, 'MECANICA')}
                              className="w-4 h-4 text-amber-500 rounded bg-slate-900 border-slate-700 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={hasElet}
                              onChange={() => handleToggleCatPerm(cat, 'ELETRICA')}
                              className="w-4 h-4 text-amber-500 rounded bg-slate-900 border-slate-700 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-emerald-400 font-mono text-xs font-semibold">
                              Acesso Total
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: System Access Logs */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="Filtrar logs por usuário ou ação..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg border border-slate-700 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar CSV</span>
                  </button>
                  <button
                    onClick={handleClearLogs}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/60 hover:bg-red-900/60 text-red-300 text-xs rounded-lg border border-red-800/80 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar Logs</span>
                  </button>
                </div>
              </div>

              {/* Logs Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[10px] sticky top-0 font-sans">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Data / Hora</th>
                      <th className="px-4 py-2.5 font-semibold">Usuário</th>
                      <th className="px-4 py-2.5 font-semibold">Perfil</th>
                      <th className="px-4 py-2.5 font-semibold">Ação Executada</th>
                      <th className="px-4 py-2.5 font-semibold">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/40 transition">
                        <td className="px-4 py-2.5 text-slate-400 tabular-nums whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="px-4 py-2.5 text-amber-300 font-bold whitespace-nowrap">
                          {log.username}
                        </td>
                        <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">
                          {log.role}
                        </td>
                        <td className="px-4 py-2.5 text-slate-200 font-medium">
                          {log.action}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 font-sans">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500 font-sans">
                          Nenhum log encontrado para o critério selecionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Backup / Restore notice */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Sistema IFTA · Versão Técnica 2026</span>
            <button
              onClick={handleResetFactory}
              className="flex items-center gap-1 text-slate-500 hover:text-red-400 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Dados Originais de Fábrica</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal for AdminPanel */}
      {compToDelete && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white">
                  Excluir Peça: {compToDelete.name}?
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Tem certeza que deseja excluir a peça com código <strong className="text-white font-mono">{compToDelete.tagCode}</strong> ({compToDelete.category})? Esta ação removerá a peça de forma permanente do sistema.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCompToDelete(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = compToDelete.id;
                  setCompToDelete(null);
                  onDeleteComponent(id);
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Excluir Peça</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
