import React, { useState } from 'react';
import {
  X,
  Cog,
  Wrench,
  Zap,
  Shield,
  Ruler,
  MapPin,
  Layers,
  ExternalLink,
  Edit3,
  Trash2,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight,
  ArrowLeft,
  FileText,
  Download,
  Eye,
  Upload
} from 'lucide-react';
import { MachineItem, ComponentItem, UserRole } from '../types';
import { TechnicalItemImage } from './TechnicalItemImage';
import { TechnicalQrCode } from './TechnicalQrCode';

interface MachineDetailModalProps {
  machine: MachineItem | null;
  onClose: () => void;
  allComponents: ComponentItem[];
  userRole: UserRole;
  onSelectComponent: (comp: ComponentItem, initialTab?: 'specs' | 'diagram' | 'maintenance' | 'failures' | 'manual' | 'qr') => void;
  onEditMachine?: (machine: MachineItem) => void;
  onDeleteMachine?: (machineId: string) => void;
}

export const MachineDetailModal: React.FC<MachineDetailModalProps> = ({
  machine,
  onClose,
  allComponents,
  userRole,
  onSelectComponent,
  onEditMachine,
  onDeleteMachine
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'diagram'>('overview');
  const [showQrModal, setShowQrModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!machine) return null;

  // Components visible for this user's profile (safe calculation)
  const links = machine.linkedComponents || [];
  const visibleLinked = links.filter(link => {
    if (userRole === 'CDI' || userRole === 'DESENVOLVEDOR') return true;
    if (!link.allowedRoles || link.allowedRoles.length === 0) return true;
    return (
      link.allowedRoles.includes(userRole) ||
      (userRole === 'MECANICA' && (link.allowedRoles.includes('MANUTENCAO') || link.allowedRoles.includes('MECANICA'))) ||
      (userRole === 'ELETRICA' && link.allowedRoles.includes('ELETRICA'))
    );
  });

  const hiddenCount = links.length - visibleLinked.length;

  const getRoleTheme = () => {
    if (userRole === 'MECANICA') {
      return {
        badge: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
        title: 'Área Técnica: Mecânica',
        icon: <Wrench className="w-4 h-4 text-sky-400" />,
        text: 'Você tem acesso aos itens mecânicos desta máquina (ex: rolamentos, mancais, fita transportadora e rolos) pré-definidos pelo desenvolvedor.'
      };
    }
    if (userRole === 'ELETRICA') {
      return {
        badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        title: 'Área Técnica: Elétrica & Automação',
        icon: <Zap className="w-4 h-4 text-amber-400" />,
        text: 'Você tem acesso aos itens elétricos desta máquina (ex: motor elétrico, inversor de frequência, sensores e disjuntores) pré-definidos pelo desenvolvedor.'
      };
    }
    return {
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      title: 'Controle Técnico: CDI',
      icon: <Shield className="w-4 h-4 text-emerald-400" />,
      text: 'Visualização irrestrita de todos os componentes vinculados e controle de permissões por perfil técnico.'
    };
  };

  const theme = getRoleTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6">

        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/90 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={onClose}
              title="Voltar ao catálogo"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 hover:border-amber-500/50 text-slate-200 hover:text-white text-xs font-bold transition shadow-sm cursor-pointer group mt-0.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-400 group-hover:-translate-x-0.5 transition-transform" />
              <span>Voltar</span>
            </button>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <Cog className="w-6 h-6 animate-spin-slow" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                  {machine.tagCode}
                </span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {machine.status || 'OPERACIONAL'}
                </span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${theme.badge}`}>
                  {userRole}
                </span>
              </div>

              <h2 className="text-xl font-bold text-white mt-1">
                {machine.name}
              </h2>

              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>{machine.sector}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowQrModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
              title="Gerar e Imprimir QR Code da Máquina"
            >
              <QrCode className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">QR da Máquina</span>
            </button>

            {(userRole === 'CDI' || userRole === 'DESENVOLVEDOR') && onEditMachine && (
              <button
                type="button"
                onClick={() => onEditMachine(machine)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition shadow-md shadow-amber-500/15 cursor-pointer"
                title="Editar Máquina e Vínculo de Itens"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>
            )}

            {(userRole === 'CDI' || userRole === 'DESENVOLVEDOR') && onDeleteMachine && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-lg transition shadow-sm cursor-pointer"
                title="Excluir Máquina"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation: Componentes & Diagrama Técnico em PDF */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900 overflow-x-auto gap-4 text-xs font-medium shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'border-amber-400 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Componentes & Ficha Técnica</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {visibleLinked.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('diagram')}
            className={`py-3 border-b-2 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === 'diagram'
                ? 'border-rose-400 text-rose-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 text-rose-400" />
            <span>Diagrama Técnico (PDF)</span>
            {machine.diagramPdfUrl ? (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                PDF Anexado
              </span>
            ) : (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
                Pendente
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Profile Role Notice Banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${theme.badge}`}>
            <div className="shrink-0 mt-0.5">
              {theme.icon}
            </div>
            <div className="flex-1 text-xs">
              <strong className="block font-semibold mb-0.5">{theme.title}</strong>
              <p className="leading-relaxed opacity-90">{theme.text}</p>
            </div>
          </div>

          {/* Machine Illustrative Image / Technical Blueprint Banner */}
          <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md">
            <TechnicalItemImage
              src={machine.imageUrl}
              alt={machine.name}
              category="Máquina Industrial"
              tagCode={machine.tagCode}
              aspectRatio="16/9"
              showBlueprintToggle={true}
              allowZoom={true}
            />
          </div>

          {/* Machine Technical Overview & Dimensions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Dimensions Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block font-semibold mb-1 flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-amber-400" />
                  <span>Dimensões Técnicas</span>
                </span>
                <p className="text-xs font-mono text-slate-200 leading-relaxed font-semibold">
                  {machine.dimensions || 'Conforme especificação mecânica original.'}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-900 text-[10px] text-slate-500 font-mono">
                Identificador: {machine.tagCode}
              </div>
            </div>

            {/* Sector & Line */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block font-semibold mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Localização na Planta</span>
                </span>
                <p className="text-xs text-slate-200 font-medium">
                  {machine.sector}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-900 text-[10px] text-slate-500 font-mono flex items-center justify-between">
                <span>Status: {machine.status || 'OPERACIONAL'}</span>
                <span>{machine.createdBy ? `Criado por ${machine.createdBy}` : 'Catálogo Padrão'}</span>
              </div>
            </div>

            {/* Segregation Status */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block font-semibold mb-1 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Componentes Disponíveis</span>
                </span>
                <div className="text-xs text-slate-200">
                  <span className="text-lg font-bold font-mono text-amber-400">{visibleLinked.length}</span>
                  <span className="text-slate-400 ml-1">itens liberados para você</span>
                </div>
              </div>
              {hiddenCount > 0 && userRole !== 'DESENVOLVEDOR' && (
                <div className="mt-3 pt-2 border-t border-slate-900 text-[10px] text-slate-500">
                  +{hiddenCount} itens restritos à outra equipe
                </div>
              )}
            </div>
          </div>

          {/* Banner de Acesso Rápido ao Diagrama em PDF */}
          {machine.diagramPdfUrl ? (
            <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-white font-mono truncate">
                      {machine.diagramPdfFileName || `${machine.tagCode}_diagrama.pdf`}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                      PDF HOMOLOGADO
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                    {machine.diagramDescription || 'Diagrama técnico esquemático com planta e interligações da máquina.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('diagram')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ver Diagrama</span>
                </button>
                <a
                  href={machine.diagramPdfUrl}
                  download={machine.diagramPdfFileName || `${machine.tagCode}_diagrama.pdf`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition shadow cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar PDF</span>
                </a>
              </div>
            </div>
          ) : (
            (userRole === 'CDI' || userRole === 'DESENVOLVEDOR') && onEditMachine && (
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Nenhum diagrama em PDF cadastrado nesta máquina.</span>
                </div>
                <button
                  type="button"
                  onClick={() => onEditMachine(machine)}
                  className="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1 text-xs cursor-pointer hover:underline"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Anexar Diagrama em PDF</span>
                </button>
              </div>
            )
          )}

          {/* Description */}
          {machine.description && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 leading-relaxed">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
                Descrição Funcional & Aplicação
              </span>
              {machine.description}
            </div>
          )}

          {/* Linked Components List (Filtered by Role) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Componentes Vinculados à Máquina</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Exibindo {visibleLinked.length} de {(machine.linkedComponents || []).length} itens
              </span>
            </div>

            {visibleLinked.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {visibleLinked.map((link, idx) => {
                  if (!link || !link.componentId) return null;
                  const linkId = String(link.componentId).trim();
                  const comp = allComponents.find(c =>
                    (c.id && c.id === linkId) ||
                    (c.tagCode && c.tagCode.toUpperCase() === linkId.toUpperCase()) ||
                    (c.id && c.id.toLowerCase() === linkId.toLowerCase())
                  );
                  if (!comp) return null;

                  return (
                    <div
                      key={link.componentId}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition flex flex-col justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3">
                        {/* Thumbnail illustrative image with guaranteed mobile fallback */}
                        <div
                          onClick={() => onSelectComponent(comp, 'specs')}
                          className="w-16 h-16 rounded-lg overflow-hidden border border-slate-800 shrink-0 bg-slate-900 cursor-pointer shadow-sm hover:border-amber-500/50 transition"
                        >
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

                        <div className="flex-1 min-w-0">
                          {/* Header of Item Card */}
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-mono text-xs font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              {comp.tagCode}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                              {comp.category}
                            </span>
                          </div>

                          {/* Component Name */}
                          <h4
                            onClick={() => onSelectComponent(comp, 'specs')}
                            className="text-xs font-bold text-white group-hover:text-amber-400 transition cursor-pointer line-clamp-2 leading-snug"
                          >
                            {comp.name}
                          </h4>

                          {/* Position on Machine */}
                          {link.positionOrFunction && (
                            <div className="mt-1.5 text-[11px] text-amber-300/90 font-mono bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
                              <span className="text-slate-500">Função: </span>
                              {link.positionOrFunction}
                            </div>
                          )}

                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                            {comp.manufacturer} · {comp.model}
                          </p>
                        </div>
                      </div>

                        {/* Allowed roles badges if CDI / developer */}
                        {(userRole === 'CDI' || userRole === 'DESENVOLVEDOR') && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <span className="text-[10px] text-slate-500 font-mono">Acessível por:</span>
                            {link.allowedRoles.map(r => (
                              <span
                                key={r}
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                                  r === 'MECANICA'
                                    ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                    : r === 'ELETRICA'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                }`}
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        )}

                      {/* Quick Link to Component Details */}
                      <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {comp.specs?.length || 0} especificações
                        </span>

                        <button
                          type="button"
                          onClick={() => onSelectComponent(comp, 'specs')}
                          className="flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 transition cursor-pointer"
                        >
                          <span>Ver Ficha Técnica</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                <Info className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="font-semibold text-white mb-1">
                  Nenhum componente liberado para o perfil {userRole} nesta máquina
                </p>
                <p className="text-slate-500 max-w-md mx-auto">
                  O desenvolvedor configurou os itens desta máquina exclusivamente para a outra equipe técnica especializada.
                </p>
              </div>
            )}
          </div>

          {/* Segregation Note for Non-CDI */}
          {hiddenCount > 0 && userRole !== 'CDI' && userRole !== 'DESENVOLVEDOR' && (
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center gap-2.5 text-xs text-slate-400">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Esta máquina também conta com <strong>{hiddenCount} itens</strong> sob responsabilidade da equipe {userRole === 'MECANICA' ? 'Elétrica (motoredutor, inversor de frequência, sensores)' : 'Mecânica (rolamentos, mancais, correia, rolos)'}.
              </span>
            </div>
          )}

          {/* Delete Machine Button (CDI Only) */}
          {(userRole === 'CDI' || userRole === 'DESENVOLVEDOR') && onDeleteMachine && (
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-rose-400 block">Zona de Exclusão</span>
                <span className="text-[11px] text-slate-500">Remove o cadastro desta máquina (as peças vinculadas permanecem salvas).</span>
              </div>

              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 bg-slate-800 text-xs text-slate-300 rounded-lg hover:bg-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      onDeleteMachine(machine.id);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white rounded-lg transition"
                  >
                    Confirmar Exclusão
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium rounded-lg border border-rose-500/20 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Máquina</span>
                </button>
              )}
            </div>
          )}
            </div>
          )}

          {/* TAB 2: Diagrama Técnico em PDF da Máquina */}
          {activeTab === 'diagram' && (
            <div className="space-y-4">
              {machine.diagramPdfUrl ? (
                <div className="space-y-4">
                  {/* Toolbar do Diagrama */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-white font-mono truncate">
                            {machine.diagramPdfFileName || `${machine.tagCode}_diagrama.pdf`}
                          </h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold shrink-0">
                            PDF HOMOLOGADO
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">
                          {machine.diagramDescription || 'Diagrama e esquema elétrico/mecânico homologado para manutenção.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={machine.diagramPdfUrl}
                        download={machine.diagramPdfFileName || `${machine.tagCode}_diagrama.pdf`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition shadow cursor-pointer active:scale-95"
                      >
                        <Download className="w-4 h-4" />
                        <span>Baixar Arquivo PDF</span>
                      </a>
                    </div>
                  </div>

                  {/* Viewer embutido com altura generosa */}
                  <div className="w-full h-[540px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col shadow-inner">
                    <iframe
                      src={machine.diagramPdfUrl}
                      title={`Diagrama em PDF - ${machine.name}`}
                      className="w-full flex-1 border-0 bg-slate-900"
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 font-mono text-center">
                    Documento oficial para consulta técnica nas intervenções mecânicas e elétricas na fábrica.
                  </p>
                </div>
              ) : (
                <div className="p-12 rounded-2xl bg-slate-950/80 border border-dashed border-slate-800 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h4 className="text-sm font-bold text-white">Nenhum Diagrama em PDF Anexado</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {(userRole === 'CDI' || userRole === 'DESENVOLVEDOR')
                        ? 'Como administrador do perfil CDI, você pode editar o cadastro desta máquina e anexar o diagrama técnico em PDF do seu computador ou celular.'
                        : 'O perfil CDI ainda não anexou um diagrama técnico em PDF para esta máquina.'}
                    </p>
                  </div>
                  {(userRole === 'CDI' || userRole === 'DESENVOLVEDOR') && onEditMachine && (
                    <button
                      type="button"
                      onClick={() => onEditMachine(machine)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition shadow-md shadow-amber-500/20 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Anexar Diagrama em PDF Agora</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono">
            IFTA · Sistema de Gestão Técnica de Ativos
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
          >
            Fechar
          </button>
        </div>

      </div>

      {/* QR Code Modal for Machine */}
      {showQrModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="relative max-w-sm w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <TechnicalQrCode
              payload={machine.qrCodeData || `IFTA:${machine.tagCode}`}
              tagCode={machine.tagCode}
              title={machine.name}
              itemType="machine"
              sectorOrCategory={machine.sector}
              dimensions={machine.dimensions}
              size={200}
              showActions={true}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Machine */}
      {confirmDelete && onDeleteMachine && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white">
                  Excluir Máquina: {machine.name}?
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Tem certeza que deseja excluir o cadastro desta máquina (<strong className="text-white font-mono">{machine.tagCode}</strong>)? Esta ação removerá a máquina da planta. As peças vinculadas permanecerão salvas no catálogo técnico.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteMachine(machine.id);
                  setConfirmDelete(false);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Excluir Máquina</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
