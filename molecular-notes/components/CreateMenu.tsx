import React from 'react';
import { Lightbulb, Footprints, FileText, DollarSign, Wrench, User, CheckSquare, X } from 'lucide-react';
import { NoteType } from '../types';

interface CreateMenuProps {
  x: number;
  y: number;
  onSelect: (type: NoteType) => void;
  onClose: () => void;
}

const CreateMenu: React.FC<CreateMenuProps> = ({ x, y, onSelect, onClose }) => {
  const options: { id: NoteType, label: string, icon: React.ReactNode, color: string }[] = [
    { id: 'idea', label: 'Idea', icon: <Lightbulb size={20} />, color: 'cyan' },
    { id: 'step', label: 'Step', icon: <Footprints size={20} />, color: 'cyan' },
    { id: 'note', label: 'Note', icon: <FileText size={20} />, color: 'cyan' },
    { id: 'task', label: 'Task', icon: <CheckSquare size={20} />, color: 'cyan' },
    { id: 'cost', label: 'Cost', icon: <DollarSign size={20} />, color: 'fuchsia' },
    { id: 'tool', label: 'Tool', icon: <Wrench size={20} />, color: 'fuchsia' },
    { id: 'actor', label: 'Actor', icon: <User size={20} />, color: 'fuchsia' },
  ];

  const radius = 90;

  return (
    <div 
      className="fixed z-[1000] pointer-events-none"
      style={{ left: x, top: y }}
    >
      <div className="relative -left-1/2 -top-1/2 w-0 h-0 pointer-events-auto">
        <div className="fixed inset-0 bg-black/40 -z-10 backdrop-blur-sm" onClick={onClose} />

        {options.map((opt, index) => {
          const angle = (index / options.length) * 2 * Math.PI - Math.PI / 2;
          const itemX = Math.cos(angle) * radius;
          const itemY = Math.sin(angle) * radius;
          const isFuchsia = opt.color === 'fuchsia';

          let tooltipClass = `absolute scale-0 group-hover:scale-100 transition-transform text-white text-[8px] px-1.5 py-0.5 rounded border pointer-events-none uppercase font-black tracking-tighter whitespace-nowrap ${
            isFuchsia ? 'bg-fuchsia-950 border-fuchsia-500/50' : 'bg-cyan-950 border-cyan-500/50'
          }`;
          
          const degrees = (angle * 180 / Math.PI + 360) % 360;
          if (degrees >= 315 || degrees < 45) {
            tooltipClass += ' left-full ml-2 top-1/2 -translate-y-1/2';
          } else if (degrees >= 45 && degrees < 135) {
            tooltipClass += ' top-full mt-2 left-1/2 -translate-x-1/2';
          } else if (degrees >= 135 && degrees < 225) {
            tooltipClass += ' right-full mr-2 top-1/2 -translate-y-1/2';
          } else {
            tooltipClass += ' bottom-full mb-2 left-1/2 -translate-x-1/2';
          }

          return (
            <button
              key={opt.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(opt.id);
              }}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 w-[44px] h-[44px] bg-[#0a0a0a] border rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg group ${
                isFuchsia 
                  ? 'text-fuchsia-400 border-fuchsia-500/30 hover:bg-fuchsia-950/20' 
                  : 'text-cyan-400 border-cyan-500/30 hover:bg-cyan-950/20'
              }`}
              style={{ 
                left: itemX, 
                top: itemY,
                boxShadow: isFuchsia ? '0 0 15px rgba(217,70,239,0.1)' : '0 0 15px rgba(0,255,255,0.1)'
              }}
            >
              {opt.icon}
              <div className={tooltipClass}>
                {opt.label}
              </div>
            </button>
          );
        })}
        
        <button 
          onClick={onClose}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 w-[34px] h-[34px] rounded-lg bg-[#111] border border-fuchsia-500/50 flex items-center justify-center text-fuchsia-500 hover:bg-fuchsia-500/10 transition-all active:scale-90 shadow-lg"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default CreateMenu;