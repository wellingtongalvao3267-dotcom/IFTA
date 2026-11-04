import React, { useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck, Cpu } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onFinish, 300);
          return 100;
        }
        return prev + 4;
      });
    }, 60);

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-6 select-none">
      {/* Background blueprint subtle grid */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(148, 163, 184, 0.25) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      <div className="relative z-10 max-w-2xl w-full flex flex-col items-center justify-center text-center my-auto">
        {/* Logo Image - Enlarged, Centered and Edge-to-Edge */}
        <div className="relative mb-6 rounded-3xl overflow-hidden border border-slate-700/70 shadow-2xl shadow-indigo-900/40 w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-[540px] aspect-square mx-auto">
          <img
            src="/assets/aistudio/logo_afta_c1e6655b.jpeg"
            alt="IFTA Informações Técnicas e Aplicação - Bello Alimentos"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-3xl pointer-events-none" />
        </div>

        {/* Developer Credit Requested in Prompt */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs md:text-sm text-slate-300 mb-6 shadow-lg">
          <Cpu className="w-4 h-4 text-amber-400" />
          <span>Desenvolvido por: <strong className="text-amber-300 font-semibold">Wellington Galvão</strong></span>
        </div>

        {/* Progress Bar & Skip Button */}
        <div className="w-full max-w-xs flex flex-col items-center gap-3">
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <button
            onClick={onFinish}
            className="mt-3 flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 active:scale-[0.98] rounded-lg transition shadow-md shadow-amber-500/20 whitespace-nowrap"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Acessar Tela de Login</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Subtle bottom note */}
      <div className="absolute bottom-6 text-xs text-slate-500 font-mono">
        IFTA SYSTEM · V2.6 INDUSTRIAL · 2026
      </div>
    </div>
  );
};
