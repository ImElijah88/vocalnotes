
import React, { useState } from 'react';
import { AlertCircle, LogIn, UserCircle2 } from 'lucide-react';
import { loginWithGoogle } from '../services/firebase';

interface LandingPageProps {
  onGuestAccess: () => void;
}

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'spline-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { url?: string }, HTMLElement>;
      }
    }
  }
}

const LandingPage: React.FC<LandingPageProps> = ({ onGuestAccess }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error("Login failed:", err);
      if (err.code === 'auth/auth-domain-config-required') {
        setError("Firebase configuration error. Contact administrator.");
      } else {
        setError("Authentication failed. Please check your connection or use Guest access.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-[#050505] flex flex-col items-center justify-center overflow-hidden font-sans">
      {/* 3D Spline Background */}
      <div className="absolute inset-0 z-0">
        <spline-viewer url="https://prod.spline.design/eL3vu89Qdq5AHL-W/scene.splinecode" />
      </div>

      {/* Glass Overlay for Depth */}
      <div className={`absolute inset-0 z-[1] transition-all duration-1000 ${showOptions ? 'bg-black/95 backdrop-blur-3xl' : 'bg-transparent'}`}></div>

      <div className="relative z-10 w-full h-full">
        
        {/* Transparent Hotspot over the Spline "Sign In" button region */}
        {!showOptions && (
          <button 
            onClick={() => setShowOptions(true)}
            className="absolute bottom-[calc(13%+80px)] left-[calc(50%+22px)] -translate-x-1/2 w-[190px] h-16 rounded-[1.2rem] cursor-pointer group outline-none"
            aria-label="Sign In"
          >
            <div className="absolute inset-0 rounded-[1.2rem] bg-cyan-500/0 group-hover:bg-cyan-500/10 transition-all duration-500 blur-xl"></div>
            <div className="absolute inset-0 rounded-[1.2rem] border border-white/0 group-hover:border-cyan-500/20 transition-all duration-500"></div>
          </button>
        )}

        {/* Action Buttons Container */}
        <div className="absolute bottom-[calc(13%+80px)] left-[calc(50%+22px)] -translate-x-1/2 w-full flex flex-col items-center">
          {showOptions && (
            <div className="flex flex-col items-center gap-5 animate-in slide-in-from-bottom-12 fade-in duration-700 w-full max-w-[320px] px-6">
              
              <div className="mb-6 text-center space-y-2">
                <h2 className="text-white font-black uppercase tracking-[0.6em] text-[10px] opacity-40">Initialize</h2>
                <div className="h-[2px] w-12 bg-gradient-to-r from-cyan-500 to-fuchsia-500 mx-auto rounded-full" />
              </div>

              <button 
                onClick={handleGoogleLogin}
                className="w-full h-16 bg-black/60 hover:bg-black/80 text-white font-black uppercase tracking-widest text-[12px] rounded-2xl transition-all border border-cyan-500/30 hover:border-cyan-500/60 shadow-[0_0_30px_rgba(0,255,255,0.05)] hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 backdrop-blur-3xl"
              >
                <LogIn size={20} strokeWidth={3} className="text-cyan-500" />
                Google
              </button>
              
              <button 
                onClick={onGuestAccess}
                className="w-full h-16 bg-black/60 hover:bg-black/80 text-white font-black uppercase tracking-widest text-[12px] rounded-2xl transition-all border border-fuchsia-500/30 hover:border-fuchsia-500/60 shadow-[0_0_30px_rgba(217,70,239,0.05)] active:scale-95 flex items-center justify-center gap-3 backdrop-blur-3xl"
              >
                <UserCircle2 size={20} strokeWidth={3} className="text-fuchsia-500" />
                Guest
              </button>

              <button 
                onClick={() => {
                  setShowOptions(false);
                  setError(null);
                }}
                className="text-[10px] text-gray-600 uppercase font-black tracking-[0.7em] hover:text-white transition-colors mt-12 py-4"
              >
                Abort Connection
              </button>
            </div>
          )}

          {error && (
            <div className="absolute bottom-full mb-12 w-[300px] bg-red-500/10 border border-red-500/20 p-5 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-500 backdrop-blur-xl">
              <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-400 font-bold uppercase leading-tight tracking-wider">
                {error}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
