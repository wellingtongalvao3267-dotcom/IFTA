import React from 'react';
import { FileText, ExternalLink, QrCode } from 'lucide-react';
import { ComponentItem } from '../types';
import { TechnicalItemImage } from './TechnicalItemImage';

interface ComponentCardProps {
  component: ComponentItem;
  onSelect: (component: ComponentItem) => void;
  onOpenQr: (component: ComponentItem) => void;
}

export const ComponentCard: React.FC<ComponentCardProps> = ({
  component,
  onSelect,
  onOpenQr
}) => {
  return (
    <div 
      onClick={() => onSelect(component)}
      className="group bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/5 flex flex-col justify-between"
    >
      <div>
        {/* Top Image Container with Guaranteed Mobile Technical Fallback */}
        <div className="relative w-full border-b border-slate-800/80 bg-slate-950 overflow-hidden">
          <TechnicalItemImage
            src={component.imageUrl}
            alt={component.name}
            category={component.category}
            tagCode={component.tagCode}
            aspectRatio="4/3"
            showBlueprintToggle={true}
            allowZoom={false}
          />

          {/* Quiet Tag Kicker overlay */}
          <div className="absolute top-2.5 left-2.5 z-20 px-2 py-1 bg-slate-950/90 backdrop-blur-sm border border-slate-800 rounded text-[11px] font-mono text-amber-300 shadow-sm pointer-events-none">
            {component.tagCode}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenQr(component);
            }}
            title="Ver QR Code da Peça"
            className="absolute top-2.5 right-2.5 z-20 p-1.5 bg-slate-950/90 hover:bg-amber-500 hover:text-slate-950 text-slate-300 rounded border border-slate-800 transition shadow-sm cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card Body */}
        <div className="p-4">
          {/* Metadata line without pills (Rule 1A Zero-Pill) */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
            <span className="font-medium text-slate-300">{component.category}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{component.manufacturer}</span>
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors line-clamp-2 mb-2 leading-snug">
            {component.name}
          </h3>

          {/* Short Application description */}
          <p className="text-xs text-slate-400 line-clamp-2 mb-3">
            {component.application || component.description}
          </p>

          {/* Key Specs Preview (Tabular numbers) */}
          {component.specs && component.specs.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-800/80 font-mono text-[11px]">
              {component.specs.slice(0, 2).map((spec, i) => (
                <div key={i} className="truncate">
                  <span className="text-slate-500 block text-[10px] uppercase">{spec.label}</span>
                  <span className="text-slate-200 tabular-nums font-medium">{spec.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="px-4 py-2.5 border-t border-slate-800/80 bg-slate-950/50 flex items-center justify-between text-xs text-slate-400 group-hover:text-amber-400 transition-colors">
        <span className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          <span>Ficha Técnica, Esquemas & Manual</span>
        </span>
        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
      </div>
    </div>
  );
};
