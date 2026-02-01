
import React from 'react';
import { Lightbulb, Footprints, FileText, DollarSign, Wrench, User } from 'lucide-react';
import { NoteType } from '../types';

interface CreateMenuProps {
  x: number;
  y: number;
  onSelect: (type: NoteType) => void;
  onClose: () => void;
}

const CreateMenu: React.FC<CreateMenuProps> = ({ x, y, onSelect, onClose }) => {
  const options: { id: NoteType, label: string, icon: React.ReactNode, color: string }[] = [
    { id: 'idea', label: 'Idea', icon: <Lightbulb size={20} />, color: 'text-cyan-400' },
    { id: 'step', label: 'Step', icon: <Footprints size={20} />, color: 'text-cyan-400' },
    { id: 'note', label: 'Note', icon: <FileText size={20} />, color: 'text-cyan-400' },
    { id: 'cost', label: 'Cost', icon: <DollarSign size={20} />, color: 'text-fuchsia-400' },
    { id: 'tool', label: 'Tool', icon: <Wrench size={20} />, color: 'text-fuchsia-400' },
    { id: 'actor', label: 'Actor', icon: <User size={20} />, color: 'text-fuchsia-400' },
  ];

  return (
    <div 
      className="fixed z-[1000] -translate-x-1/2 -translate-y-1/2 animate-in zoom-in-95 duration-200"
      style={{ left: x, top: y }}
    >
      <div className="bg-[#0f0f0f] border border-white/10 rounded-[1.5rem] p-3 shadow-[0_0_60px_rgba(0,0,0,0.6)] grid grid-cols-3 gap-2 backdrop-blur-2xl">
        {options.map((opt) => {
          const isFuchsia = opt.color.includes('fuchsia');
          return (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              className="flex flex-col items-center gap-1 group"
            >
              <div className={`w-[44px] h-[44px] bg-black border border-white/5 rounded-xl flex items-center justify-center text-white/40 transition-all duration-300 group-hover:scale-105 ${
                isFuchsia 
                  ? 'group-hover:bg-fuchsia-600 group-hover:text-black group-hover:shadow-[0_0_15px_rgba(217,70,239,0.3)]' 
                  : 'group-hover:bg-cyan-500 group-hover:text-black group-hover:shadow-[0_0_15px_rgba(0,255,255,0.3)]'
              }`}>
                {opt.icon}
              </div>
              <span className={`text-[7px] font-black uppercase tracking-tight opacity-20 transition-opacity ${
                isFuchsia ? 'group-hover:text-fuchsia-400' : 'group-hover:text-cyan-400'
              } group-hover:opacity-100`}>{opt.label}</span>
            </button>
          );
        })}
        <button 
          onClick={onClose} 
          className="col-span-3 text-[7px] text-white/10 uppercase font-bold tracking-widest mt-0.5 py-1 hover:text-white/30 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default CreateMenu;
