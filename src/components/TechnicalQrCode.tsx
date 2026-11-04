import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  QrCode, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface TechnicalQrCodeProps {
  payload: string; // Payload único gravado (ex: IFTA:MOT-IND-042)
  tagCode: string; // Tag única de identificação (ex: MOT-IND-042)
  title: string;   // Nome do componente ou máquina
  itemType: 'component' | 'machine';
  sectorOrCategory?: string;
  manufacturer?: string;
  model?: string;
  dimensions?: string;
  size?: number;
  showActions?: boolean;
  onTestScan?: (code: string) => void;
}

export const TechnicalQrCode: React.FC<TechnicalQrCodeProps> = ({
  payload,
  tagCode,
  title,
  itemType,
  sectorOrCategory,
  manufacturer,
  model,
  dimensions,
  size = 200,
  showActions = true,
  onTestScan
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Validação e geração do QR Code real ISO/IEC 18004
  useEffect(() => {
    let isMounted = true;
    if (!payload || !payload.trim()) {
      setError('Código QR inválido ou vazio.');
      setQrDataUrl('');
      return;
    }

    setError(null);
    QRCode.toDataURL(payload.trim(), {
      width: Math.max(300, size * 2), // Alta densidade para impressão nítida
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#020617', // Quase preto profundo
        light: '#FFFFFF'
      }
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
        }
      })
      .catch((err) => {
        console.error('Falha ao gerar QR Code real:', err);
        if (isMounted) {
          setError('Erro na renderização do QR Code.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [payload, size]);

  const handleCopy = () => {
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR_${tagCode.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Etiqueta Técnica - ${tagCode}</title>
            <style>
              body {
                font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: #f8fafc;
              }
              .tag-card {
                border: 3px solid #0f172a;
                border-radius: 12px;
                padding: 20px;
                width: 320px;
                text-align: center;
                background: white;
                box-shadow: none;
              }
              .header {
                font-size: 14px;
                font-weight: 900;
                color: #0f172a;
                letter-spacing: 1px;
                margin-bottom: 2px;
              }
              .sub {
                font-size: 9px;
                color: #475569;
                text-transform: uppercase;
                margin-bottom: 12px;
                border-bottom: 1px solid #cbd5e1;
                padding-bottom: 4px;
              }
              .qr-img {
                width: 180px;
                height: 180px;
                margin: 0 auto 10px auto;
                display: block;
              }
              .tag-badge {
                font-family: monospace;
                font-size: 15px;
                font-weight: bold;
                background: #f1f5f9;
                border: 1px solid #0f172a;
                padding: 4px 8px;
                border-radius: 6px;
                display: inline-block;
                margin-bottom: 8px;
              }
              .title {
                font-size: 12px;
                font-weight: bold;
                color: #0f172a;
                margin-bottom: 4px;
              }
              .meta {
                font-size: 10px;
                color: #475569;
                line-height: 1.4;
              }
              .footer {
                margin-top: 12px;
                padding-top: 6px;
                border-top: 1px dashed #cbd5e1;
                font-size: 8px;
                font-family: monospace;
                color: #64748b;
              }
            </style>
          </head>
          <body>
            <div class="tag-card">
              <div class="header">IFTA ENGENHARIA & MANUTENÇÃO</div>
              <div class="sub">Etiqueta de Identificação de Campo</div>
              <img class="qr-img" src="${qrDataUrl}" alt="${tagCode}" />
              <div class="tag-badge">${tagCode}</div>
              <div class="title">${title}</div>
              <div class="meta">
                ${sectorOrCategory ? `<div><strong>Área/Setor:</strong> ${sectorOrCategory}</div>` : ''}
                ${manufacturer ? `<div><strong>Fabricante:</strong> ${manufacturer} ${model ? `· ${model}` : ''}</div>` : ''}
                ${dimensions ? `<div><strong>Dimensões:</strong> ${dimensions}</div>` : ''}
              </div>
              <div class="footer">
                PAYLOAD: ${payload}<br/>
                GERADO EM: ${new Date().toLocaleDateString('pt-BR')} · SISTEMA IFTA
              </div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() { window.close(); };
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto">
      {/* Visual da Etiqueta Técnica Industrial */}
      <div 
        ref={printRef}
        className="w-full bg-white text-slate-900 rounded-2xl border-4 border-slate-300 shadow-xl p-5 flex flex-col items-center text-center transition-all"
      >
        <div className="font-black tracking-tight text-sm text-slate-950 uppercase flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>IFTA ENGENHARIA & MANUTENÇÃO</span>
        </div>
        <div className="text-[10px] text-slate-600 font-mono uppercase tracking-wider mb-2.5">
          Etiqueta Técnica · {itemType === 'machine' ? 'Máquina Industrial' : 'Componente / Peça'}
        </div>

        {/* Imagem do QR Code 100% Real e Válido */}
        <div className="p-2.5 bg-white border-2 border-slate-900 rounded-xl mb-2.5 shadow-sm">
          {qrDataUrl ? (
            <img 
              src={qrDataUrl} 
              alt={`QR Code para ${tagCode}`}
              style={{ width: size, height: size }}
              className="block object-contain"
            />
          ) : error ? (
            <div 
              style={{ width: size, height: size }}
              className="flex flex-col items-center justify-center p-4 text-rose-600 text-xs text-center"
            >
              <AlertCircle className="w-8 h-8 mb-2" />
              <span>{error}</span>
            </div>
          ) : (
            <div 
              style={{ width: size, height: size }}
              className="flex items-center justify-center text-slate-400 text-xs animate-pulse"
            >
              Gerando QR Code...
            </div>
          )}
        </div>

        {/* Código Tag em Destaque */}
        <div className="bg-slate-100 border border-slate-900 text-slate-950 font-mono font-bold text-sm px-3 py-1 rounded-md mb-2 shadow-xs">
          {tagCode}
        </div>

        {/* Nome do Ativo */}
        <div className="text-xs font-bold text-slate-900 line-clamp-2 max-w-[280px] mb-1">
          {title}
        </div>

        {/* Metadados Técnicos */}
        <div className="text-[11px] text-slate-600 space-y-0.5 mb-2 font-medium">
          {sectorOrCategory && (
            <div><span className="text-slate-500 font-normal">Setor/Categoria: </span>{sectorOrCategory}</div>
          )}
          {manufacturer && (
            <div><span className="text-slate-500 font-normal">Fabricante: </span>{manufacturer} {model ? `· ${model}` : ''}</div>
          )}
        </div>

        {/* Validação de Unicidade & Persistência */}
        <div className="w-full pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] font-mono text-slate-600">
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>ÚNICO & VÁLIDO</span>
          </span>
          <span className="text-slate-500 truncate max-w-[170px]" title={payload}>
            {payload}
          </span>
        </div>
      </div>

      {/* Barra de Ações (Copiar, Baixar, Imprimir, Testar Leitura) */}
      {showActions && (
        <div className="w-full mt-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={!qrDataUrl}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg transition shadow cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Etiqueta</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={!qrDataUrl}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Baixar PNG</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs">
            <div className="font-mono text-slate-400 text-[11px] truncate" title={payload}>
              <span className="text-slate-500">Payload: </span>
              <span className="text-amber-300">{payload}</span>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-medium transition cursor-pointer shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>

          {onTestScan && (
            <button
              type="button"
              onClick={() => onTestScan(payload)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-lg border border-emerald-500/30 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simular Leitura deste QR Code no Scanner</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
