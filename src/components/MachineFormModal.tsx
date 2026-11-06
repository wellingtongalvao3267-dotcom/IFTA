import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Cog,
  Layers,
  Wrench,
  Zap,
  Shield,
  Search,
  Check,
  Sparkles,
  Ruler,
  MapPin,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Upload,
  Camera,
  Trash2,
  Loader2,
  QrCode,
  Info,
  CheckCircle2,
  Download,
  Eye
} from 'lucide-react';
import { MachineItem, ComponentItem, LinkedComponentRule, UserRole } from '../types';
import { TechnicalItemImage } from './TechnicalItemImage';
import { compressImageDetailed, formatBytes, CompressionResult } from '../utils/imageUtils';
import { storageService } from '../services/storageService';

interface MachineFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (machine: MachineItem) => void;
  initialMachine?: MachineItem | null;
  allComponents: ComponentItem[];
}

export const MachineFormModal: React.FC<MachineFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialMachine,
  allComponents
}) => {
  const [formData, setFormData] = useState<Partial<MachineItem>>({
    name: '',
    tagCode: '',
    sector: '',
    dimensions: '',
    description: '',
    imageUrl: '',
    status: 'OPERACIONAL',
    diagramPdfUrl: '',
    diagramPdfFileName: '',
    diagramDescription: '',
    linkedComponents: []
  });

  const [compSearch, setCompSearch] = useState('');
  const [compCategoryFilter, setCompCategoryFilter] = useState('TODAS');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<CompressionResult | null>(null);

  // Estados para Anexo e Processamento de Diagrama em PDF da Máquina
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null);
  const [pdfSizeInfo, setPdfSizeInfo] = useState<string | null>(null);
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    setImageUploadError(null);

    try {
      // Compressão acelerada por hardware: 960x720 WebP/JPEG com altíssima nitidez e menos de 70KB
      const result = await compressImageDetailed(file, 960, 720, 0.78);
      setFormData(prev => ({ ...prev, imageUrl: result.dataUrl }));
      setCompressionInfo(result);
    } catch (err: any) {
      console.error('Erro ao carregar imagem do dispositivo:', err);
      setImageUploadError(err?.message || 'Não foi possível carregar a imagem do dispositivo.');
    } finally {
      setIsProcessingImage(false);
      e.target.value = '';
    }
  };

  const handlePdfFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      setPdfUploadError('Por favor selecione um arquivo válido em formato PDF (.pdf).');
      return;
    }

    // Limite de segurança de 15MB
    const maxBytes = 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      setPdfUploadError(`O arquivo PDF selecionado possui ${(file.size / (1024 * 1024)).toFixed(1)} MB. O limite máximo recomendado é de 15 MB.`);
      return;
    }

    setIsProcessingPdf(true);
    setPdfUploadError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFormData(prev => ({
        ...prev,
        diagramPdfUrl: result,
        diagramPdfFileName: file.name,
        diagramDescription: prev.diagramDescription || `Diagrama Técnico e Esquemático de ${file.name.replace(/\.[^/.]+$/, '')}`
      }));
      setPdfSizeInfo(formatBytes(file.size));
      setIsProcessingPdf(false);
    };
    reader.onerror = () => {
      setPdfUploadError('Não foi possível ler o arquivo PDF do dispositivo.');
      setIsProcessingPdf(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  useEffect(() => {
    if (initialMachine) {
      setFormData({
        ...initialMachine,
        linkedComponents: initialMachine.linkedComponents ? [...initialMachine.linkedComponents] : [],
        diagramPdfUrl: initialMachine.diagramPdfUrl || '',
        diagramPdfFileName: initialMachine.diagramPdfFileName || '',
        diagramDescription: initialMachine.diagramDescription || ''
      });
      if (initialMachine.diagramPdfUrl) {
        setPdfSizeInfo('Arquivo Homologado');
      } else {
        setPdfSizeInfo(null);
      }
    } else {
      const defaultTag = storageService.generateUniqueMachineTag('MAQ-EST');
      setFormData({
        name: '',
        tagCode: defaultTag,
        sector: 'Linha de Embalagem / Expedição',
        dimensions: '12.500 mm (Comprimento) x 650 mm (Largura útil) x 900 mm (Altura)',
        description: 'Máquina / Equipamento industrial para linha de produção contínua.',
        imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
        status: 'OPERACIONAL',
        diagramPdfUrl: '',
        diagramPdfFileName: '',
        diagramDescription: '',
        linkedComponents: []
      });
      setPdfSizeInfo(null);
    }
    setErrorMsg(null);
    setPdfUploadError(null);
  }, [initialMachine, isOpen]);

  if (!isOpen) return null;

  // Toggle whether a component is linked
  const handleToggleComponentLink = (comp: ComponentItem) => {
    const current = formData.linkedComponents || [];
    const existsIndex = current.findIndex(c => c.componentId === comp.id);

    if (existsIndex >= 0) {
      // Remove
      const updated = current.filter(c => c.componentId !== comp.id);
      setFormData({ ...formData, linkedComponents: updated });
    } else {
      // Add with default roles based on component category
      const isMec = ['mecânica', 'pneumática', 'hidráulica'].includes(comp.category.toLowerCase());
      const isElet = ['elétrica', 'automação', 'instrumentação', 'painéis'].includes(comp.category.toLowerCase());

      const allowedRoles: UserRole[] = ['CDI'];
      if (isMec) allowedRoles.push('MECANICA');
      if (isElet) allowedRoles.push('ELETRICA');
      if (!isMec && !isElet) {
        allowedRoles.push('MECANICA', 'ELETRICA');
      }

      const newRule: LinkedComponentRule = {
        componentId: comp.id,
        allowedRoles,
        positionOrFunction: comp.application || `Item montado na máquina`
      };

      setFormData({
        ...formData,
        linkedComponents: [...current, newRule]
      });
    }
  };

  // Toggle role permission for a linked component
  const handleToggleRole = (componentId: string, role: UserRole) => {
    const current = formData.linkedComponents || [];
    const updated = current.map(link => {
      if (link.componentId !== componentId) return link;
      const roles = new Set(link.allowedRoles);
      // CDI always has access
      roles.add('CDI');

      if (roles.has(role)) {
        roles.delete(role);
      } else {
        roles.add(role);
      }

      return {
        ...link,
        allowedRoles: Array.from(roles) as UserRole[]
      };
    });

    setFormData({ ...formData, linkedComponents: updated });
  };

  // Update position or function text
  const handleUpdatePosition = (componentId: string, text: string) => {
    const current = formData.linkedComponents || [];
    const updated = current.map(link => {
      if (link.componentId !== componentId) return link;
      return { ...link, positionOrFunction: text };
    });
    setFormData({ ...formData, linkedComponents: updated });
  };

  // Suggest automatic permissions by category
  const handleAutoAssignPermissions = () => {
    const current = formData.linkedComponents || [];
    const updated = current.map(link => {
      const comp = allComponents.find(c => c.id === link.componentId);
      if (!comp) return link;

      const isMec = ['mecânica', 'pneumática', 'hidráulica'].includes(comp.category.toLowerCase());
      const isElet = ['elétrica', 'automação', 'instrumentação', 'painéis'].includes(comp.category.toLowerCase());

      const allowed: UserRole[] = ['CDI'];
      if (isMec) allowed.push('MECANICA');
      if (isElet) allowed.push('ELETRICA');
      if (!isMec && !isElet) {
        allowed.push('MECANICA', 'ELETRICA');
      }

      return {
        ...link,
        allowedRoles: allowed
      };
    });

    setFormData({ ...formData, linkedComponents: updated });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setErrorMsg('O nome da máquina é obrigatório (ex: "Esteira transportadora 01").');
      return;
    }
    if (!formData.tagCode?.trim()) {
      setErrorMsg('A Tag / Código da máquina é obrigatória (ex: "MAQ-EST-01").');
      return;
    }

    const cleanTag = formData.tagCode.trim().toUpperCase().replace(/\s+/g, '-');

    // Validação estrita de unicidade
    if (!storageService.isMachineTagUnique(cleanTag, initialMachine?.id)) {
      setErrorMsg(`A Tag "${cleanTag}" já está em uso por outro equipamento cadastrado. Cada máquina deve possuir uma Tag única para garantir um QR Code exclusivo e persistente.`);
      return;
    }

    const finalMachine: MachineItem = {
      id: initialMachine?.id || `maq-${Date.now()}`,
      name: formData.name.trim(),
      tagCode: cleanTag,
      sector: formData.sector?.trim() || 'Linha Geral de Manutenção',
      dimensions: formData.dimensions?.trim() || 'Dimensões padrão conforme layout fabril',
      description: formData.description?.trim() || '',
      imageUrl: formData.imageUrl?.trim() || '',
      diagramPdfUrl: formData.diagramPdfUrl || '',
      diagramPdfFileName: formData.diagramPdfFileName?.trim() || (formData.diagramPdfUrl ? `${cleanTag}_diagrama.pdf` : ''),
      diagramDescription: formData.diagramDescription?.trim() || '',
      qrCodeData: `IFTA:${cleanTag}`,
      status: formData.status || 'OPERACIONAL',
      linkedComponents: formData.linkedComponents || [],
      createdBy: initialMachine?.createdBy || storageService.getCurrentUser()?.username || 'CDI',
      updatedBy: storageService.getCurrentUser()?.username || 'CDI',
      createdAt: initialMachine?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(finalMachine);
  };

  const categories = Array.from(new Set(allComponents.map(c => c.category))).filter(Boolean);

  const filteredComponents = allComponents.filter(comp => {
    const matchesSearch = !compSearch.trim() || (
      comp.name.toLowerCase().includes(compSearch.toLowerCase()) ||
      comp.tagCode.toLowerCase().includes(compSearch.toLowerCase()) ||
      comp.model.toLowerCase().includes(compSearch.toLowerCase()) ||
      comp.category.toLowerCase().includes(compSearch.toLowerCase())
    );
    const matchesCat = compCategoryFilter === 'TODAS' || comp.category.toLowerCase() === compCategoryFilter.toLowerCase();
    return matchesSearch && matchesCat;
  });

  const linkedCount = formData.linkedComponents?.length || 0;
  const mecCount = formData.linkedComponents?.filter(c => c.allowedRoles.includes('MECANICA')).length || 0;
  const eletCount = formData.linkedComponents?.filter(c => c.allowedRoles.includes('ELETRICA')).length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Cog className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  {initialMachine ? 'Editar Cadastro de Máquina' : 'Cadastrar Nova Máquina'}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase">
                  CDI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Adicione a máquina e selecione quais componentes serão liberados para Mecânica e Elétrica.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Dados Principais da Máquina */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-2">
              <Cog className="w-4 h-4 text-amber-400" />
              <span>1. Informações Gerais do Equipamento</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome da Máquina *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Esteira Transportadora 01"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Código / Tag de Identificação *
                  </label>
                  {!initialMachine && (
                    <button
                      type="button"
                      onClick={() => {
                        const newTag = storageService.generateUniqueMachineTag('MAQ-EST');
                        setFormData(prev => ({ ...prev, tagCode: newTag }));
                      }}
                      className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer font-medium"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Gerar Tag Única</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={formData.tagCode || ''}
                  onChange={(e) => setFormData({ ...formData, tagCode: e.target.value })}
                  placeholder="Ex: MAQ-EST-01"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-amber-400 font-mono uppercase focus:outline-none focus:border-amber-500"
                />
                <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <QrCode className="w-3 h-3 text-amber-400" />
                    <span>Payload: IFTA:{(formData.tagCode || '').trim().toUpperCase() || '...'}</span>
                  </span>
                  <span className="text-emerald-400">QR Persistente</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Setor / Linha de Produção
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={formData.sector || ''}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    placeholder="Ex: Linha de Embalagem 01 / Expedição"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Dimensões Técnicas (Exemplo do usuário)
                </label>
                <div className="relative">
                  <Ruler className="w-4 h-4 absolute left-3 top-2.5 text-amber-400" />
                  <input
                    type="text"
                    value={formData.dimensions || ''}
                    onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                    placeholder="Ex: 12.500 mm (C) x 650 mm (L) x 900 mm (A)"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descrição Técnica & Operacional
                </label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva a finalidade, tipo de transporte, velocidade nominal, características mecânicas e elétricas..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Status Operacional
                </label>
                <select
                  value={formData.status || 'OPERACIONAL'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="OPERACIONAL">OPERACIONAL (Em Funcionamento)</option>
                  <option value="MANUTENCAO">EM MANUTENÇÃO (Parada Técnica)</option>
                  <option value="ALERTA">EM ALERTA (Aguardando Reparo)</option>
                </select>
              </div>

              {/* Seção de Imagem do Dispositivo / Câmera / URL */}
              <div className="md:col-span-2 p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-amber-400" />
                      <span>Imagem Ilustrativa & Técnica da Máquina</span>
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Adicione uma foto real do equipamento diretamente do seu celular/PC ou informe uma URL externa.
                    </p>
                  </div>

                  {formData.imageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, imageUrl: '' }));
                        setCompressionInfo(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors w-fit"
                      title="Remover imagem atual"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover Imagem</span>
                    </button>
                  )}
                </div>

                {imageUploadError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{imageUploadError}</span>
                  </div>
                )}

                {/* Botões de Ação do Dispositivo */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-sm active:scale-95">
                    <Upload className="w-4 h-4" />
                    <span>Adicionar do Meu Dispositivo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>

                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors active:scale-95">
                    <Camera className="w-4 h-4 text-amber-400" />
                    <span>Tirar Foto / Câmera</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>

                  {isProcessingImage && (
                    <span className="text-xs text-amber-400 flex items-center gap-1.5 font-medium animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Otimizando imagem instantaneamente...</span>
                    </span>
                  )}
                </div>

                {/* Métricas de Otimização da Imagem Carregada */}
                {compressionInfo && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>Foto otimizada com sucesso:</strong> de {formatBytes(compressionInfo.originalSizeBytes)} para apenas <strong>{formatBytes(compressionInfo.compressedSizeBytes)}</strong> ({compressionInfo.width}×{compressionInfo.height} px · {compressionInfo.format.toUpperCase()})
                      </span>
                    </div>
                    <span className="font-mono text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300 font-bold">
                      -{compressionInfo.savedPercentage}% mais leve
                    </span>
                  </div>
                )}

                {/* Caixa de Sugestão e Dica Técnica sobre Formatos e Tamanhos */}
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>Sugestão de Formato e Resolução Ideal:</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 leading-relaxed text-slate-300">
                    <li>
                      <strong>Formatos mais leves:</strong> <code>JPG / JPEG</code> ou <code>WebP</code> (evite PNG sem transparência, que costuma ser até 10x mais pesado).
                    </li>
                    <li>
                      <strong>Resolução recomendada:</strong> <strong>800×600</strong> a <strong>1200×900 pixels</strong> (proporção 4:3 ou 16:9). Fotos brutas de câmeras de celular têm 4000×3000 (12MP a 64MP) e pesam 15MB+.
                    </li>
                    <li>
                      <strong>Compressão Automática:</strong> O aplicativo agora pré-redimensiona e converte automaticamente suas fotos para formato WebP leve (~50 KB) em fração de segundo.
                    </li>
                  </ul>
                </div>

                {/* Opção alternativa: URL de imagem */}
                <div className="pt-2">
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Ou informe o link/URL da imagem:
                  </label>
                  <div className="relative">
                    <ImageIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={formData.imageUrl || ''}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder="https://... ou caminho estático /assets/..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                {/* Pré-visualização com alternância Blueprint */}
                <div className="pt-2">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Pré-visualização da Máquina:</span>
                    {formData.imageUrl ? (
                      <span className="text-emerald-400 font-mono text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Foto personalizada carregada
                      </span>
                    ) : (
                      <span className="text-slate-500 font-mono text-[10px]">
                        Sem foto (Blueprint esquemático padrão ativo)
                      </span>
                    )}
                  </div>
                  <div className="w-full max-w-md aspect-video rounded-xl border border-slate-700 overflow-hidden bg-slate-950 shadow-inner">
                    <TechnicalItemImage
                      src={formData.imageUrl}
                      alt={formData.name || 'Preview da Máquina'}
                      category="Máquina Industrial"
                      tagCode={formData.tagCode}
                      aspectRatio="16/9"
                      showBlueprintToggle={true}
                      allowZoom={false}
                    />
                  </div>
                </div>
              </div>

              {/* Seção de Anexo de Diagrama em PDF da Máquina */}
              <div className="md:col-span-2 p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-rose-400" />
                      <span>Diagrama & Esquema Técnico em PDF da Máquina</span>
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Adicione o diagrama elétrico unifilar, esquemático pneumático/hidráulico ou layout CAD da máquina em formato PDF.
                    </p>
                  </div>

                  {formData.diagramPdfUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          diagramPdfUrl: '',
                          diagramPdfFileName: '',
                          diagramDescription: ''
                        }));
                        setPdfSizeInfo(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors w-fit cursor-pointer"
                      title="Remover diagrama PDF"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover PDF</span>
                    </button>
                  )}
                </div>

                {pdfUploadError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{pdfUploadError}</span>
                  </div>
                )}

                {/* Botão de Upload do Dispositivo */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition-colors shadow-sm active:scale-95">
                    <Upload className="w-4 h-4" />
                    <span>Anexar Diagrama em PDF do Dispositivo</span>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handlePdfFileUpload}
                      className="hidden"
                    />
                  </label>

                  {isProcessingPdf && (
                    <span className="text-xs text-rose-400 flex items-center gap-1.5 font-medium animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Carregando e processando documento PDF...</span>
                    </span>
                  )}
                </div>

                {/* Card de Exibição do PDF Carregado */}
                {formData.diagramPdfUrl && (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs font-bold text-white truncate font-mono">
                            {formData.diagramPdfFileName || 'diagrama_tecnico.pdf'}
                          </h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold shrink-0">
                            PDF
                          </span>
                          {pdfSizeInfo && (
                            <span className="text-[10px] font-mono text-slate-400">
                              ({pdfSizeInfo})
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Diagrama pronto para ser salvo e sincronizado no banco central</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowPdfPreviewModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>Pré-visualizar</span>
                      </button>

                      <a
                        href={formData.diagramPdfUrl}
                        download={formData.diagramPdfFileName || `${formData.tagCode || 'MAQ'}_diagrama.pdf`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold border border-rose-500/30 transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Campos Adicionais: Descrição do Diagrama & Link Alternativo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Descrição / Finalidade do Diagrama:
                    </label>
                    <input
                      type="text"
                      value={formData.diagramDescription || ''}
                      onChange={(e) => setFormData({ ...formData, diagramDescription: e.target.value })}
                      placeholder="Ex: Diagrama Elétrico Unifilar e Esquemático Pneumático 24Vcc"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Ou informe o link/URL externa do PDF:
                    </label>
                    <input
                      type="text"
                      value={formData.diagramPdfUrl?.startsWith('data:') ? '' : (formData.diagramPdfUrl || '')}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        setFormData(prev => ({
                          ...prev,
                          diagramPdfUrl: val,
                          diagramPdfFileName: val ? val.split('/').pop() || 'diagrama_remoto.pdf' : prev.diagramPdfFileName
                        }));
                      }}
                      placeholder="https://servidor-fabrica/diagramas/MAQ-EST-01.pdf"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Vínculo de Peças & Definição de Perfis */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>2. Vincular Itens & Definir Acessos por Perfil</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Conforme solicitado: marque quais componentes pertencem a esta máquina e indique se a <strong>MECÂNICA</strong> ou <strong>ELÉTRICA</strong> terá acesso.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAutoAssignPermissions}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-medium rounded-lg border border-slate-700 transition shrink-0 cursor-pointer"
                title="Distribui automaticamente Mecânica x Elétrica com base nas categorias das peças"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-distribuir Perfis</span>
              </button>
            </div>

            {/* Linkage Summary Banner */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-4">
                <span>
                  Total Vinculado: <strong className="text-white font-mono">{linkedCount}</strong>
                </span>
                <span className="text-sky-400 flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Liberado para Mecânica: <strong className="font-mono text-white">{mecCount}</strong></span>
                </span>
                <span className="text-amber-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Liberado para Elétrica: <strong className="font-mono text-white">{eletCount}</strong></span>
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                CDI sempre tem acesso total a todas as peças
              </span>
            </div>

            {/* Filter / Search inside Modal */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={compSearch}
                  onChange={(e) => setCompSearch(e.target.value)}
                  placeholder="Filtrar peças cadastradas (ex: motor, fita, rolamento, mancal, rolos)..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={compCategoryFilter}
                onChange={(e) => setCompCategoryFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-amber-500"
              >
                <option value="TODAS">Todas as Categorias</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Components Selection List */}
            <div className="border border-slate-800 rounded-xl divide-y divide-slate-800/80 bg-slate-950 max-h-72 overflow-y-auto">
              {filteredComponents.length > 0 ? (
                filteredComponents.map((comp) => {
                  const linkedRule = formData.linkedComponents?.find(c => c.componentId === comp.id);
                  const isLinked = Boolean(linkedRule);
                  const canMec = linkedRule?.allowedRoles.includes('MECANICA');
                  const canElet = linkedRule?.allowedRoles.includes('ELETRICA');

                  return (
                    <div
                      key={comp.id}
                      className={`p-3 transition-colors ${
                        isLinked ? 'bg-amber-500/5' : 'hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                        {/* Checkbox to Link + Component Name/Tag */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            id={`link-${comp.id}`}
                            checked={isLinked}
                            onChange={() => handleToggleComponentLink(comp)}
                            className="mt-1 w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500 cursor-pointer"
                          />
                          <label htmlFor={`link-${comp.id}`} className="cursor-pointer min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                {comp.tagCode}
                              </span>
                              <span className="text-xs font-bold text-white truncate">
                                {comp.name}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                {comp.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {comp.manufacturer} · {comp.model}
                            </p>
                          </label>
                        </div>

                        {/* Role Visibility Controls (Active if linked) */}
                        {isLinked && (
                          <div className="flex items-center gap-3 sm:border-l sm:border-slate-800 sm:pl-3 shrink-0">

                            {/* MECANICA CHECKBOX */}
                            <label className="flex items-center gap-1.5 text-xs text-sky-400 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={canMec}
                                onChange={() => handleToggleRole(comp.id, 'MECANICA')}
                                className="w-3.5 h-3.5 rounded text-sky-500 bg-slate-900 border-slate-700 focus:ring-sky-500"
                              />
                              <Wrench className="w-3 h-3" />
                              <span className="font-medium">Mecânica</span>
                            </label>

                            {/* ELETRICA CHECKBOX */}
                            <label className="flex items-center gap-1.5 text-xs text-amber-400 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={canElet}
                                onChange={() => handleToggleRole(comp.id, 'ELETRICA')}
                                className="w-3.5 h-3.5 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500"
                              />
                              <Zap className="w-3 h-3" />
                              <span className="font-medium">Elétrica</span>
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Position / Function input if linked */}
                      {isLinked && (
                        <div className="mt-2.5 pl-7">
                          <input
                            type="text"
                            value={linkedRule?.positionOrFunction || ''}
                            onChange={(e) => handleUpdatePosition(comp.id, e.target.value)}
                            placeholder="Função / posição nesta máquina (ex: Tambor motriz, Rolete de retorno, Fita principal)..."
                            className="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">
                  Nenhuma peça encontrada com o filtro atual.
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{initialMachine ? 'Salvar Alterações da Máquina' : 'Finalizar Cadastro da Máquina'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Pré-visualização do Diagrama PDF */}
      {showPdfPreviewModal && formData.diagramPdfUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md">
          <div className="relative w-full max-w-5xl h-[88vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white font-mono truncate max-w-md">
                    {formData.diagramPdfFileName || 'Diagrama Técnico (PDF)'}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Pré-visualização do documento da máquina
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={formData.diagramPdfUrl}
                  download={formData.diagramPdfFileName || `${formData.tagCode || 'MAQ'}_diagrama.pdf`}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar PDF</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowPdfPreviewModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-950 p-2 overflow-hidden flex flex-col">
              <iframe
                src={formData.diagramPdfUrl}
                title="Pré-visualização do Diagrama PDF"
                className="w-full h-full rounded-xl border border-slate-800 bg-slate-900 shadow-inner"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
