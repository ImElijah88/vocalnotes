import React from 'react';
import { X } from 'lucide-react';

interface OnboardingHintProps {
  message: string;
  onDismiss: () => void;
}

const OnboardingHint: React.FC<OnboardingHintProps> = ({ message, onDismiss }) => {
  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1500] animate-in zoom-in-95 fade-in duration-500">
      <div className="bg-black/95 backdrop-blur-2xl border border-cyan-500/40 rounded-3xl p-8 max-w-sm shadow-[0_0_60px_rgba(0,255,255,0.3)] relative">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
        >
          <X size={18} />
        </button>
        
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-cyan-500/10 border-2 border-cyan-500/30 flex items-center justify-center">
            <span className="text-3xl">👆</span>
          </div>
          
          <p className="text-white text-base font-bold leading-relaxed">
            {message}
          </p>
          
          <button
            onClick={onDismiss}
            className="mt-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg"
          >
            Got it
          </button>
        </div>
      </div>
      
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm -z-10" onClick={onDismiss} />
    </div>
  );
};

export default OnboardingHint;
