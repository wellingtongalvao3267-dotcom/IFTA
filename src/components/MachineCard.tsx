import React from 'react';
import { Cog, Wrench, Zap, Shield, ChevronRight, QrCode, Layers, Ruler, MapPin } from 'lucide-react';
import { MachineItem, ComponentItem, UserRole } from '../types';
import { TechnicalItemImage } from './TechnicalItemImage';

interface MachineCardProps {
  machine: MachineItem;
  allComponents: ComponentItem[];
  userRole: UserRole;
  onSelect: (machine: MachineItem) => void;
  onOpenQr: (machine: MachineItem) => void;
}

export const MachineCard: React.FC<MachineCardProps> = ({
  machine,
  allComponents,
  userRole,
  onSelect,
  onOpenQr
}) => {
  // Filter linked components visible to the current role (safe check)
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

  const totalLinked = links.length;

  return (
    <div className="group relative bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl overflow-hidden shadow-lg transition-all duration-200 flex flex-col justify-between hover:shadow-amber-500/5">
      {/* Illustrative Image Banner */}
      <div 
        onClick={() => onSelect(machine)}
        className="relative w-full border-b border-slate-800/80 bg-slate-950 overflow-hidden cursor-pointer"
      >
        <TechnicalItemImage
          src={machine.imageUrl}
          alt={machine.name}
          category="Máquina Industrial"
          tagCode={machine.tagCode}
          aspectRatio="16/9"
          showBlueprintToggle={true}
          allowZoom={false}
        />
      </div>

      {/* Top Banner & Tag */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/60">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Cog className="w-4 h-4 animate-spin-slow" />
            </span>
            <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 tracking-wider">
              {machine.tagCode}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenQr(machine);
              }}
              title="Ver QR Code da Máquina"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 border border-slate-700 transition"
            >
              <QrCode className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {machine.status || 'OPERACIONAL'}
            </span>
          </div>
        </div>

        <h3 
          onClick={() => onSelect(machine)}
          className="text-base font-bold text-white group-hover:text-amber-400 transition cursor-pointer line-clamp-1"
        >
          {machine.name}
        </h3>

        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="line-clamp-1">{machine.sector}</span>
        </div>
      </div>

      {/* Body & Technical Highlights */}
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
          {machine.description}
        </p>

        {/* Dimensions info */}
        {machine.dimensions && (
          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start gap-2 text-xs">
            <Ruler className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-semibold">
                Dimensões Técnicas
              </span>
              <span className="text-slate-200 font-mono text-[11px] line-clamp-2">
                {machine.dimensions}
              </span>
            </div>
          </div>
        )}

        {/* Role-Specific Linked Components Indicator */}
        <div className="pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1 text-[11px]">
              <Layers className="w-3 h-3 text-slate-400" />
              <span>Itens vinculados:</span>
            </span>
            <span className="font-mono font-semibold text-white text-[11px]">
              {userRole === 'CDI' || userRole === 'DESENVOLVEDOR' ? (
                <span>{totalLinked} componentes</span>
              ) : (
                <span className="text-amber-400">
                  {visibleLinked.length} de {totalLinked} liberados ({userRole})
                </span>
              )}
            </span>
          </div>

          {/* Mini tags of items visible */}
          <div className="flex flex-wrap gap-1 mt-1">
            {visibleLinked.slice(0, 3).map(link => {
              const comp = allComponents.find(c => 
                c.id === link.componentId || 
                c.tagCode.toUpperCase() === link.componentId.toUpperCase() ||
                c.id.toLowerCase() === link.componentId.toLowerCase()
              );
              return (
                <span
                  key={link.componentId}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700/60 truncate max-w-[150px]"
                  title={comp ? comp.name : link.componentId}
                >
                  {comp ? comp.name.split(' ')[0] : 'Item'} ({comp ? comp.tagCode : link.componentId})
                </span>
              );
            })}
            {visibleLinked.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400 font-mono">
                +{visibleLinked.length - 3} mais
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="p-3 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          {userRole === 'MECANICA' && (
            <span className="flex items-center gap-1 text-sky-400">
              <Wrench className="w-3 h-3" /> Mecânica
            </span>
          )}
          {userRole === 'ELETRICA' && (
            <span className="flex items-center gap-1 text-amber-400">
              <Zap className="w-3 h-3" /> Elétrica
            </span>
          )}
          {(userRole === 'CDI' || userRole === 'DESENVOLVEDOR') && (
            <span className="flex items-center gap-1 text-emerald-400">
              <Shield className="w-3 h-3" /> CDI
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onSelect(machine)}
          className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 text-amber-400 text-xs font-semibold rounded-lg transition border border-amber-500/30 cursor-pointer"
        >
          <span>Acessar Máquina</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
