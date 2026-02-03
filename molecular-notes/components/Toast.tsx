import React, { useEffect, useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 1500 }) => {
  const onCloseRef = useRef(onClose);
  
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  
  useEffect(() => {
    const timer = setTimeout(() => onCloseRef.current(), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[2000] animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="bg-black/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl px-5 py-2.5 flex items-center gap-2.5 shadow-[0_0_30px_rgba(0,255,255,0.2)]">
        <CheckCircle2 size={16} className="text-cyan-400" />
        <span className="text-white text-xs font-bold tracking-wide">{message}</span>
      </div>
    </div>
  );
};

export default Toast;
