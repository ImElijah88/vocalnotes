import React from 'react';
import { Plus, Move, Link2, Eye, X, Trash2, Share2, Crop } from 'lucide-react';
import { RadialOption } from '../types';

interface RadialMenuProps {
  x: number;
  y: number;
  onSelect: (option: RadialOption) => void;
  onClose: () => void;
  isVisible: boolean;
}

const RadialMenu: React.FC<RadialMenuProps> = ({ x, y, onSelect, onClose, isVisible }) => {
  if (!isVisible) return null;

  const items = [
    { id: 'create', icon: <Plus size={20} />, label: 'Create', color: 'cyan' },
    { id: 'select', icon: <Crop size={20} />, label: 'Select', color: 'cyan' },
    { id: 'move', icon: <Move size={20} />, label: 'Move', color: 'cyan' },
    { id: 'connect', icon: <Link2 size={20} />, label: 'Connect', color: 'cyan' },
    { id: 'share', icon: <Share2 size={20} />, label: 'Share', color: 'cyan' },
    { id: 'view', icon: <Eye size={20} />, label: 'View', color: 'fuchsia' },
    { id: 'delete', icon: <Trash2 size={20} />, label: 'Delete', color: 'fuchsia' },
  ] as const;

  const radius = 80;

  return (
    <div 
      className="fixed z-[999] pointer-events-none"
      style={{ left: x, top: y }}
    >
      <div className="relative -left-1/2 -top-1/2 w-0 h-0 pointer-events-auto">
        <div className="fixed inset-0 bg-black/40 -z-10 backdrop-blur-sm" onClick={onClose} />

        {items.map((item, index) => {
          const angle = (index / items.length) * 2 * Math.PI - Math.PI / 2;
          const itemX = Math.cos(angle) * radius;
          const itemY = Math.sin(angle) * radius;
          const isFuchsia = item.color === 'fuchsia';

          // Smart tooltip positioning based on button angle
          let tooltipClass = `absolute scale-0 group-hover:scale-100 transition-transform text-white text-[8px] px-1.5 py-0.5 rounded border pointer-events-none uppercase font-black tracking-tighter whitespace-nowrap ${
            isFuchsia ? 'bg-fuchsia-950 border-fuchsia-500/50' : 'bg-cyan-950 border-cyan-500/50'
          }`;
          
          // Determine tooltip position based on angle (in radians)
          const degrees = (angle * 180 / Math.PI + 360) % 360;
          if (degrees >= 315 || degrees < 45) {
            tooltipClass += ' left-full ml-2 top-1/2 -translate-y-1/2'; // Right
          } else if (degrees >= 45 && degrees < 135) {
            tooltipClass += ' top-full mt-2 left-1/2 -translate-x-1/2'; // Bottom
          } else if (degrees >= 135 && degrees < 225) {
            tooltipClass += ' right-full mr-2 top-1/2 -translate-y-1/2'; // Left
          } else {
            tooltipClass += ' bottom-full mb-2 left-1/2 -translate-x-1/2'; // Top
          }

          return (
            <button
              key={item.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(item.id);
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
              {item.icon}
              <div className={tooltipClass}>
                {item.label}
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

export default RadialMenu;