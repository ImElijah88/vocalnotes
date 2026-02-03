
import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Square, Save, Sparkles, Loader2, Info, Maximize, Minimize, AlertCircle, Wand2, Copy, Plus } from 'lucide-react';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { refineNoteText, RefineError } from '../services/geminiService';
import { Note } from '../types';
import GeminiInfoModal from './GeminiInfoModal';
import Toast from './Toast';
import { playSound, haptic } from '../utils/feedback';

interface NoteModalProps {
  note: Note;
  onSave: (note: Note) => void;
  onClose: () => void;
  onCreateNote?: (content: string, title: string) => void;
  apiKey?: string;
  liveModelName?: string;
  refinementModelName?: string;
}

interface Tab {
  id: string;
  label: string;
  content: string;
}

const NoteModal: React.FC<NoteModalProps> = ({ note, onSave, onClose, onCreateNote, apiKey = '', liveModelName = 'gemini-2.5-flash-native-audio-preview-12-2025', refinementModelName = 'gemini-1.5-flash-latest' }) => {
  const [title, setTitle] = useState(note.title);
  const [tabs, setTabs] = useState<Tab[]>([{ id: 'original', label: 'Original', content: note.content }]);
  const [activeTabId, setActiveTabId] = useState('original');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isInternalFullscreen, setIsInternalFullscreen] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [refineRetryHint, setRefineRetryHint] = useState<string | null>(null);
  const [quotaCountdown, setQuotaCountdown] = useState<number | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [showRefineConfirm, setShowRefineConfirm] = useState(false);
  const [showPromptMenu, setShowPromptMenu] = useState(false);
  const [showRefineMenu, setShowRefineMenu] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const content = tabs.find(t => t.id === activeTabId)?.content || '';
  const activeTab = tabs.find(t => t.id === activeTabId);
  const originalContent = tabs.find(t => t.id === 'original')?.content || '';
  
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
  const lastGeminiTranscriptRef = useRef('');
  const lastNativeTranscriptRef = useRef('');
  const isUserEditingRef = useRef(false);

  const isRecording = isGeminiLive || isNativeListening;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isGeminiLive && geminiTranscript && !isUserEditingRef.current) {
      // Only append the NEW portion of transcript
      const newPortion = geminiTranscript.slice(lastGeminiTranscriptRef.current.length);
      if (newPortion) {
        lastGeminiTranscriptRef.current = geminiTranscript;
        const newContent = baseContentRef.current + newPortion;
        setTabs(prev => prev.map(t => t.id === 'original' ? { ...t, content: newContent } : t));
        baseContentRef.current = newContent;
      }
    }
  }, [geminiTranscript, isGeminiLive]);

  useEffect(() => {
    if (isNativeListening && nativeTranscript && !isUserEditingRef.current) {
      // Only append the NEW portion of transcript
      const newPortion = nativeTranscript.slice(lastNativeTranscriptRef.current.length);
      if (newPortion) {
        lastNativeTranscriptRef.current = nativeTranscript;
        const newContent = baseContentRef.current + newPortion;
        setTabs(prev => prev.map(t => t.id === 'original' ? { ...t, content: newContent } : t));
        baseContentRef.current = newContent;
      }
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
    const currentContent = originalContent;
    // Add spacing only when starting a NEW recording session
    const spacing = currentContent && !currentContent.endsWith('\n') ? '\n\n' : '';
    baseContentRef.current = currentContent + spacing;
    lastGeminiTranscriptRef.current = '';
    lastNativeTranscriptRef.current = '';
    isUserEditingRef.current = false;
    setLiveTranscript('');
    startLiveSession();
    playSound.pop();
    haptic.medium();
  };

  const handleStopRecording = () => {
    if (isGeminiLive) stopLiveSession();
    if (isNativeListening) stopNativeListening();
    playSound.pop();
    haptic.medium();
  };

  const handleManualRefine = () => {
    if (!content.trim() || isProcessing) return;
    setShowRefineMenu(!showRefineMenu);
  };

  const confirmRefine = async (audience: string) => {
    setShowRefineMenu(false);
    setIsProcessing(true);
    setRefineError(null);
    setRefineRetryHint(null);
    setQuotaCountdown(null);

    const audiencePrompts: Record<string, string> = {
      'academic': `Fix grammar and improve clarity using formal academic language. Preserve all technical terms and key details. Output plain text only—no markdown, hashtags, or conversational phrases like "Here's" or "I've". Maintain the full length and depth of the original:\n\n${originalContent}`,
      'simple': `Rewrite in simple everyday language that anyone can understand. Replace complex words: "user"→"you", "implement"→"do", "retain"→"keep", "generate"→"make", "utilize"→"use", "currently"→"now", "impossible"→"can't". Keep all important details. Output plain text only—no markdown or phrases like "Here's":\n\n${originalContent}`,
      'professional': `Fix grammar and refine using clear professional business language. Balance formality with accessibility. Preserve all key information. Output plain text only—no markdown, hashtags, or conversational phrases:\n\n${originalContent}`,
      'technical': `Fix grammar and enhance using precise technical vocabulary for expert audiences. Keep all specifications and details intact. Output plain text only—no markdown or conversational phrases:\n\n${originalContent}`,
      'casual': `Fix grammar and rewrite in a friendly, conversational tone. Keep it natural and relaxed while preserving all important points. Output plain text only—no markdown or phrases like "Here's":\n\n${originalContent}`,
    };

    try {
      const prompt = audiencePrompts[audience] || audiencePrompts['professional'];
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${refinementModelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 8192 }
        })
      });

      if (!response.ok) throw new Error('Refinement failed');
      const data = await response.json();
      let refined = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (refined) {
        refined = refined
          .replace(/#{1,6}\s/g, '')
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\*([^*]+)\*/g, '$1')
          .replace(/^(Here's|Here is|I've|I have|Sure|Certainly).+?:\s*/gim, '')
          .trim();
        
        const tabLabels: Record<string, string> = {
          'simple': 'Simple',
          'casual': 'Casual',
          'professional': 'Pro',
          'academic': 'Academic',
          'technical': 'Tech'
        };
        
        const newTab: Tab = {
          id: `refine-${Date.now()}`,
          label: tabLabels[audience] || 'Refined',
          content: refined
        };
        
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
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

  const handlePromptTransform = async (scenario: string) => {
    setShowPromptMenu(false);
    if (!originalContent.trim() || isProcessing) return;
    setIsProcessing(true);
    setRefineError(null);
    setRefineRetryHint(null);
    setQuotaCountdown(null);

    const prompts: Record<string, string> = {
      'app': `Transform this into a structured app development prompt. Include: Goal, Core Features, Technical Requirements, User Flow. Use simple bullets. Output plain text only—no markdown or conversational phrases:\n\n${originalContent}`,
      'design': `Transform this into a structured design prompt. Include: Visual Goal, Layout Structure, Color Palette, UX Priorities. Use simple bullets. Output plain text only—no markdown or conversational phrases:\n\n${originalContent}`,
      'content': `Transform this into a structured content creation prompt. Include: Goal, Target Audience, Tone/Voice, Key Points, Format. Use simple bullets. Output plain text only—no markdown or conversational phrases:\n\n${originalContent}`,
      'research': `Transform this into a structured research prompt. Include: Research Goal, Key Questions, Methodology, Expected Outcome. Use simple bullets. Output plain text only—no markdown or conversational phrases:\n\n${originalContent}`,
      'marketing': `Transform this into a structured marketing prompt. Include: Campaign Goal, Target Audience, Channels, Core Message, Success Metrics. Use simple bullets. Output plain text only—no markdown or conversational phrases:\n\n${originalContent}`,
    };

    try {
      const systemPrompt = prompts[scenario] || prompts['app'];
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${refinementModelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 4096 }
        })
      });

      if (!response.ok) throw new Error('Prompt transformation failed');
      const data = await response.json();
      let transformed = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (transformed) {
        transformed = transformed
          .replace(/#{1,6}\s/g, '')
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\*([^*]+)\*/g, '$1')
          .replace(/^(Here's|Here is|I've|I have|Sure|Certainly).+?:\s*/gim, '')
          .trim();
        
        const tabLabels: Record<string, string> = {
          'app': 'App',
          'design': 'Design',
          'content': 'Content',
          'research': 'Research',
          'marketing': 'Marketing'
        };
        
        const newTab: Tab = {
          id: `prompt-${Date.now()}`,
          label: tabLabels[scenario] || 'Prompt',
          content: transformed
        };
        
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
      }
    } catch (err) {
      setRefineError(err instanceof Error ? err.message : 'Prompt transformation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    onSave({ ...note, title, content: originalContent });
    playSound.success();
    haptic.medium();
    onClose();
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    isUserEditingRef.current = true;
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, content: newVal } : t));
    
    if (activeTabId === 'original') {
      baseContentRef.current = newVal;
    }
    
    // Re-enable auto-append after 500ms of no typing
    setTimeout(() => {
      isUserEditingRef.current = false;
    }, 500);
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopySuccess(true);
      playSound.success();
      haptic.light();
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCreateNoteFromTab = () => {
    if (onCreateNote && activeTab && activeTab.id !== 'original') {
      onCreateNote(content, activeTab.label);
      playSound.success();
      haptic.medium();
      setToastMessage('Note created on canvas ✓');
      setShowToast(true);
    }
  };

  const timerColorClass = elapsedSeconds >= 590 
    ? 'text-red-500' 
    : elapsedSeconds >= 540 
      ? 'text-red-400' 
      : 'text-red-500';

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
        <header className="flex flex-col px-3 border-b border-white/5 bg-black/80 backdrop-blur-xl z-20">
          <div className="flex items-center justify-between h-16">
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
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-between gap-2 pb-2">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all shrink-0 ${
                  activeTabId === tab.id
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                {tab.label}
                {tab.id !== 'original' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTabs(prev => prev.filter(t => t.id !== tab.id));
                      if (activeTabId === tab.id) setActiveTabId('original');
                    }}
                    className="ml-2 text-gray-600 hover:text-red-400"
                  >
                    ×
                  </button>
                )}
              </button>
            ))}
            </div>
            
            {activeTabId !== 'original' && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleCopyToClipboard}
                  className="h-8 px-3 flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all text-xs font-bold uppercase tracking-wider"
                  title="Copy to clipboard"
                >
                  <Copy size={14} />
                  {copySuccess ? 'Copied!' : 'Copy'}
                </button>
                {onCreateNote && (
                  <button
                    onClick={handleCreateNoteFromTab}
                    className="h-8 px-3 flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-all text-xs font-bold uppercase tracking-wider shadow-lg"
                    title="Create new note on canvas"
                  >
                    <Plus size={14} />
                    Create Note
                  </button>
                )}
              </div>
            )}
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
            
            <div className="relative">
              <button 
                onClick={handleManualRefine}
                disabled={isProcessing || isRecording || !content.trim()}
                className="w-[44px] h-[44px] border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-20"
                title="Refine Text"
              >
                <Sparkles size={20} />
              </button>

              {showRefineMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-[#0a0a0a] border border-cyan-500/30 rounded-xl p-2 shadow-[0_0_30px_rgba(0,255,255,0.2)] min-w-[140px] z-50">
                  {[
                    { id: 'simple', label: 'Simple' },
                    { id: 'casual', label: 'Casual' },
                    { id: 'professional', label: 'Professional' },
                    { id: 'academic', label: 'Academic' },
                    { id: 'technical', label: 'Technical' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => confirmRefine(opt.id)}
                      className="w-full px-3 py-2 text-left text-xs font-bold text-gray-300 hover:bg-cyan-500/10 hover:text-cyan-400 rounded-lg transition-all"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowPromptMenu(!showPromptMenu)}
                disabled={isProcessing || isRecording || !content.trim()}
                className="w-[44px] h-[44px] border border-fuchsia-500/20 text-fuchsia-400 hover:bg-fuchsia-500/10 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-20"
                title="Transform to Prompt"
              >
                <Wand2 size={20} />
              </button>

              {showPromptMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-[#0a0a0a] border border-fuchsia-500/30 rounded-xl p-2 shadow-[0_0_30px_rgba(217,70,239,0.2)] min-w-[140px] z-50">
                  {[
                    { id: 'app', label: 'App Dev' },
                    { id: 'design', label: 'Design' },
                    { id: 'content', label: 'Content' },
                    { id: 'research', label: 'Research' },
                    { id: 'marketing', label: 'Marketing' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => handlePromptTransform(opt.id)}
                      className="w-full px-3 py-2 text-left text-xs font-bold text-gray-300 hover:bg-fuchsia-500/10 hover:text-fuchsia-400 rounded-lg transition-all"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
      
      {showToast && (
        <Toast message={toastMessage} onClose={() => setShowToast(false)} />
      )}
    </div>
  );
};

export default NoteModal;
