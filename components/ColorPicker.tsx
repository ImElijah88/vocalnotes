
import React, { useState, useRef, useEffect } from 'react';
import { Pipette } from 'lucide-react';

interface ColorPickerProps {
  currentColor: string;
  savedColors: string[];
  onColorSelect: (color: string) => void;
  onSave: (color: string) => void;
  onClose: () => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ currentColor, savedColors, onColorSelect, onSave, onClose }) => {
  const [hue, setHue] = useState(0);
  const [satVal, setSatVal] = useState({ s: 100, v: 100 });
  const [tempColor, setTempColor] = useState(currentColor);
  const [isEditingHex, setIsEditingHex] = useState(false);
  
  const boxRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  const hsvToHex = (h: number, s: number, v: number) => {
    s /= 100; v /= 100;
    const f = (n: number, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
    const r = Math.round(f(5) * 255);
    const g = Math.round(f(3) * 255);
    const b = Math.round(f(1) * 255);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  const handleBoxMove = (e: any) => {
    if (!boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, (1 - (clientY - rect.top) / rect.height) * 100));
    setSatVal({ s: x, v: y });
  };

  const handleHueMove = (e: any) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(359, ((clientX - rect.left) / rect.width) * 360));
    setHue(x);
  };

  useEffect(() => {
    const hex = hsvToHex(hue, satVal.s, satVal.v);
    setTempColor(hex);
    onColorSelect(hex);
  }, [hue, satVal]);

  const handleEyeDropper = async () => {
    if (!('EyeDropper' in window)) {
      alert('EyeDropper not supported in this browser');
      return;
    }
    try {
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      setTempColor(result.sRGBHex);
      onColorSelect(result.sRGBHex);
    } catch (e) {
      // User cancelled
    }
  };

  return (
    <div className="fixed left-24 top-1/2 -translate-y-1/2 z-[200] animate-in slide-in-from-left-4 duration-300">
      <div className="w-64 bg-[#0f0f0f] border border-white/10 rounded-2xl p-5 shadow-[0_0_50px_rgba(0,0,0,0.7)] flex flex-col gap-5 backdrop-blur-2xl">
        <div className="flex justify-between px-1">
          {savedColors.slice(0, 4).map((c, i) => (
            <button 
              key={i} 
              onClick={() => { setTempColor(c); onColorSelect(c); }}
              className="w-10 h-10 rounded-full border border-white/10 shadow-lg hover:scale-110 transition-transform ring-offset-2 ring-offset-black hover:ring-2 hover:ring-white/20"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div 
          ref={boxRef}
          onMouseDown={(e) => { 
            handleBoxMove(e); 
            const move = (me: any) => handleBoxMove(me); 
            document.addEventListener('mousemove', move); 
            document.addEventListener('mouseup', () => document.removeEventListener('mousemove', move), { once: true }); 
          }}
          onTouchStart={(e) => {
            handleBoxMove(e);
            const move = (te: any) => handleBoxMove(te);
            document.addEventListener('touchmove', move);
            document.addEventListener('touchend', () => document.removeEventListener('touchmove', move), { once: true });
          }}
          className="h-32 rounded-lg relative overflow-hidden shadow-inner border border-white/10 cursor-crosshair touch-none"
          style={{ backgroundColor: `hsl(${hue}, 100%, 50%)` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
          <div 
            className="absolute w-5 h-5 rounded-full border-2 border-white shadow-md pointer-events-none -translate-x-1/2 translate-y-1/2 ring-1 ring-black/20" 
            style={{ left: `${satVal.s}%`, bottom: `${satVal.v}%` }}
          />
        </div>

        <div 
          ref={hueRef}
          onMouseDown={(e) => { 
            handleHueMove(e); 
            const move = (me: any) => handleHueMove(me); 
            document.addEventListener('mousemove', move); 
            document.addEventListener('mouseup', () => document.removeEventListener('mousemove', move), { once: true }); 
          }}
          onTouchStart={(e) => {
            handleHueMove(e);
            const move = (te: any) => handleHueMove(te);
            document.addEventListener('touchmove', move);
            document.addEventListener('touchend', () => document.removeEventListener('touchmove', move), { once: true });
          }}
          className="h-5 w-full rounded-full bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-cyan-500 via-blue-500 to-purple-500 relative cursor-pointer touch-none"
        >
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border border-black/20 shadow-xl -translate-x-1/2 hover:scale-110 transition-transform" 
            style={{ left: `${(hue / 360) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-lg border border-white/5 flex-1">
            <span className="text-white/30 font-mono text-sm">#</span>
            {isEditingHex ? (
              <input 
                autoFocus
                type="text" 
                defaultValue={tempColor.replace('#', '').toUpperCase()} 
                onBlur={(e) => {
                  const val = e.target.value.replace(/[^0-9A-Fa-f]/g, '');
                  if (val.length === 6) {
                    const hex = `#${val}`;
                    setTempColor(hex);
                    onColorSelect(hex);
                  }
                  setIsEditingHex(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value.replace(/[^0-9A-Fa-f]/g, '');
                    if (val.length === 6) {
                      const hex = `#${val}`;
                      setTempColor(hex);
                      onColorSelect(hex);
                    }
                    setIsEditingHex(false);
                  }
                }}
                className="bg-transparent text-white font-mono text-sm outline-none w-20 tracking-widest"
              />
            ) : (
              <input 
                type="text" 
                value={tempColor.replace('#', '').toUpperCase()} 
                readOnly
                onDoubleClick={() => setIsEditingHex(true)}
                className="bg-transparent text-white font-mono text-sm outline-none w-20 tracking-widest cursor-text"
              />
            )}
            <button 
              onClick={handleEyeDropper}
              className="text-fuchsia-500 opacity-60 hover:opacity-100 transition-opacity relative group"
              title="Pick color from screen"
            >
              <Pipette size={14} />
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-black border border-white/10 rounded text-[8px] font-bold uppercase tracking-wider text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
                Pick Color
              </div>
            </button>
          </div>
          
          <button 
            onClick={() => onSave(tempColor)}
            className="bg-fuchsia-600 hover:bg-white text-black font-black text-[10px] uppercase tracking-widest px-5 py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(217,70,239,0.4)] active:scale-95"
          >
            Save
          </button>
        </div>

        <button 
          onClick={onClose} 
          className="text-[10px] text-white/20 uppercase font-black tracking-[0.2em] self-center hover:text-white/60 transition-colors py-1"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default ColorPicker;
