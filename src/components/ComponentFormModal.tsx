import React, { useState } from 'react';
import { X, Save, Plus, Trash2, Upload, AlertCircle, Camera, Loader2, QrCode, Sparkles, Info, CheckCircle2 } from 'lucide-react';
import { ComponentItem, TechnicalSpec, MaintenanceStep, CommonFailure, UserRole } from '../types';
import { INITIAL_CATEGORIES } from '../data/initialData';
import { TechnicalItemImage } from './TechnicalItemImage';
import { compressImageDetailed, formatBytes, CompressionResult } from '../utils/imageUtils';
import { storageService } from '../services/storageService';

interface ComponentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (component: ComponentItem) => void;
  initialComponent?: ComponentItem | null;
}

export const ComponentFormModal: React.FC<ComponentFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialComponent
}) => {
  const isEditing = !!initialComponent;

  const [tagCode, setTagCode] = useState(initialComponent?.tagCode || '');
  const [name, setName] = useState(initialComponent?.name || '');
  const [category, setCategory] = useState(initialComponent?.category || 'Mecânica');
  const [customCategory, setCustomCategory] = useState('');
  const [manufacturer, setManufacturer] = useState(initialComponent?.manufacturer || '');
  const [model, setModel] = useState(initialComponent?.model || '');
  const [application, setApplication] = useState(initialComponent?.application || '');
  const [description, setDescription] = useState(initialComponent?.description || '');
  const [imageUrl, setImageUrl] = useState(initialComponent?.imageUrl || '');
  const [diagramDescription, setDiagramDescription] = useState(initialComponent?.diagramDescription || '');
  const [maintenanceIntervalHours, setMaintenanceIntervalHours] = useState<number>(initialComponent?.maintenanceIntervalHours || 4000);
  const [manualFileName, setManualFileName] = useState(initialComponent?.manualFileName || '');
  const [manualSummary, setManualSummary] = useState(initialComponent?.manualSummary || '');

  // Dynamic specs
  const [specs, setSpecs] = useState<TechnicalSpec[]>(
    initialComponent?.specs || [
      { label: 'Tensão', value: '220/380 V' },
      { label: 'Potência', value: '7.5 kW' }
    ]
  );

  // Maintenance steps
  const [maintenanceGuide, setMaintenanceGuide] = useState<MaintenanceStep[]>(
    initialComponent?.maintenanceGuide || [
      { step: 1, title: 'Inspeção Visual', instruction: 'Verificar alinhamento e fixação.', torqueOrMeasure: 'Visual' }
    ]
  );

  // Common failures
  const [commonFailures, setCommonFailures] = useState<CommonFailure[]>(
    initialComponent?.commonFailures || [
      { symptom: 'Ruído anormal', probableCause: 'Falta de lubrificação', correctiveAction: 'Aplicar graxa recomendada' }
    ]
  );

  // Visible to roles (Segregação de acesso: Mecânica enxerga apenas mecânica, Elétrica apenas elétrica, CDI total)
  const [visibleToRoles, setVisibleToRoles] = useState<UserRole[]>(() => {
    if (initialComponent?.visibleToRoles && initialComponent.visibleToRoles.length > 0) {
      return initialComponent.visibleToRoles;
    }
    const cat = initialComponent?.category || 'Mecânica';
    if (['Elétrica', 'Automação', 'Instrumentação', 'Painéis'].includes(cat)) {
      return ['CDI', 'ELETRICA'];
    }
    return ['CDI', 'MECANICA'];
  });

  const handleCategorySelect = (newCat: string) => {
    setCategory(newCat);
    if (!isEditing) {
      if (['Elétrica', 'Automação', 'Instrumentação', 'Painéis'].includes(newCat)) {
        setVisibleToRoles(['CDI', 'ELETRICA']);
      } else if (['Mecânica', 'Pneumática', 'Hidráulica'].includes(newCat)) {
        setVisibleToRoles(['CDI', 'MECANICA']);
      }
    }
  };

  const [error, setError] = useState('');

  if (!isOpen) return null;

  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<CompressionResult | null>(null);

  // Image file handler with accelerated compression
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    try {
      const result = await compressImageDetailed(file, 960, 720, 0.78);
      setImageUrl(result.dataUrl);
      setCompressionInfo(result);
    } catch (err) {
      console.error('Erro ao comprimir imagem do componente:', err);
    } finally {
      setIsProcessingImage(false);
      e.target.value = '';
    }
  };

  const handleAddSpec = () => {
    setSpecs([...specs, { label: '', value: '' }]);
  };

  const handleRemoveSpec = (index: number) => {
    setSpecs(specs.filter((_, i) => i !== index));
  };

  const handleSpecChange = (index: number, field: 'label' | 'value', value: string) => {
    const next = [...specs];
    next[index][field] = value;
    setSpecs(next);
  };

  const handleAddStep = () => {
    setMaintenanceGuide([
      ...maintenanceGuide,
      { step: maintenanceGuide.length + 1, title: '', instruction: '', torqueOrMeasure: '' }
    ]);
  };

  const handleRemoveStep = (index: number) => {
    setMaintenanceGuide(maintenanceGuide.filter((_, i) => i !== index));
  };

  const handleStepChange = (index: number, field: keyof MaintenanceStep, value: string | number) => {
    const next = [...maintenanceGuide];
    (next[index] as any)[field] = value;
    setMaintenanceGuide(next);
  };

  const handleAddFailure = () => {
    setCommonFailures([
      ...commonFailures,
      { symptom: '', probableCause: '', correctiveAction: '' }
    ]);
  };

  const handleRemoveFailure = (index: number) => {
    setCommonFailures(commonFailures.filter((_, i) => i !== index));
  };

  const handleFailureChange = (index: number, field: keyof CommonFailure, value: string) => {
    const next = [...commonFailures];
    next[index][field] = value;
    setCommonFailures(next);
  };

  const toggleRoleVisibility = (role: UserRole) => {
    if (role === 'CDI' || role === 'DESENVOLVEDOR') return; // Always visible to CDI
    if (visibleToRoles.includes(role)) {
      setVisibleToRoles(visibleToRoles.filter(r => r !== role));
    } else {
      setVisibleToRoles([...visibleToRoles, role]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!tagCode.trim()) {
      setError('O código/tag do componente é obrigatório (ex: MOT-IND-042).');
      return;
    }

    const cleanTag = tagCode.trim().toUpperCase().replace(/\s+/g, '-');

    // Validação estrita de Unicidade
    if (!storageService.isComponentTagUnique(cleanTag, initialComponent?.id)) {
      setError(`A Tag "${cleanTag}" já está cadastrada em outra peça. Cada componente deve possuir uma Tag única para garantir um QR Code exclusivo e válido.`);
      return;
    }

    if (!name.trim()) {
      setError('O nome do componente é obrigatório.');
      return;
    }

    const finalCategory = category === 'OUTRA' ? customCategory.trim() || 'Diversos' : category;

    const updatedItem: ComponentItem = {
      id: initialComponent?.id || `comp-${Date.now()}`,
      tagCode: cleanTag,
      name: name.trim(),
      category: finalCategory,
      manufacturer: manufacturer.trim(),
      model: model.trim(),
      application: application.trim(),
      description: description.trim(),
      imageUrl: imageUrl.trim(),
      diagramDescription: diagramDescription.trim(),
      specs: specs.filter(s => s.label.trim() && s.value.trim()),
      maintenanceIntervalHours: Number(maintenanceIntervalHours) || 4000,
      maintenanceGuide: maintenanceGuide.filter(g => g.title.trim()),
      commonFailures: commonFailures.filter(f => f.symptom.trim()),
      manualFileName: manualFileName.trim() || `${cleanTag}_manual.pdf`,
      manualSummary: manualSummary.trim(),
      qrCodeData: `IFTA:${cleanTag}`,
      visibleToRoles: Array.from(new Set([...visibleToRoles, 'CDI'])) as UserRole[],
      createdBy: initialComponent?.createdBy || storageService.getCurrentUser()?.username || 'CDI',
      updatedBy: storageService.getCurrentUser()?.username || 'CDI',
      createdAt: initialComponent?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(updatedItem);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div>
            <h3 className="text-base font-bold text-white">
              {isEditing ? `Editar Componente: ${initialComponent?.tagCode}` : 'Cadastrar Novo Componente / Peça'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Área de Gestão Técnica CDI (Público com Senha) para gerenciamento do banco de dados técnico
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-800 rounded-lg text-red-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Identification */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-3">
              1. Identificação Técnica
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Tag / Código da Peça *
                  </label>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        const p = (category || 'COMP').substring(0, 3).toUpperCase();
                        setTagCode(storageService.generateUniqueComponentTag(p));
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
                  value={tagCode}
                  onChange={(e) => setTagCode(e.target.value)}
                  placeholder="Ex: MOT-IND-042"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-amber-400 uppercase focus:border-amber-500 focus:outline-none"
                />
                <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <QrCode className="w-3 h-3 text-amber-400" />
                    <span>Payload: IFTA:{tagCode.trim().toUpperCase() || '...'}</span>
                  </span>
                  <span className="text-emerald-400">QR Persistente</span>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nome do Componente *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Motor Elétrico Trifásico 7.5kW"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Categoria do Banco de Dados *
                </label>
                <select
                  value={category}
                  onChange={(e) => handleCategorySelect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                >
                  {INITIAL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="OUTRA">+ Nova Categoria...</option>
                </select>
              </div>

              {category === 'OUTRA' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nome da Nova Categoria
                  </label>
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Digite a categoria"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Fabricante
                </label>
                <input
                  type="text"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="Ex: Siemens / Festo / WEG"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Modelo / Part Number
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Ex: 1LE1001-1DB23-4AA4"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Aplicação / Máquina / Localização
                </label>
                <input
                  type="text"
                  value={application}
                  onChange={(e) => setApplication(e.target.value)}
                  placeholder="Ex: Linha de Envase 02 - Misturador Principal"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Descrição Técnica Detalhada
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva as características técnicas, tipo de vedação, classe de isolamento, princípios de funcionamento..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Image & Diagram */}
          <div className="pt-4 border-t border-slate-800">
            <h4 className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-3">
              2. Imagem Ilustrativa & Diagrama
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Imagem do Componente (Dispositivo ou URL)
                  </label>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remover</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mb-2">
                  <label className="cursor-pointer px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Dispositivo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>

                  <label className="cursor-pointer px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 flex items-center gap-1.5 transition">
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>Câmera</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>

                  {isProcessingImage && (
                    <span className="text-xs text-amber-400 flex items-center gap-1 self-center animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Otimizando...</span>
                    </span>
                  )}
                </div>

                <div className="mb-2">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Ou cole a URL / caminho da imagem"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {compressionInfo && (
                  <div className="mb-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-[11px] text-emerald-300">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{formatBytes(compressionInfo.originalSizeBytes)} ➔ {formatBytes(compressionInfo.compressedSizeBytes)} ({compressionInfo.format.toUpperCase()})</span>
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">-{compressionInfo.savedPercentage}%</span>
                  </div>
                )}

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1 mb-2">
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    <span>Dica de Tamanho & Formato:</span>
                  </span>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Formatos <strong>JPG</strong> ou <strong>WebP</strong> (800×600 a 1200×900) carregam instantaneamente. O app otimiza fotos pesadas automaticamente.
                  </p>
                </div>
                <div className="w-full max-w-xs aspect-[4/3] rounded-lg border border-slate-700 overflow-hidden bg-slate-950">
                  <TechnicalItemImage
                    src={imageUrl}
                    alt={name || 'Preview da Peça'}
                    category={category}
                    tagCode={tagCode}
                    aspectRatio="4/3"
                    showBlueprintToggle={true}
                    allowZoom={false}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Descrição do Diagrama / Mapa de Conexão
                </label>
                <textarea
                  rows={4}
                  value={diagramDescription}
                  onChange={(e) => setDiagramDescription(e.target.value)}
                  placeholder="Esquema elétrico de ligação de bornes, pinagem do conector, pressão recomendada de ar ou esquema hidráulico..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Technical Specs */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs uppercase tracking-wider text-amber-400 font-semibold">
                3. Especificações Técnicas (Parâmetros)
              </h4>
              <button
                type="button"
                onClick={handleAddSpec}
                className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Parâmetro</span>
              </button>
            </div>

            <div className="space-y-2">
              {specs.map((spec, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={spec.label}
                    onChange={(e) => handleSpecChange(i, 'label', e.target.value)}
                    placeholder="Parâmetro (ex: Tensão Nominal)"
                    className="w-1/2 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100"
                  />
                  <input
                    type="text"
                    value={spec.value}
                    onChange={(e) => handleSpecChange(i, 'value', e.target.value)}
                    placeholder="Valor (ex: 380 Vca Trifásico)"
                    className="w-1/2 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSpec(i)}
                    className="p-1.5 text-slate-500 hover:text-red-400 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Maintenance and Failures */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs uppercase tracking-wider text-amber-400 font-semibold">
                4. Roteiro de Manutenção Preventiva
              </h4>
              <button
                type="button"
                onClick={handleAddStep}
                className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Passo</span>
              </button>
            </div>

            <div className="space-y-2">
              {maintenanceGuide.map((step, i) => (
                <div key={i} className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-400">Passo {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(i)}
                      className="text-xs text-slate-500 hover:text-red-400"
                    >
                      Remover
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) => handleStepChange(i, 'title', e.target.value)}
                      placeholder="Título da inspeção (ex: Verificação de Vibração)"
                      className="px-3 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100"
                    />
                    <input
                      type="text"
                      value={step.torqueOrMeasure || ''}
                      onChange={(e) => handleStepChange(i, 'torqueOrMeasure', e.target.value)}
                      placeholder="Torque / Medida recomendada (ex: 75 N·m)"
                      className="px-3 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={step.instruction}
                    onChange={(e) => handleStepChange(i, 'instruction', e.target.value)}
                    placeholder="Instruções de execução..."
                    className="w-full px-3 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Access Permissions (Pre-selected by developer) */}
          <div className="pt-4 border-t border-slate-800">
            <h4 className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-2">
              5. Permissões de Acesso aos Bancos de Dados
            </h4>
            <p className="text-xs text-slate-400 mb-3">
              Defina quais perfis poderão consultar esta peça no aplicativo:
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="rounded text-amber-500"
                />
                <span className="text-xs font-semibold text-slate-200">CDI</span>
                <span className="text-[10px] text-slate-500">(Total)</span>
              </div>

              <label className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center gap-2 cursor-pointer hover:border-amber-500/50 transition">
                <input
                  type="checkbox"
                  checked={visibleToRoles.includes('MECANICA') || visibleToRoles.includes('MANUTENCAO')}
                  onChange={() => toggleRoleVisibility('MECANICA')}
                  className="rounded text-amber-500"
                />
                <span className="text-xs font-semibold text-slate-200">MECANICA</span>
              </label>

              <label className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center gap-2 cursor-pointer hover:border-amber-500/50 transition">
                <input
                  type="checkbox"
                  checked={visibleToRoles.includes('ELETRICA')}
                  onChange={() => toggleRoleVisibility('ELETRICA')}
                  className="rounded text-amber-500"
                />
                <span className="text-xs font-semibold text-slate-200">ELETRICA</span>
              </label>
            </div>
          </div>

          {/* Bottom Error message for mobile view */}
          {error && (
            <div className="p-3 bg-red-950/80 border border-red-800 rounded-lg flex items-center gap-2 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-lg transition shadow active:scale-[0.98]"
            >
              <Save className="w-4 h-4" />
              <span>{isEditing ? 'Salvar Alterações' : 'Cadastrar Componente'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
