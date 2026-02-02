
import React from 'react';
import { Key, ExternalLink, Zap } from 'lucide-react';

interface ApiKeyDialogProps {
  onSelect: () => void;
}

const ApiKeyDialog: React.FC<ApiKeyDialogProps> = ({ onSelect }) => {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6">
      <div className="max-w-md w-full bg-[#0a0a0a] border border-cyan-500/30 rounded-3xl p-8 shadow-[0_0_100px_rgba(0,255,255,0.15)] flex flex-col items-center text-center gap-6 animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center text-cyan-400 ring-4 ring-cyan-500/5">
          <Key size={40} />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white flex items-center justify-center gap-2">
            Secure Activation
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Molecular Notes requires a Google AI Studio API key for high-fidelity Gemini Live transcription and academic refinement.
          </p>
        </div>

        <div className="w-full space-y-4">
          <button 
            onClick={onSelect}
            className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-lg hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
          >
            <Zap size={20} fill="currentColor" />
            Connect API Key
          </button>
          
          <a 
            href="https://aistudio.google.com/app/apikey" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-cyan-500/60 hover:text-cyan-400 text-xs font-bold uppercase tracking-widest transition-colors group"
          >
            Get Key from AI Studio
            <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>

        <div className="pt-4 border-t border-white/5 w-full">
          <p className="text-[10px] text-gray-600 uppercase tracking-[0.2em]">
            Requires a Paid/Billing-Enabled GCP Project
          </p>
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[10px] text-cyan-500/40 hover:underline">Learn about billing</a>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyDialog;
