import React from 'react';
import { Copy, Download, ExternalLink, Share2, X } from 'lucide-react';
import { Note } from '../types';

interface ShareModalProps {
  note: Note;
  onClose: () => void;
  x: number;
  y: number;
}

const ShareModal: React.FC<ShareModalProps> = ({ note, onClose, x, y }) => {
  const shareText = `${note.title}\n\n${note.content}`;

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(shareText).then(() => onClose()).catch(() => {});
  };

  const handleOpenInNotebookLM = () => {
    navigator.clipboard.writeText(shareText).then(() => {
      window.open('https://notebooklm.google.com/', '_blank');
      onClose();
    });
  };

  const handleDownloadAsText = () => {
    const blob = new Blob([shareText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({ title: note.title, text: shareText }).catch(() => {});
    }
    onClose();
  };

  const items = [
    { icon: <Copy size={20} />, label: 'Copy', action: handleCopyToClipboard },
    { icon: <ExternalLink size={20} />, label: 'NotebookLM', action: handleOpenInNotebookLM },
    { icon: <Download size={20} />, label: 'Download', action: handleDownloadAsText },
  ];

  if (navigator.share) {
    items.push({ icon: <Share2 size={20} />, label: 'Share', action: handleNativeShare });
  }

  const radius = 70;

  return (
    <div className="fixed z-[999] pointer-events-none" style={{ left: x, top: y }}>
      <div className="relative -left-1/2 -top-1/2 w-0 h-0 pointer-events-auto">
        <div className="fixed inset-0 bg-black/40 -z-10 backdrop-blur-sm" onClick={onClose} />

        {items.map((item, index) => {
          const angle = (index / items.length) * 2 * Math.PI - Math.PI / 2;
          const itemX = Math.cos(angle) * radius;
          const itemY = Math.sin(angle) * radius;

          // Smart tooltip positioning based on button angle
          let tooltipClass = 'absolute scale-0 group-hover:scale-100 transition-transform text-white text-[8px] px-1.5 py-0.5 rounded border pointer-events-none uppercase font-black tracking-tighter bg-cyan-950 border-cyan-500/50 whitespace-nowrap';
          
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
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                item.action();
              }}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 w-[44px] h-[44px] bg-[#0a0a0a] border border-cyan-500/30 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg group text-cyan-400 hover:bg-cyan-950/20"
              style={{ 
                left: itemX, 
                top: itemY,
                boxShadow: '0 0 15px rgba(0,255,255,0.1)'
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
          className="absolute transform -translate-x-1/2 -translate-y-1/2 w-[34px] h-[34px] rounded-lg bg-[#111] border border-cyan-500/50 flex items-center justify-center text-cyan-500 hover:bg-cyan-500/10 transition-all active:scale-90 shadow-lg"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default ShareModal;
