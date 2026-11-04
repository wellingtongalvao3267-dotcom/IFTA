import React, { useEffect, useRef, useState } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Scan, 
  RefreshCw, 
  Search, 
  ArrowRight,
  Plus,
  SwitchCamera,
  Check
} from 'lucide-react';
import jsQR from 'jsqr';
import { ComponentItem, MachineItem } from '../types';
import { Cog, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanMatch: (tagCode: string) => void;
  onScanMatchMachine?: (machine: MachineItem) => void;
  components: ComponentItem[];
  allComponents?: ComponentItem[];
  machines?: MachineItem[];
  currentUserRole?: string;
  onAddNewWithCode?: (code: string) => void;
}

// Som de bipe instantâneo ao detectar QR code
function playScanBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // silencioso se áudio não for permitido
  }
}

// Resilient matcher across multiple fields, URLs, prefixes, and models
export function matchComponentFromQr(
  rawValue: string, 
  itemList: ComponentItem[]
): ComponentItem | null {
  if (!rawValue || !rawValue.trim() || !itemList || itemList.length === 0) return null;
  const raw = rawValue.trim();
  const rawUpper = raw.toUpperCase();

  // 1. Strip URLs (e.g. https://.../MOT-IND-042 or https://...?tag=MOT-IND-042)
  let clean = rawUpper;
  try {
    if (raw.includes('://')) {
      const url = new URL(raw);
      const qTag = url.searchParams.get('tag') || url.searchParams.get('code') || url.searchParams.get('id');
      if (qTag) {
        clean = qTag.toUpperCase();
      } else {
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length > 0) {
          clean = decodeURIComponent(parts[parts.length - 1]).toUpperCase();
        }
      }
    }
  } catch {
    clean = rawUpper.replace(/^HTTPS?:\/\/[^\/]+\//i, '').replace(/[#\?].*$/, '');
  }

  // Strip standard prefixes
  clean = clean.replace(/^(IFTA|TAG|PECA|PEÇA|CODE|ID|ITEM)[:\-\/_\s]+/i, '').trim();

  // Helper to remove punctuation for relaxed alphanumeric matching
  const strip = (str: string) => (str || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const strippedClean = strip(clean);
  const strippedRaw = strip(raw);

  // 1. Direct tagCode match
  const directTag = itemList.find(
    c => c.tagCode.toUpperCase() === rawUpper || c.tagCode.toUpperCase() === clean
  );
  if (directTag) return directTag;

  // 2. Direct qrCodeData match
  const directQr = itemList.find(
    c => c.qrCodeData && (c.qrCodeData.toUpperCase() === rawUpper || c.qrCodeData.toUpperCase() === clean)
  );
  if (directQr) return directQr;

  // 3. Relaxed stripped match (e.g. MOTIND042 matches MOT-IND-042)
  if (strippedClean.length >= 3) {
    const strippedMatch = itemList.find(c => {
      const cTag = strip(c.tagCode);
      const cId = strip(c.id);
      return (
        cTag === strippedClean ||
        cTag === strippedRaw ||
        cId === strippedClean ||
        cId === strippedRaw
      );
    });
    if (strippedMatch) return strippedMatch;
  }

  // 4. Substring match: QR string contains component tag or tag contains QR string
  const subMatch = itemList.find(c => {
    const tag = c.tagCode.toUpperCase();
    const cTagStripped = strip(c.tagCode);
    return (
      rawUpper.includes(tag) || 
      clean.includes(tag) || 
      (cTagStripped.length >= 4 && (strippedRaw.includes(cTagStripped) || strippedClean.includes(cTagStripped)))
    );
  });
  if (subMatch) return subMatch;

  // 5. Model / Part Number match
  const modelMatch = itemList.find(c => {
    if (!c.model) return false;
    const cModel = c.model.toUpperCase();
    const cModelStripped = strip(c.model);
    return (
      cModel === rawUpper ||
      cModel === clean ||
      (cModel.length >= 4 && (rawUpper.includes(cModel) || clean.includes(cModel))) ||
      (cModelStripped.length >= 4 && (strippedClean.includes(cModelStripped) || strippedRaw.includes(cModelStripped)))
    );
  });
  if (modelMatch) return modelMatch;

  // 6. Name match if string is detailed
  if (clean.length >= 4) {
    const nameMatch = itemList.find(
      c => c.name.toUpperCase().includes(clean) || clean.includes(c.name.toUpperCase())
    );
    if (nameMatch) return nameMatch;
  }

  return null;
}

// Matcher for Machines & Equipment
export function matchMachineFromQr(
  rawValue: string,
  machineList: MachineItem[]
): MachineItem | null {
  if (!rawValue || !rawValue.trim() || !machineList || machineList.length === 0) return null;
  const raw = rawValue.trim();
  const rawUpper = raw.toUpperCase();

  let clean = rawUpper;
  try {
    if (raw.includes('://')) {
      const url = new URL(raw);
      const qTag = url.searchParams.get('tag') || url.searchParams.get('code') || url.searchParams.get('id') || url.searchParams.get('maq');
      if (qTag) {
        clean = qTag.toUpperCase();
      } else {
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length > 0) {
          clean = decodeURIComponent(parts[parts.length - 1]).toUpperCase();
        }
      }
    }
  } catch {
    clean = rawUpper.replace(/^HTTPS?:\/\/[^\/]+\//i, '').replace(/[#\?].*$/, '');
  }

  clean = clean.replace(/^(IFTA|MAQ|MAQUINA|EQUIP|TAG)[:\-\/_\s]+/i, '').trim();
  const strip = (str: string) => (str || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const strippedClean = strip(clean);
  const strippedRaw = strip(raw);

  // 1. Direct tagCode match
  const directTag = machineList.find(
    m => m.tagCode.toUpperCase() === rawUpper || m.tagCode.toUpperCase() === clean
  );
  if (directTag) return directTag;

  // 2. Direct qrCodeData match
  const directQr = machineList.find(
    m => m.qrCodeData && (m.qrCodeData.toUpperCase() === rawUpper || m.qrCodeData.toUpperCase() === clean)
  );
  if (directQr) return directQr;

  // 3. Stripped match (e.g. MAQEST01 matches MAQ-EST-01)
  if (strippedClean.length >= 3) {
    const strippedMatch = machineList.find(m => {
      const mTag = strip(m.tagCode);
      const mId = strip(m.id);
      return mTag === strippedClean || mTag === strippedRaw || mId === strippedClean;
    });
    if (strippedMatch) return strippedMatch;
  }

  // 4. Substring / Name match (e.g. "Esteira", "Transportadora")
  if (clean.length >= 3) {
    const nameMatch = machineList.find(
      m => m.name.toUpperCase().includes(clean) || clean.includes(m.name.toUpperCase())
    );
    if (nameMatch) return nameMatch;
  }

  return null;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanMatch,
  onScanMatchMachine,
  components,
  allComponents = components,
  machines = [],
  currentUserRole = 'DESENVOLVEDOR',
  onAddNewWithCode
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [matchedComponent, setMatchedComponent] = useState<ComponentItem | null>(null);
  const [matchedMachine, setMatchedMachine] = useState<MachineItem | null>(null);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [activeTab, setActiveTab] = useState<'camera' | 'manual' | 'upload' | 'quick'>('camera');
  const [isProcessing, setIsProcessing] = useState(false);

  // Full item list used for matching (so any user can access specs of any factory piece)
  const fullSearchList = allComponents && allComponents.length > 0 ? allComponents : components;

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    setScannedResult(null);
    setMatchedComponent(null);
    setMatchedMachine(null);
    setCameraError(null);
    setIsProcessing(false);

    if (activeTab === 'camera') {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCamera(false);
      setCameraError('Acesso à câmera não suportado neste navegador. Utilize a opção de digitar o código ou carregar foto.');
      setActiveTab('manual');
      return;
    }

    // Attempt cameras with fallback options
    const constraintAttempts: MediaStreamConstraints[] = [
      {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      },
      {
        video: { facingMode }
      },
      {
        video: true
      }
    ];

    let stream: MediaStream | null = null;
    let lastError: Error | null = null;

    for (const constraints of constraintAttempts) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (stream) break;
      } catch (err) {
        lastError = err as Error;
      }
    }

    if (!stream) {
      setHasCamera(false);
      setCameraError(
        lastError?.message || 
        'Não foi possível inicializar a câmera. Verifique se deu permissão de câmera no navegador.'
      );
      return;
    }

    streamRef.current = stream;
    setHasCamera(true);

    if (videoRef.current) {
      const video = videoRef.current;
      video.srcObject = stream;
      video.muted = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('autoplay', 'true');
      try {
        await video.play();
        scanFrame();
      } catch (playErr) {
        console.warn('Erro ao reproduzir stream da câmera:', playErr);
      }
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth'
    });

    if (code && code.data && code.data.trim()) {
      handleCodeDetected(code.data.trim());
      return;
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  const handleCodeDetected = (rawValue: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    stopCamera();
    playScanBeep();

    if (navigator.vibrate) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch {}
    }

    setScannedResult(rawValue);

    // 1. Check if matches a Component in catalog
    const compMatch = matchComponentFromQr(rawValue, fullSearchList);
    if (compMatch) {
      setMatchedComponent(compMatch);
      setMatchedMachine(null);
      setTimeout(() => {
        onScanMatch(compMatch.tagCode);
      }, 500);
      return;
    }

    // 2. Check if matches a Machine in catalog
    const maqMatch = matchMachineFromQr(rawValue, machines);
    if (maqMatch) {
      setMatchedMachine(maqMatch);
      setMatchedComponent(null);
      setTimeout(() => {
        if (onScanMatchMachine) {
          onScanMatchMachine(maqMatch);
        }
      }, 500);
      return;
    }

    // Neither matched
    setMatchedComponent(null);
    setMatchedMachine(null);
    setIsProcessing(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) return;
    handleCodeDetected(manualCodeInput.trim());
  };

  // Upload photo handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'attemptBoth'
        });

        if (code && code.data) {
          handleCodeDetected(code.data);
        } else {
          setCameraError('Nenhum QR Code legível foi detectado na imagem selecionada. Certifique-se de que a etiqueta está nítida e bem iluminada.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-500/10 rounded-lg border border-amber-500/30">
              <Scan className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Escanear QR Code da Peça</h3>
              <p className="text-[11px] text-slate-400">Acesso imediato às especificações técnicas e manuais</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-800 px-4 pt-2.5 gap-2 text-xs font-medium shrink-0 overflow-x-auto bg-slate-950/40">
          <button
            onClick={() => { setActiveTab('camera'); setCameraError(null); }}
            className={`pb-2.5 px-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'camera'
                ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Câmera ao Vivo</span>
          </button>
          
          <button
            onClick={() => { setActiveTab('manual'); stopCamera(); }}
            className={`pb-2.5 px-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'manual'
                ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Digitar Código / Tag</span>
          </button>

          <button
            onClick={() => { setActiveTab('upload'); stopCamera(); }}
            className={`pb-2.5 px-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'upload'
                ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Carregar Foto</span>
          </button>

          <button
            onClick={() => { setActiveTab('quick'); stopCamera(); }}
            className={`pb-2.5 px-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'quick'
                ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Peças da Fábrica</span>
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col items-center">
          
          {/* TAB 1: Live Camera */}
          {activeTab === 'camera' && (
            <div className="w-full flex flex-col items-center">
              <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  playsInline
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Target Frame / Reticle */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className={`w-48 h-48 border-2 rounded-xl relative shadow-2xl transition-all duration-300 ${
                    matchedComponent ? 'border-emerald-400 scale-105' : 'border-amber-400/80'
                  }`}>
                    <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-400 -mt-1 -ml-1" />
                    <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-400 -mt-1 -mr-1" />
                    <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-400 -mb-1 -ml-1" />
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-400 -mb-1 -mr-1" />
                    <div className="w-full h-0.5 bg-amber-400 shadow-[0_0_12px_#f59e0b] animate-pulse" />
                  </div>
                </div>

                {/* Switch Camera Button (Mobile) */}
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  title="Alternar Câmera"
                  className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-200 rounded-lg border border-slate-700 backdrop-blur-sm transition z-10"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>

                {/* Camera error or permission fallback */}
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-5 text-center z-20">
                    <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
                    <p className="text-xs text-slate-200 font-medium mb-1">Câmera não iniciada</p>
                    <p className="text-xs text-slate-400 mb-3 max-w-xs">{cameraError}</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <button
                        onClick={startCamera}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700"
                      >
                        Tentar Novamente
                      </button>
                      <button
                        onClick={() => setActiveTab('manual')}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg"
                      >
                        Digitar Código Manualmente
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between w-full mt-2.5 px-1">
                <p className="text-xs text-slate-400">
                  Aponte para o QR Code da peça ou painel elétrico/mecânico.
                </p>
                <button
                  onClick={() => setActiveTab('manual')}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium underline"
                >
                  Digitar Código
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Manual Input */}
          {activeTab === 'manual' && (
            <div className="w-full space-y-4">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-300 mb-2 font-medium">
                  Digite a Tag da peça, Part Number ou código do QR Code:
                </p>
                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      required
                      value={manualCodeInput}
                      onChange={(e) => setManualCodeInput(e.target.value)}
                      placeholder="Ex: MOT-IND-042, INV-ELET-018, 1LE1, VTUG-10..."
                      className="w-full pl-3 pr-24 py-2.5 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 uppercase focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-inner"
                    />
                    <button
                      type="submit"
                      className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-md transition flex items-center gap-1 shadow"
                    >
                      <span>Acessar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300 block">Exemplos que você pode testar (Máquinas & Peças):</span>
                <div className="flex flex-wrap gap-1.5">
                  {machines.slice(0, 2).map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleCodeDetected(m.tagCode)}
                      className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-mono text-[10px] rounded border border-amber-500/30 font-bold flex items-center gap-1"
                    >
                      <Cog className="w-3 h-3 text-amber-400" />
                      <span>{m.tagCode} ({m.name.split(' ')[0]})</span>
                    </button>
                  ))}
                  {fullSearchList.slice(0, 4).map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleCodeDetected(c.tagCode)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[10px] rounded border border-slate-700"
                    >
                      {c.tagCode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Upload Photo */}
          {activeTab === 'upload' && (
            <div className="w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl p-8 bg-slate-950/50">
              <Upload className="w-10 h-10 text-amber-400 mb-3" />
              <p className="text-sm font-semibold text-slate-100 mb-1">Selecione uma foto da etiqueta com QR Code</p>
              <p className="text-xs text-slate-400 mb-4 text-center">
                Tire uma foto ou envie uma imagem da galeria (JPG, PNG)
              </p>
              <label className="cursor-pointer px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-md shadow-amber-500/20">
                <span>Escolher Imagem do Dispositivo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* TAB 4: Quick System Tags */}
          {activeTab === 'quick' && (
            <div className="w-full space-y-4">
              {machines.length > 0 && (
                <div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                    <Cog className="w-3.5 h-3.5 text-amber-400" />
                    <span>Máquinas & Equipamentos ({machines.length})</span>
                  </span>
                  <div className="space-y-1.5">
                    {machines.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleCodeDetected(m.tagCode)}
                        className="w-full text-left p-2.5 rounded-lg bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/30 transition flex items-center justify-between group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-amber-400">
                              {m.tagCode}
                            </span>
                            <span className="text-[11px] text-slate-400">· {m.sector}</span>
                          </div>
                          <p className="text-xs font-bold text-white">{m.name}</p>
                        </div>
                        <span className="text-xs text-amber-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                          Acessar Máquina →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                  Peças & Componentes ({fullSearchList.length})
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {fullSearchList.map((comp) => (
                    <button
                      key={comp.id}
                      onClick={() => handleCodeDetected(comp.tagCode)}
                      className="w-full text-left p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 transition flex items-center justify-between group"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400">
                            {comp.tagCode}
                          </span>
                          <span className="text-[10px] text-slate-400">· {comp.category}</span>
                        </div>
                        <p className="text-xs text-slate-200 truncate max-w-xs">{comp.name}</p>
                      </div>
                      <span className="text-xs text-amber-400 font-medium group-hover:translate-x-0.5 transition-transform">
                        Ver Especificações →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STATUS NOTIFICATIONS */}
          
          {/* SUCCESS: Component Found */}
          {matchedComponent && (
            <div className="w-full mt-4 p-4 bg-emerald-950/90 border-2 border-emerald-500 rounded-xl shadow-lg animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider uppercase block">
                    ✓ Componente Localizado com Sucesso!
                  </span>
                  <span className="text-sm font-bold text-white block mt-0.5 truncate">
                    {matchedComponent.name}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-emerald-200/90 mt-1">
                    <span className="font-mono font-bold bg-emerald-900/60 px-1.5 py-0.5 rounded border border-emerald-700">
                      {matchedComponent.tagCode}
                    </span>
                    <span>· {matchedComponent.category}</span>
                    <span>· {matchedComponent.manufacturer}</span>
                  </div>
                  
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onScanMatch(matchedComponent.tagCode)}
                      className="w-full py-2 px-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-bold text-xs rounded-lg transition shadow flex items-center justify-center gap-1.5"
                    >
                      <span>Acessar Especificações Técnicas Agora</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUCCESS: Machine Found */}
          {matchedMachine && (
            <div className="w-full mt-4 p-4 bg-amber-950/90 border-2 border-amber-500 rounded-xl shadow-lg animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-400 shrink-0">
                  <Cog className="w-6 h-6 animate-spin-slow" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-mono font-bold text-amber-400 tracking-wider uppercase block">
                    ✓ Máquina / Equipamento Localizado!
                  </span>
                  <span className="text-sm font-bold text-white block mt-0.5 truncate">
                    {matchedMachine.name}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-amber-200/90 mt-1">
                    <span className="font-mono font-bold bg-amber-900/60 px-1.5 py-0.5 rounded border border-amber-700">
                      {matchedMachine.tagCode}
                    </span>
                    <span>· {matchedMachine.sector}</span>
                    <span>· {matchedMachine.linkedComponents.length} itens vinculados</span>
                  </div>
                  
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (onScanMatchMachine) {
                          onScanMatchMachine(matchedMachine);
                        }
                      }}
                      className="w-full py-2 px-3 bg-amber-400 hover:bg-amber-300 active:scale-[0.99] text-slate-950 font-bold text-xs rounded-lg transition shadow flex items-center justify-center gap-1.5"
                    >
                      <span>Acessar Máquina & Itens do seu Perfil</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* NOT FOUND: Scanned but not matched */}
          {scannedResult && !matchedComponent && !matchedMachine && (
            <div className="w-full mt-4 p-3.5 bg-slate-950 border border-slate-700 rounded-xl space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  <span>Código lido da etiqueta: </span>
                  <code className="font-mono text-amber-300 font-semibold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    {scannedResult}
                  </code>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Nenhum componente ou máquina cadastrada corresponde a este código.
              </p>
              
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setScannedResult(null);
                    setActiveTab('manual');
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700"
                >
                  Tentar Outro Código
                </button>

                {currentUserRole === 'DESENVOLVEDOR' && onAddNewWithCode && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onAddNewWithCode(scannedResult);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cadastrar Peça com este Código</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* FAQ / Troubleshooting Section: "O que fazer se não estiver localizando?" */}
          <div className="w-full mt-4 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowHelpGuide(!showHelpGuide)}
              className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-amber-400 transition cursor-pointer p-1"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>O QR Code não está localizando o item? O que fazer:</span>
              </span>
              {showHelpGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showHelpGuide && (
              <div className="mt-2.5 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2.5 text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                  <p className="leading-relaxed">
                    <strong>Iluminação e Foco:</strong> Evite reflexos de luminárias industriais sobre a etiqueta. Mantenha a câmera a cerca de 15 a 25 cm da etiqueta até que o retículo verde se acenda.
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                  <p className="leading-relaxed">
                    <strong>Permissão de Câmera:</strong> Certifique-se de que o navegador possui permissão de câmera concedida. Em celulares, você pode tocar no botão <strong>"Alternar Câmera"</strong> para usar a lente traseira ou grande angular.
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                  <p className="leading-relaxed">
                    <strong>Tirar Foto / Upload:</strong> Se a etiqueta estiver desgastada, acesse a aba <strong>"Carregar Foto"</strong> e selecione a foto direto da galeria do seu celular para decodificação digital com alto contraste.
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">4</span>
                  <p className="leading-relaxed">
                    <strong>Digitação Rápida:</strong> Se a etiqueta estiver danificada, acesse a aba <strong>"Digitar Código / Tag"</strong> ou use a barra de pesquisa no topo com o código da peça (ex: <code>MOT-IND-042</code>, <code>ROL-MEC-219</code>) ou da máquina (<code>MAQ-EST-01</code>).
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-950/80 shrink-0 flex items-center justify-between text-[11px] text-slate-500">
          <span>IFTA · Leitor Industrial de Códigos e Etiquetas</span>
          <span>Base Ativa: {fullSearchList.length} itens</span>
        </div>
      </div>
    </div>
  );
};
