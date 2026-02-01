
import React from 'react';
import { X, Cpu, CreditCard, Clock, Info } from 'lucide-react';

interface GeminiInfoModalProps {
  onClose: () => void;
}

const GeminiInfoModal: React.FC<GeminiInfoModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-6 animate-in fade-in duration-300">
      <div className="max-w-xl w-full bg-[#0a0a0a] border border-white/10 rounded-[2rem] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-[44px] h-[44px] rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Info size={20} />
            </div>
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white leading-none">Gemini Intelligence</h2>
              <p className="text-[8px] text-gray-500 font-bold tracking-widest uppercase mt-1">System Architecture</p>
            </div>
          </div>
          <button onClick={onClose} className="w-[44px] h-[44px] flex items-center justify-center text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 overflow-y-auto max-h-[60vh] scrollbar-hide">
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-cyan-400">
              <Cpu size={18} />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Molecular Processing</h3>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">
              Utilizes the <span className="text-white font-bold">Gemini 3 Flash</span> model via Google AI Studio. Every second of audio is converted into high-fidelity tokens for real-time transcription and semantic refinement.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-cyan-400">
              <Clock size={18} />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Session Thresholds</h3>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">
              To maintain optimal context performance, sessions are capped at <span className="text-white font-bold">10 Minutes</span>. 
            </p>
            <ul className="grid grid-cols-2 gap-3">
              <li className="bg-white/5 p-3 rounded-xl border border-white/5">
                <div className="text-[8px] text-cyan-500 font-black uppercase mb-1">Marker</div>
                <div className="text-[10px] text-gray-400">Double-tone every 60s.</div>
              </li>
              <li className="bg-white/5 p-3 rounded-xl border border-white/5">
                <div className="text-[8px] text-red-500 font-black uppercase mb-1">Final 10s</div>
                <div className="text-[10px] text-gray-400">Rapid acoustic pips.</div>
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-cyan-400">
              <CreditCard size={18} />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Token Dynamics</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-end border-b border-white/5 pb-1">
                <span className="text-[9px] text-gray-500 uppercase tracking-widest">Inbound Audio</span>
                <span className="text-[10px] text-white font-bold">~48k Tokens/Min</span>
              </div>
              <p className="text-[8px] text-gray-600 italic">
                * Based on standard Google AI Studio billing parameters.
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 bg-black/20 border-t border-white/5">
          <button 
            onClick={onClose}
            className="w-full h-[44px] bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest text-[10px] rounded-xl transition-all active:scale-95 shadow-lg shadow-cyan-500/10"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeminiInfoModal;
