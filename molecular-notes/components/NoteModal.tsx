
import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Square, Save, Sparkles, Loader2, Info, Maximize, Minimize, AlertCircle } from 'lucide-react';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { refineNoteText, RefineError } from '../services/geminiService';
import { Note } from '../types';
import GeminiInfoModal from './GeminiInfoModal';

interface NoteModalProps {
  note: Note;
  onSave: (note: Note) => void;
  onClose: () => void;
  apiKey?: string;
  liveModelName?: string;
  refinementModelName?: string;
}

const NoteModal: React.FC<NoteModalProps> = ({ note, onSave, onClose, apiKey = '', liveModelName = 'gemini-2.5-flash-native-audio-preview-12-2025', refinementModelName = 'gemini-1.5-flash-latest' }) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isInternalFullscreen, setIsInternalFullscreen] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [refineRetryHint, setRefineRetryHint] = useState<string | null>(null);
  const [quotaCountdown, setQuotaCountdown] = useState<number | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  
  // High-fidelity Gemini Live — uses BYOK from User Hub
  const { 
    isLive: isGeminiLive, 
    liveTranscript: geminiTranscript, 
    startLiveSession, 
    stopLiveSession, 
    setLiveTranscript, 
    elapsedSeconds 
  } = useGeminiLive(apiKey, liveModelName, { onError: setLiveError });

  // Native Browser STT as a fallback
  const { 
    isListening: isNativeListening, 
    transcript: nativeTranscript, 
    startListening: startNativeListening, 
    stopListening: stopNativeListening 
  } = useSpeechToText();
  
  const baseContentRef = useRef(note.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isRecording = isGeminiLive || isNativeListening;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isGeminiLive) {
      const spacing = baseContentRef.current && !baseContentRef.current.endsWith('\n') ? '\n' : '';
      setContent(baseContentRef.current + spacing + geminiTranscript);
    }
  }, [geminiTranscript, isGeminiLive]);

  useEffect(() => {
    if (isNativeListening) {
      const spacing = baseContentRef.current && !baseContentRef.current.endsWith('\n') ? '\n' : '';
      setContent(baseContentRef.current + spacing + nativeTranscript);
    }
  }, [nativeTranscript, isNativeListening]);

  // Auto-scroll to bottom during recording so the latest words stay visible
  useEffect(() => {
    if (isRecording && textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [content, isRecording]);

  // Quota countdown timer
  useEffect(() => {
    if (quotaCountdown == null || quotaCountdown <= 0) return;
    const t = setInterval(() => setQuotaCountdown(c => (c != null && c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [quotaCountdown]);

  const handleStartRecording = () => {
    baseContentRef.current = content;
    setLiveTranscript('');
    startLiveSession();
  };

  const handleStopRecording = async () => {
    if (isGeminiLive) stopLiveSession();
    if (isNativeListening) stopNativeListening();

    setIsProcessing(true);
    setRefineError(null);
    setRefineRetryHint(null);
    setQuotaCountdown(null);
    try {
      const refined = await refineNoteText(content, { apiKey, modelName: refinementModelName });
      if (refined) {
        setContent(refined);
        baseContentRef.current = refined;
        onSave({ ...note, title, content: refined });
      }
    } catch (err) {
      if (err instanceof RefineError) {
        setRefineError(err.info.message);
        setRefineRetryHint(err.info.retryHint ?? null);
        if (err.info.code === 'quota') setQuotaCountdown(60);
      } else {
        setRefineError(err instanceof Error ? err.message : 'Refinement failed. Check User Hub settings.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualRefine = async () => {
    if (!content.trim() || isProcessing) return;
    setIsProcessing(true);
    setRefineError(null);
    setRefineRetryHint(null);
    setQuotaCountdown(null);
    try {
      const refined = await refineNoteText(content, { apiKey, modelName: refinementModelName });
      if (refined) {
        setContent(refined);
        baseContentRef.current = refined;
      }
    } catch (err) {
      if (err instanceof RefineError) {
        setRefineError(err.info.message);
        setRefineRetryHint(err.info.retryHint ?? null);
        if (err.info.code === 'quota') setQuotaCountdown(60);
      } else {
        setRefineError(err instanceof Error ? err.message : 'Refinement failed. Check User Hub settings.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    onSave({ ...note, title, content });
    onClose();
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setContent(newVal);
    
    if (isGeminiLive || isNativeListening) {
      const activeTrans = isGeminiLive ? geminiTranscript : nativeTranscript;
      const transcriptStartIdx = newVal.lastIndexOf(activeTrans);
      if (transcriptStartIdx !== -1 && activeTrans.length > 0) {
        baseContentRef.current = newVal.substring(0, transcriptStartIdx).trimEnd();
      } else if (activeTrans.length === 0) {
        baseContentRef.current = newVal;
      }
    } else {
      baseContentRef.current = newVal;
    }
  };

  const timerColorClass = elapsedSeconds >= 590 
    ? 'text-red-500' 
    : elapsedSeconds >= 540 
      ? 'text-amber-500' 
      : 'text-cyan-500';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 p-4">
      <div 
        className={`bg-[#050505] flex flex-col relative overflow-hidden transition-all duration-300 ${
          isInternalFullscreen 
            ? 'w-full h-full' 
            : 'w-full md:w-[90%] max-w-4xl h-[85vh] rounded-[2rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)]'
        }`}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-3 h-16 border-b border-white/5 bg-black/80 backdrop-blur-xl z-20">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent text-lg font-black uppercase tracking-widest outline-none w-full focus:ring-0 placeholder:text-gray-800 ml-4"
              style={{ color: note.color }}
              placeholder="Node Title..."
            />
            
            {isRecording && (
              <div className="flex items-center gap-2 px-3 py-1.5 border border-cyan-500/20 bg-cyan-500/5 rounded-xl animate-pulse shrink-0">
                <div className={`w-2 h-2 rounded-full ${isGeminiLive ? 'bg-cyan-500' : 'bg-white/50'}`} />
                <span className="text-[8px] font-black uppercase tracking-widest text-cyan-500">
                  {isGeminiLive ? 'Neural' : 'Native'}
                </span>
                {isGeminiLive && (
                  <div className={`flex items-center gap-1 text-xs font-mono ml-1 ${timerColorClass}`}>
                    {formatTime(elapsedSeconds)}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-0.5 shrink-0 ml-2">
            <button 
              onClick={() => setIsInfoOpen(true)}
              className="w-[44px] h-[44px] flex items-center justify-center text-gray-600 hover:text-cyan-400 transition-colors"
            >
              <Info size={20} />
            </button>

            <button 
              onClick={() => setIsInternalFullscreen(!isInternalFullscreen)}
              className="w-[44px] h-[44px] flex items-center justify-center text-gray-600 hover:text-cyan-400 transition-colors"
            >
              {isInternalFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>

            <button 
              onClick={onClose} 
              className="w-[44px] h-[44px] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Editor Area */}
        <main className="flex-1 relative bg-[#030303] overflow-hidden">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextChange}
            className="w-full h-full bg-transparent text-gray-200 outline-none resize-none px-6 py-6 sm:px-12 sm:py-8 leading-relaxed text-lg sm:text-xl placeholder:text-gray-900 scrollbar-hide selection:bg-cyan-500/20"
            placeholder="Manual entry or initiate dictation..."
            spellCheck={false}
          />
          
          {isProcessing && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-30">
              <Loader2 className="animate-spin text-[#D4AF37]" size={32} />
              <p className="text-[#D4AF37] font-black tracking-[0.4em] text-[8px] uppercase">Neural Refinement</p>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="h-20 px-6 border-t border-white/5 bg-black/80 backdrop-blur-xl flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-3">
            {!isRecording ? (
              <button 
                onClick={handleStartRecording}
                className="w-[44px] h-[44px] bg-cyan-600 hover:bg-cyan-500 text-white rounded-full flex items-center justify-center transition-all shadow-lg active:scale-90"
              >
                <Mic size={20} />
              </button>
            ) : (
              <button 
                onClick={handleStopRecording}
                className="w-[44px] h-[44px] bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-all shadow-lg ring-4 ring-red-500/10 animate-pulse active:scale-90"
              >
                <Square size={20} />
              </button>
            )}
            
            <button 
              onClick={handleManualRefine}
              disabled={isProcessing || isRecording || !content.trim()}
              className="w-[44px] h-[44px] border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-20"
              title="Refine with Gemini"
            >
              <Sparkles size={20} />
            </button>
          </div>

          <button 
            onClick={handleSave}
            className="h-[44px] px-6 text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-3"
            style={{ backgroundColor: note.color, boxShadow: `0 0 20px ${note.color}33` }}
          >
            <Save size={20} />
            <span className="hidden xs:inline">Store Node</span>
          </button>
        </footer>

        {isInfoOpen && (
          <GeminiInfoModal onClose={() => setIsInfoOpen(false)} />
        )}

        {liveError && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="max-w-md w-full bg-[#0a0a0a] border border-cyan-500/30 rounded-2xl p-8 flex flex-col gap-6 shadow-[0_0_60px_rgba(0,255,255,0.1)]">
              <div className="flex items-center gap-3 text-cyan-500">
                <AlertCircle size={24} />
                <h3 className="text-sm font-black uppercase tracking-widest">Transcription Failed</h3>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">{liveError}</p>
              <p className="text-gray-500 text-xs leading-relaxed">
                Open User Hub → Neural Link to set your API key and choose a Live model (e.g. Gemini 2.5 Flash Audio).
              </p>
              <button
                onClick={() => setLiveError(null)}
                className="w-full h-12 bg-cyan-600 hover:bg-cyan-500 text-black font-black uppercase tracking-widest rounded-xl transition-all"
              >
                Got it
              </button>
            </div>
          </div>
        )}

        {refineError && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="max-w-md w-full bg-[#0a0a0a] border border-amber-500/30 rounded-2xl p-8 flex flex-col gap-6 shadow-[0_0_60px_rgba(212,175,55,0.15)]">
              <div className="flex items-center gap-3 text-amber-500">
                <AlertCircle size={24} />
                <h3 className="text-sm font-black uppercase tracking-widest">Refinement Failed</h3>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">{refineError}</p>
              {refineRetryHint && (
                <p className="text-amber-500/80 text-xs leading-relaxed font-medium">{refineRetryHint}</p>
              )}
              {quotaCountdown != null && quotaCountdown > 0 && (
                <div className="flex items-center gap-2 text-cyan-400">
                  <div className="w-8 h-8 rounded-full border-2 border-cyan-500 flex items-center justify-center text-xs font-mono">
                    {quotaCountdown}
                  </div>
                  <span className="text-xs font-bold">seconds until you can try again</span>
                </div>
              )}
              <p className="text-gray-500 text-xs leading-relaxed">
                Tip: Open User Hub → Neural Link to add or fix your Gemini API key, or choose different models for Live vs Refinement.
              </p>
              <button
                onClick={() => { setRefineError(null); setRefineRetryHint(null); setQuotaCountdown(null); }}
                className="w-full h-12 bg-amber-600 hover:bg-amber-500 text-black font-black uppercase tracking-widest rounded-xl transition-all"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteModal;
