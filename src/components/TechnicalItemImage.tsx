import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Maximize2, 
  X, 
  Layers, 
  RotateCcw, 
  ZoomIn, 
  Check, 
  Sparkles,
  Eye,
  FileCode,
  ShieldCheck
} from 'lucide-react';

interface TechnicalItemImageProps {
  src?: string;
  alt: string;
  category?: string;
  tagCode?: string;
  className?: string;
  aspectRatio?: '4/3' | '16/9' | 'square' | 'auto';
  showBlueprintToggle?: boolean;
  allowZoom?: boolean;
}

export function sanitizeImageUrl(url?: string): string {
  if (!url) return '';
  let cleaned = url.trim();
  if (cleaned.startsWith('/src/assets/images/')) {
    cleaned = cleaned.replace('/src/assets/images/', '/assets/images/');
  }
  return cleaned;
}

export const TechnicalItemImage: React.FC<TechnicalItemImageProps> = ({
  src,
  alt,
  category = '',
  tagCode = '',
  className = '',
  aspectRatio = '4/3',
  showBlueprintToggle = true,
  allowZoom = true
}) => {
  const normalizedSrc = sanitizeImageUrl(src);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(normalizedSrc));
  const [viewMode, setViewMode] = useState<'photo' | 'blueprint'>('photo');
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  useEffect(() => {
    setHasError(false);
    setIsLoading(Boolean(normalizedSrc));
    setViewMode('photo');
  }, [normalizedSrc]);

  // Determine which vector schematic best matches the component
  const getSchematicType = () => {
    const text = `${alt} ${category} ${tagCode}`.toLowerCase();
    if (text.includes('motor') || text.includes('motoredutor') || text.includes('mot-')) return 'motor';
    if (text.includes('inversor') || text.includes('inv-') || text.includes('driver')) return 'inversor';
    if (text.includes('válvula') || text.includes('valvula') || text.includes('solenoide') || text.includes('manifold') || text.includes('val-')) return 'valvula';
    if (text.includes('sensor') || text.includes('indutivo') || text.includes('proximidade') || text.includes('sen-')) return 'sensor';
    if (text.includes('rolamento') || text.includes('rol-') || text.includes('skf 22212')) return 'rolamento';
    if (text.includes('mancal') || text.includes('manc-') || text.includes('bipartido') || text.includes('graxeira') || text.includes('snl')) return 'mancal';
    if (text.includes('fita') || text.includes('esteira modular') || text.includes('fita-') || text.includes('correia')) return 'fita';
    if (text.includes('rolo') || text.includes('cilindro') || text.includes('rolo-') || text.includes('emborrachado')) return 'rolo';
    if (text.includes('bomba') || text.includes('hidrául') || text.includes('bom-')) return 'bomba';
    if (text.includes('disjuntor') || text.includes('chave') || text.includes('disj-') || text.includes('painel')) return 'disjuntor';
    if (text.includes('esteira') || text.includes('máquina') || text.includes('maquina') || text.includes('maq-')) return 'maquina';
    return 'generic';
  };

  const schematicType = getSchematicType();

  const renderSchematicSvg = () => {
    switch (schematicType) {
      case 'motor':
        return (
          <svg viewBox="0 0 400 300" className="w-full h-full text-amber-400/90" fill="none" stroke="currentColor">
            {/* Grid & Axis */}
            <defs>
              <pattern id="grid-pattern-m" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(245, 158, 11, 0.07)" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern-m)" />
            
            {/* Base Mount feet */}
            <path d="M 90 235 L 310 235 L 320 250 L 80 250 Z" strokeWidth="2.5" fill="rgba(30, 41, 59, 0.6)" />
            <circle cx="105" cy="242" r="3.5" fill="currentColor" />
            <circle cx="295" cy="242" r="3.5" fill="currentColor" />

            {/* Motor Cylindrical Casing with Cooling Fins */}
            <rect x="120" y="85" width="160" height="150" rx="8" strokeWidth="2.5" fill="rgba(15, 23, 42, 0.8)" />
            {[105, 120, 135, 150, 165, 180, 195, 210, 225].map(y => (
              <line key={y} x1="120" y1={y} x2="280" y2={y} strokeWidth="1.2" strokeDasharray="3 2" className="text-amber-500/50" />
            ))}

            {/* Terminal Connection Box on Top */}
            <rect x="165" y="45" width="70" height="40" rx="4" strokeWidth="2" fill="rgba(30, 41, 59, 0.9)" />
            <circle cx="200" cy="65" r="7" strokeWidth="1.5" />
            <text x="200" y="68" fontSize="6" fontFamily="monospace" textAnchor="middle" fill="currentColor" stroke="none">U-V-W</text>

            {/* Output Shaft & Keyway */}
            <rect x="280" y="140" width="70" height="40" rx="2" strokeWidth="2" fill="rgba(51, 65, 85, 0.8)" />
            <rect x="300" y="145" width="30" height="8" strokeWidth="1.5" className="text-amber-300" fill="currentColor" />
            <text x="315" y="152" fontSize="5" fontFamily="monospace" textAnchor="middle" fill="#0f172a" stroke="none">CHAVETA</text>

            {/* Rear Fan Cowl */}
            <path d="M 120 95 C 80 115 80 205 120 225 Z" strokeWidth="2" fill="rgba(30, 41, 59, 0.7)" />
            <line x1="100" y1="120" x2="100" y2="200" strokeWidth="1.5" strokeDasharray="4 3" />

            {/* Dimension Indicators */}
            <path d="M 60 85 L 60 235" strokeWidth="1" strokeDasharray="2 2" className="text-slate-500" />
            <text x="50" y="165" fontSize="8" fontFamily="monospace" textAnchor="middle" fill="#94a3b8" stroke="none" transform="rotate(-90 50 165)">Ø CARCAÇA</text>

            {/* Badges */}
            <text x="200" y="275" fontSize="10" fontFamily="monospace" textAnchor="middle" fill="#f59e0b" stroke="none" fontWeight="bold">
              ESQUEMA TÉCNICO: MOTOR TRIFÁSICO IE3 (10CV)
            </text>
          </svg>
        );

      case 'inversor':
        return (
          <svg viewBox="0 0 400 300" className="w-full h-full text-sky-400" fill="none" stroke="currentColor">
            <rect width="100%" height="100%" fill="rgba(15, 23, 42, 0.6)" />
            {/* Inverter Outer Chassis */}
            <rect x="130" y="30" width="140" height="230" rx="8" strokeWidth="2.5" fill="rgba(30, 41, 59, 0.7)" />
            
            {/* Operator Display Panel (IOP-2) */}
            <rect x="150" y="50" width="100" height="65" rx="4" strokeWidth="2" fill="rgba(2, 6, 23, 0.9)" />
            <text x="200" y="75" fontSize="11" fontFamily="monospace" textAnchor="middle" fill="#38bdf8" stroke="none" fontWeight="bold">60.00 Hz</text>
            <text x="200" y="92" fontSize="8" fontFamily="monospace" textAnchor="middle" fill="#4ade80" stroke="none">RUN · 1765 RPM</text>
            <text x="200" y="105" fontSize="7" fontFamily="monospace" textAnchor="middle" fill="#94a3b8" stroke="none">SINAMICS G120C</text>

            {/* Navigation Wheel & Buttons */}
            <circle cx="200" cy="145" r="18" strokeWidth="2" fill="rgba(51, 65, 85, 0.7)" />
            <circle cx="200" cy="145" r="6" fill="#38bdf8" />
            <circle cx="160" cy="145" r="5" strokeWidth="1.5" className="text-emerald-400" />
            <circle cx="240" cy="145" r="5" strokeWidth="1.5" className="text-rose-400" />

            {/* Terminal Blocks Bottom */}
            <rect x="145" y="185" width="110" height="35" rx="3" strokeWidth="1.5" fill="rgba(15, 23, 42, 0.9)" />
            <text x="200" y="200" fontSize="7" fontFamily="monospace" textAnchor="middle" fill="#f59e0b" stroke="none">L1 L2 L3 | U V W</text>
            <text x="200" y="212" fontSize="6.5" fontFamily="monospace" textAnchor="middle" fill="#94a3b8" stroke="none">PROFINET / STO SIL2</text>

            {/* Heat Sink Ventilation Slots */}
            {[230, 238, 246].map(y => (
              <line key={y} x1="145" y1={y} x2="255" y2={y} strokeWidth="1.5" className="text-slate-500" />
            ))}

            <text x="200" y="280" fontSize="10" fontFamily="monospace" textAnchor="middle" fill="#38bdf8" stroke="none" fontWeight="bold">
              ESQUEMA TÉCNICO: INVERSOR VETORIAL 400V
            </text>
          </svg>
        );

      case 'rolamento':
        return (
          <svg viewBox="0 0 400 300" className="w-full h-full text-emerald-400" fill="none" stroke="currentColor">
            <rect width="100%" height="100%" fill="rgba(15, 23, 42, 0.6)" />
            
            {/* Outer Ring */}
            <circle cx="200" cy="145" r="105" strokeWidth="4" className="text-emerald-500" fill="rgba(30, 41, 59, 0.3)" />
            <circle cx="200" cy="145" r="90" strokeWidth="2" strokeDasharray="4 2" className="text-emerald-400/60" />
            
            {/* W33 Lubrication Hole & Groove on Outer Ring */}
            <circle cx="200" cy="40" r="3.5" fill="#f59e0b" stroke="none" />
            <text x="200" y="32" fontSize="7" fontFamily="monospace" textAnchor="middle" fill="#f59e0b" stroke="none">W33 LUBRIFICAÇÃO</text>

            {/* Inner Ring with Tapered Bore */}
            <circle cx="200" cy="145" r="55" strokeWidth="3" className="text-emerald-400" />
            <circle cx="200" cy="145" r="42" strokeWidth="2.5" className="text-amber-400" fill="rgba(15, 23, 42, 0.9)" />
            <text x="200" y="148" fontSize="8" fontFamily="monospace" textAnchor="middle" fill="#cbd5e1" stroke="none" fontWeight="bold">Ø 60mm (1:12)</text>

            {/* Dual Rows of Spherical Rollers (Autocompensador) */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(angle => {
              const rad = (angle * Math.PI) / 180;
              const cx = 200 + Math.cos(rad) * 72;
              const cy = 145 + Math.sin(rad) * 72;
              return (
                <ellipse
                  key={angle}
                  cx={cx}
                  cy={cy}
                  rx="10"
                  ry="7"
                  transform={`rotate(${angle} ${cx} ${cy})`}
                  strokeWidth="1.8"
                  fill="rgba(52, 211, 153, 0.25)"
                  className="text-emerald-300"
                />
              );
            })}

            <text x="200" y="278" fontSize="10" fontFamily="monospace" textAnchor="middle" fill="#34d399" stroke="none" fontWeight="bold">
              ESQUEMA: ROLAMENTO AUTOCOMPENSADOR SKF 22212 EK
            </text>
          </svg>
        );

      case 'mancal':
        return (
          <svg viewBox="0 0 400 300" className="w-full h-full text-amber-400" fill="none" stroke="currentColor">
            <rect width="100%" height="100%" fill="rgba(15, 23, 42, 0.6)" />

            {/* Base Footing with Bolt Holes */}
            <path d="M 60 230 L 340 230 L 350 250 L 50 250 Z" strokeWidth="2.5" fill="rgba(30, 41, 59, 0.7)" />
            <circle cx="80" cy="240" r="5" strokeWidth="2" fill="#0f172a" />
            <circle cx="320" cy="240" r="5" strokeWidth="2" fill="#0f172a" />
            <text x="80" y="262" fontSize="6.5" fontFamily="monospace" textAnchor="middle" fill="#94a3b8" stroke="none">FURO M16</text>
            <text x="320" y="262" fontSize="6.5" fontFamily="monospace" textAnchor="middle" fill="#94a3b8" stroke="none">FURO M16</text>

            {/* Split Pillow Block Housing (SNL 512) */}
            <path d="M 90 230 C 90 120 130 90 200 90 C 270 90 310 120 310 230 Z" strokeWidth="2.5" fill="rgba(15, 23, 42, 0.85)" />

            {/* Split Line between Upper and Lower Half */}
            <line x1="88" y1="160" x2="312" y2="160" strokeWidth="1.5" strokeDasharray="4 2" className="text-amber-500" />
            <text x="325" y="163" fontSize="6" fontFamily="monospace" fill="#f59e0b" stroke="none">BIPARTIDO</text>

            {/* Top Grease Zerk Nipple (Graxeira M10) */}
            <rect x="195" y="60" width="10" height="20" rx="2" strokeWidth="2" fill="#f59e0b" className="text-amber-500" />
            <circle cx="200" cy="55" r="4.5" fill="#f59e0b" strokeWidth="1.5" />
            <text x="200" y="45" fontSize="7.5" fontFamily="monospace" textAnchor="middle" fill="#fbbf24" stroke="none" fontWeight="bold">GRAXEIRA M10x1</text>

            {/* Center Bearing Bore & Shaft Hole */}
            <circle cx="200" cy="160" r="50" strokeWidth="2.5" fill="rgba(30, 41, 59, 0.7)" />
            <circle cx="200" cy="160" r="30" strokeWidth="2" strokeDasharray="3 3" fill="rgba(2, 6, 23, 0.9)" />
            <text x="200" y="163" fontSize="8" fontFamily="monospace" textAnchor="middle" fill="#f8fafc" stroke="none">EIXO Ø 55mm</text>

            <text x="200" y="280" fontSize="10" fontFamily="monospace" textAnchor="middle" fill="#f59e0b" stroke="none" fontWeight="bold">
              ESQUEMA TÉCNICO: MANCAL BIPARTIDO SKF SNL 512
            </text>
          </svg>
        );

      case 'fita':
        return (
          <svg viewBox="0 0 400 300" className="w-full h-full text-indigo-400" fill="none" stroke="currentColor">
            <rect width="100%" height="100%" fill="rgba(15, 23, 42, 0.6)" />

            {/* Modular Conveyor Belt Links (Flat Top 2" Acetal) */}
            <g transform="translate(40, 60)">
              {[0, 1, 2, 3].map(row => (
                <g key={row} transform={`translate(0, ${row * 38})`}>
                  {[0, 1, 2, 3, 4].map(col => {
                    const offset = row % 2 === 0 ? 0 : 32;
                    return (
                      <g key={col} transform={`translate(${col * 64 + offset}, 0)`}>
                        <rect x="0" y="0" width="58" height="30" rx="4" strokeWidth="2" fill="rgba(30, 41, 59, 0.7)" />
                        <line x1="8" y1="15" x2="50" y2="15" strokeWidth="1" strokeDasharray="2 2" className="text-indigo-300/40" />
                        <circle cx="4" cy="15" r="2.5" fill="#a5b4fc" />
                        <circle cx="54" cy="15" r="2.5" fill="#a5b4fc" />
                      </g>
                    );
                  })}
                </g>
              ))}

              {/* Hinge Pin Indicator */}
              <line x1="-15" y1="15" x2="335" y2="15" strokeWidth="1.5" strokeDasharray="5 3" className="text-amber-400" />
              <text x="160" y="-10" fontSize="7.5" fontFamily="monospace" textAnchor="middle" fill="#fbbf24" stroke="none">
                PINO DE RETENÇÃO PBT / PASSO 50.8mm (2")
              </text>
            </g>

            {/* Drive Sprocket Outline */}
            <path d="M 60 230 L 340 230" strokeWidth="2" className="text-slate-500" strokeDasharray="4 4" />
            <text x="200" y="278" fontSize="10" fontFamily="monospace" textAnchor="middle" fill="#818cf8" stroke="none" fontWeight="bold">
              ESQUEMA: FITA MODULAR TERMOPLÁSTICA HABASIT M5010
            </text>
          </svg>
        );

      case 'rolo':
        return (
          <svg viewBox="0 0 400 300" className="w-full h-full text-teal-400" fill="none" stroke="currentColor">
            <rect width="100%" height="100%" fill="rgba(15, 23, 42, 0.6)" />

            {/* Central Axle Shaft */}
            <rect x="40" y="138" width="320" height="24" rx="2" strokeWidth="2" fill="rgba(51, 65, 85, 0.9)" />
            <rect x="40" y="142" width="25" height="16" strokeWidth="1.5" className="text-amber-400" />
            <text x="52" y="153" fontSize="5.5" fontFamily="monospace" textAnchor="middle" fill="#f59e0b" stroke="none">14mm</text>

            <rect x="335" y="142" width="25" height="16" strokeWidth="1.5" className="text-amber-400" />
            <text x="347" y="153" fontSize="5.5" fontFamily="monospace" textAnchor="middle" fill="#f59e0b" stroke="none">14mm</text>

            {/* Steel Tube Roller Body with Vulcanized Rubber Sleeve */}
            <rect x="75" y="90" width="250" height="120" rx="6" strokeWidth="3" fill="rgba(15, 23, 42, 0.85)" />
            
            {/* Rubber Coating Indicator */}
            <rect x="75" y="90" width="250" height="15" fill="rgba(20, 184, 166, 0.3)" />
            <rect x="75" y="195" width="250" height="15" fill="rgba(20, 184, 166, 0.3)" />
            <text x="200" y="102" fontSize="7" fontFamily="monospace" textAnchor="middle" fill="#2dd4bf" stroke="none">
              REVESTIMENTO BORRACHA NITRÍLICA (NBR 8mm)
            </text>

            {/* Internal 6204-2RS Bearings */}
            <rect x="90" y="125" width="20" height="50" rx="3" strokeWidth="1.5" fill="rgba(245, 158, 11, 0.2)" className="text-amber-400" />
            <rect x="290" y="125" width="20" height="50" rx="3" strokeWidth="1.5" fill="rgba(245, 158, 11, 0.2)" className="text-amber-400" />
            <text x="100" y="153" fontSize="6" fontFamily="monospace" textAnchor="middle" fill="#f59e0b" stroke="none">2RS</text>
            <text x="300" y="153" fontSize="6" fontFamily="monospace" textAnchor="middle" fill="#f59e0b" stroke="none">2RS</text>

            <text x="200" y="165" fontSize="11" fontFamily="monospace" textAnchor="middle" fill="#f8fafc" stroke="none" fontWeight="bold">
              Ø 89 mm · L = 650 mm
            </text>

            <text x="200" y="278" fontSize="10" fontFamily="monospace" textAnchor="middle" fill="#2dd4bf" stroke="none" fontWeight="bold">
              ESQUEMA TÉCNICO: ROLO DE CARGA EMBORRACHADO
            </text>
          </svg>
        );

      case 'sensor':
        return (
          <svg viewBox="0 0 400 300" className="w-full h-full text-amber-400" fill="none" stroke="currentColor">
            <rect width="100%" height="100%" fill="rgba(15, 23, 42, 0.6)" />

            {/* M12 Threaded Brass Cylinder */}
            <rect x="90" y="120" width="180" height="60" rx="4" strokeWidth="2.5" fill="rgba(30, 41, 59, 0.7)" />
            {[105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255].map(x => (
              <line key={x} x1={x} y1="120" x2={x} y2="180" strokeWidth="1" strokeDasharray="3 2" className="text-amber-500/50" />
            ))}

            {/* Active Sensing Face (Frontal PPS) */}
            <rect x="270" y="120" width="25" height="60" rx="2" strokeWidth="2.5" fill="#f59e0b" className="text-amber-500" />
            <text x="282" y="153" fontSize="6.5" fontFamily="monospace" textAnchor="middle" fill="#0f172a" stroke="none" fontWeight="bold">Sn 4mm</text>

            {/* Dual Locknuts */}
            <rect x="140" y="110" width="20" height="80" rx="2" strokeWidth="2" fill="rgba(71, 85, 105, 0.8)" />
            <rect x="210" y="110" width="20" height="80" rx="2" strokeWidth="2" fill="rgba(71, 85, 105, 0.8)" />

            {/* 360° Amber Status LED Ring */}
            <rect x="80" y="120" width="10" height="60" rx="2" strokeWidth="2" fill="#fbbf24" className="text-amber-400" />

            {/* Industrial PVC Cable */}
            <path d="M 80 150 C 40 150 40 220 30 240" strokeWidth="6" strokeLinecap="round" className="text-slate-600" />
            <text x="80" y="220" fontSize="7.5" fontFamily="monospace" fill="#94a3b8" stroke="none">MARROM (+24V) · AZUL (0V) · PRETO (PNP NA)</text>

            <text x="200" y="278" fontSize="10" fontFamily="monospace" textAnchor="middle" fill="#f59e0b" stroke="none" fontWeight="bold">
              ESQUEMA: SENSOR INDUTIVO M12 PNP NA (IP68)
            </text>
          </svg>
        );

      case 'valvula':
        return (
          <svg viewBox="0 0 400 300" className="w-full h-full text-cyan-400" fill="none" stroke="currentColor">
            <rect width="100%" height="100%" fill="rgba(15, 23, 42, 0.6)" />

            {/* Valve Manifold Block */}
            <rect x="100" y="90" width="200" height="130" rx="6" strokeWidth="2.5" fill="rgba(30, 41, 59, 0.75)" />
            
            {/* Valve Slices */}
            {[140, 180, 220, 260].map(x => (
              <line key={x} x1={x} y1="90" x2={x} y2="220" strokeWidth="1.2" strokeDasharray="4 2" className="text-cyan-500/40" />
            ))}

            {/* 24V Solenoid Coils with Pilot LEDs on Top */}
            {[120, 160, 200, 240, 280].map((x, i) => (
              <g key={i}>
                <rect x={x - 12} y="55" width="24" height="35" rx="3" strokeWidth="1.5" fill="rgba(15, 23, 42, 0.9)" />
                <circle cx={x} cy="70" r="3.5" fill="#38bdf8" />
              </g>
            ))}

            {/* Pneumatic Push-in Quick Fittings (QS 6mm) */}
            {[120, 160, 200, 240, 280].map((x, i) => (
              <g key={i}>
                <rect x={x - 8} y="220" width="16" height="20" rx="2" strokeWidth="1.5" fill="rgba(51, 65, 85, 0.9)" />
                <text x={x} y="233" fontSize="5.5" fontFamily="monospace" textAnchor="middle" fill="#06b6d4" stroke="none">QS6</text>
              </g>
            ))}

            {/* Sub-D 25 Multi-pin Electrical Connector */}
            <rect x="50" y="130" width="50" height="50" rx="4" strokeWidth="2" fill="rgba(15, 23, 42, 0.9)" />
            <text x="75" y="158" fontSize="6.5" fontFamily="monospace" textAnchor="middle" fill="#f59e0b" stroke="none">SUB-D 25</text>

            <text x="200" y="278" fontSize="10" fontFamily="monospace" textAnchor="middle" fill="#22d3ee" stroke="none" fontWeight="bold">
              ESQUEMA: BLOCO MANIFOLD FESTO VTUG 5/2 VIAS (24VCC)
            </text>
          </svg>
        );

      case 'bomba':
        return (
          <svg viewBox="0 0 400 300" className="w-full h-full text-orange-400" fill="none" stroke="currentColor">
            <rect width="100%" height="100%" fill="rgba(15, 23, 42, 0.6)" />

            {/* Hydraulic Vane Pump Housing */}
            <circle cx="200" cy="140" r="80" strokeWidth="3" fill="rgba(30, 41, 59, 0.75)" />
            <circle cx="200" cy="140" r="50" strokeWidth="2" strokeDasharray="4 2" fill="rgba(15, 23, 42, 0.9)" />

            {/* Pressure Compensator Valve Adjuster */}
            <rect x="185" y="20" width="30" height="40" rx="3" strokeWidth="2" fill="rgba(71, 85, 105, 0.9)" />
            <line x1="200" y1="10" x2="200" y2="20" strokeWidth="3" className="text-amber-400" />
            <text x="200" y="42" fontSize="6.5" fontFamily="monospace" textAnchor="middle" fill="#fbbf24" stroke="none">COMPENSADOR</text>

            {/* SAE Flanges: Suction & Pressure */}
            <rect x="60" y="125" width="60" height="30" rx="3" strokeWidth="2" fill="rgba(51, 65, 85, 0.9)" />
            <text x="90" y="143" fontSize="6.5" fontFamily="monospace" textAnchor="middle" fill="#fdba74" stroke="none">SUCÇÃO 1.1/4"</text>

            <rect x="280" y="125" width="60" height="30" rx="3" strokeWidth="2" fill="rgba(51, 65, 85, 0.9)" />
            <text x="310" y="143" fontSize="6.5" fontFamily="monospace" textAnchor="middle" fill="#fdba74" stroke="none">PRESSÃO 3/4"</text>

            {/* Shaft */}
            <circle cx="200" cy="140" r="18" strokeWidth="2" fill="#0f172a" />
            <text x="200" y="143" fontSize="6" fontFamily="monospace" textAnchor="middle" fill="#f8fafc" stroke="none">EIXO</text>

            <text x="200" y="278" fontSize="10" fontFamily="monospace" textAnchor="middle" fill="#fb923c" stroke="none" fontWeight="bold">
              ESQUEMA: BOMBA HIDRÁULICA DE PALHETAS PARKER PV7
            </text>
          </svg>
        );

      case 'disjuntor':
        return (
          <svg viewBox="0 0 400 300" className="w-full h-full text-rose-400" fill="none" stroke="currentColor">
            <rect width="100%" height="100%" fill="rgba(15, 23, 42, 0.6)" />

            {/* DIN Rail Enclosure (TeSys GV2) */}
            <rect x="135" y="35" width="130" height="220" rx="6" strokeWidth="2.5" fill="rgba(30, 41, 59, 0.8)" />

            {/* Line Terminals Top (1/L1, 3/L2, 5/L3) */}
            <rect x="145" y="45" width="110" height="25" rx="3" strokeWidth="1.5" fill="rgba(15, 23, 42, 0.9)" />
            <text x="200" y="61" fontSize="7" fontFamily="monospace" textAnchor="middle" fill="#94a3b8" stroke="none">1/L1 · 3/L2 · 5/L3</text>

            {/* Push / Rocker Buttons I / O */}
            <rect x="155" y="90" width="40" height="30" rx="3" strokeWidth="2" fill="#15803d" className="text-emerald-400" />
            <text x="175" y="110" fontSize="14" fontFamily="monospace" textAnchor="middle" fill="#ffffff" stroke="none" fontWeight="bold">I</text>

            <rect x="205" y="90" width="40" height="30" rx="3" strokeWidth="2" fill="#991b1b" className="text-rose-400" />
            <text x="225" y="110" fontSize="14" fontFamily="monospace" textAnchor="middle" fill="#ffffff" stroke="none" fontWeight="bold">O</text>

            {/* Thermal Current Adjustment Dial */}
            <circle cx="200" cy="160" r="22" strokeWidth="2" fill="rgba(15, 23, 42, 0.9)" />
            <circle cx="200" cy="160" r="6" fill="#f59e0b" />
            <text x="200" y="195" fontSize="7" fontFamily="monospace" textAnchor="middle" fill="#f59e0b" stroke="none">10...16A REGULÁVEL</text>

            {/* Load Terminals Bottom (2/T1, 4/T2, 6/T3) */}
            <rect x="145" y="215" width="110" height="25" rx="3" strokeWidth="1.5" fill="rgba(15, 23, 42, 0.9)" />
            <text x="200" y="231" fontSize="7" fontFamily="monospace" textAnchor="middle" fill="#94a3b8" stroke="none">2/T1 · 4/T2 · 6/T3</text>

            <text x="200" y="280" fontSize="10" fontFamily="monospace" textAnchor="middle" fill="#f43f5e" stroke="none" fontWeight="bold">
              ESQUEMA: DISJUNTOR-MOTOR TRIPOLAR (10-16A)
            </text>
          </svg>
        );

      case 'maquina':
      default:
        return (
          <svg viewBox="0 0 400 300" className="w-full h-full text-amber-400" fill="none" stroke="currentColor">
            <rect width="100%" height="100%" fill="rgba(15, 23, 42, 0.6)" />
            
            {/* Grid Drafting lines */}
            <defs>
              <pattern id="grid-pattern-gen" width="25" height="25" patternUnits="userSpaceOnUse">
                <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(245, 158, 11, 0.08)" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern-gen)" />

            {/* Conveyor / Machine Framework */}
            <path d="M 50 140 L 350 140" strokeWidth="4" className="text-amber-500" />
            <path d="M 50 170 L 350 170" strokeWidth="3" className="text-slate-600" />
            
            {/* Head Drum & Tail Drum */}
            <circle cx="65" cy="155" r="22" strokeWidth="3" fill="rgba(30, 41, 59, 0.8)" />
            <circle cx="335" cy="155" r="22" strokeWidth="3" fill="rgba(30, 41, 59, 0.8)" />

            {/* Support Legs with Levelers */}
            {[100, 200, 300].map(x => (
              <g key={x}>
                <line x1={x} y1="170" x2={x} y2="245" strokeWidth="3" className="text-slate-500" />
                <rect x={x - 12} y="245" width="24" height="8" rx="2" strokeWidth="1.5" fill="currentColor" />
              </g>
            ))}

            {/* Motor Drive Mount at Head */}
            <rect x="40" y="80" width="50" height="45" rx="4" strokeWidth="2" fill="rgba(245, 158, 11, 0.2)" />
            <text x="65" y="105" fontSize="6.5" fontFamily="monospace" textAnchor="middle" fill="#fbbf24" stroke="none">MOTOR</text>

            <text x="200" y="278" fontSize="10" fontFamily="monospace" textAnchor="middle" fill="#f59e0b" stroke="none" fontWeight="bold">
              ESQUEMA MECÂNICO: SISTEMA INDUSTRIAL HOMOLOGADO
            </text>
          </svg>
        );
    }
  };

  const isShowingPhoto = Boolean(normalizedSrc && !hasError && viewMode === 'photo');

  return (
    <>
      <div 
        className={`relative w-full bg-slate-950 overflow-hidden select-none group/img ${
          aspectRatio === '4/3' ? 'aspect-[4/3]' : 
          aspectRatio === '16/9' ? 'aspect-video' : 
          aspectRatio === 'square' ? 'aspect-square' : ''
        } ${className}`}
      >
        {/* Actual Image if Available */}
        {normalizedSrc && !hasError ? (
          <>
            <img
              src={normalizedSrc}
              alt={alt}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setHasError(true);
                setIsLoading(false);
              }}
              className={`w-full h-full object-cover transition-all duration-300 ${
                viewMode === 'blueprint' ? 'hidden' : 'block'
              } ${isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100 group-hover/img:scale-105'}`}
            />

            {/* Loading Skeleton */}
            {isLoading && (
              <div className="absolute inset-0 bg-slate-900 animate-pulse flex flex-col items-center justify-center p-4">
                <Cpu className="w-8 h-8 text-slate-700 animate-bounce mb-2" />
                <span className="text-[10px] font-mono text-slate-500">Carregando imagem técnica...</span>
              </div>
            )}
          </>
        ) : null}

        {/* Vector Schematic Fallback (Rendered if no image, error loading, or user switched to blueprint) */}
        {!isShowingPhoto && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {renderSchematicSvg()}
          </div>
        )}

        {/* Quiet Kicker Overlay: Visual Badge */}
        <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 px-2 py-0.5 bg-slate-950/85 backdrop-blur-md rounded border border-slate-800 text-[10px] font-mono pointer-events-none">
          {isShowingPhoto ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Foto Homologada</span>
            </span>
          ) : (
            <span className="text-amber-400 flex items-center gap-1">
              <FileCode className="w-3 h-3 text-amber-400" />
              <span>Esquema Ilustrativo</span>
            </span>
          )}
        </div>

        {/* Action Controls on Card (Toggle blueprint / Fullscreen zoom) */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-90 group-hover/img:opacity-100 transition-opacity">
          {showBlueprintToggle && normalizedSrc && !hasError && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setViewMode(prev => prev === 'photo' ? 'blueprint' : 'photo');
              }}
              title={viewMode === 'photo' ? 'Ver Esquema Técnico' : 'Ver Foto'}
              className="p-1.5 bg-slate-950/90 hover:bg-slate-800 text-slate-300 hover:text-amber-400 rounded border border-slate-800 backdrop-blur-sm transition cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          )}

          {allowZoom && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsZoomOpen(true);
              }}
              title="Expandir Imagem Técnica"
              className="p-1.5 bg-slate-950/90 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-800 backdrop-blur-sm transition cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen Mobile Zoom Modal */}
      {isZoomOpen && (
        <div 
          onClick={() => setIsZoomOpen(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {tagCode || 'DETALHE TÉCNICO'}
                </span>
                <span className="text-xs text-white font-semibold truncate max-w-md">
                  {alt}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {normalizedSrc && !hasError && (
                  <button
                    onClick={() => setViewMode(prev => prev === 'photo' ? 'blueprint' : 'photo')}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
                  >
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>{viewMode === 'photo' ? 'Ver Desenho' : 'Ver Foto'}</span>
                  </button>
                )}
                <button
                  onClick={() => setIsZoomOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-4 overflow-auto flex items-center justify-center bg-black/50 min-h-[300px]">
              {isShowingPhoto && viewMode === 'photo' ? (
                <img
                  src={normalizedSrc}
                  alt={alt}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                />
              ) : (
                <div className="w-full max-w-2xl aspect-[4/3] rounded-xl overflow-hidden border border-slate-800">
                  {renderSchematicSvg()}
                </div>
              )}
            </div>

            {/* Modal Footer Note */}
            <div className="p-3 border-t border-slate-800 bg-slate-950 text-center text-xs text-slate-400 font-mono">
              Visualização Técnica Industrial · IFTA Informações Técnicas & Aplicação
            </div>
          </div>
        </div>
      )}
    </>
  );
};
