import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export interface UseGeminiLiveOptions {
  onError?: (message: string) => void;
}

export const useGeminiLive = (apiKey: string, modelName: string, options?: UseGeminiLiveOptions) => {
  const [isLive, setIsLive] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const accumulatedRef = useRef('');
  const timerIntervalRef = useRef<number | null>(null);

  const playSubtleTone = useCallback((freq: number, duration: number, volume: number = 0.1) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }, []);

  const stopLiveSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
    }
    setIsLive(false);
    setElapsedSeconds(0);
  }, []);

  const startLiveSession = useCallback(async (systemInstruction: string = '') => {
    try {
      // API key is now passed as an argument
      if (!apiKey) {
        const msg = "Gemini API key is not configured. Please set it in User Hub → Neural Link.";
        options?.onError ? options.onError(msg) : alert(msg);
        return;
      }

      // Model name is now passed as an argument
      const ai = new GoogleGenAI({ apiKey });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: modelName, // Use the passed modelName
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction: systemInstruction || 'You are a highly accurate transcription assistant. Transcribe the user audio faithfully into professional text. Correct minor stutters but keep the core content.',
        },
        callbacks: {
          onopen: () => {
            setIsLive(true);
            setElapsedSeconds(0);
            accumulatedRef.current = '';
            timerIntervalRef.current = window.setInterval(() => {
              setElapsedSeconds(prev => {
                const next = prev + 1;
                if (next > 0 && next % 60 === 0 && next < 590) {
                  playSubtleTone(440, 0.2, 0.05);
                  setTimeout(() => playSubtleTone(554.37, 0.3, 0.05), 250);
                }
                if (next >= 590 && next < 600) playSubtleTone(880, 0.1, 0.08);
                if (next >= 600) stopLiveSession();
                return next;
              });
            }, 1000);
            const source = audioContextRef.current!.createMediaStreamSource(streamRef.current!);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                if (sessionRef.current && sessionRef.current === session) { // Only send if the session is still active and valid
                  try {
                    session.sendRealtimeInput({ media: pcmBlob });
                  } catch (sendError) {
                    console.error("Failed to send real-time input:", sendError);
                    stopLiveSession(); // Proactively stop if sending fails
                  }
                }
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              accumulatedRef.current += text;
              setLiveTranscript(accumulatedRef.current);
            }
          },
          onerror: (e: any) => {
            console.error('Live session error:', e);
            stopLiveSession();
          },
          onclose: () => setIsLive(false),
        },
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error('Failed to start Gemini Live:', err);
      setIsLive(false);
      const msg = err instanceof Error ? err.message : String(err);
      const lower = msg.toLowerCase();
      let userMsg = 'Failed to start transcription. ';
      if (lower.includes('quota') || lower.includes('429')) userMsg += 'API quota exceeded. Try again in ~1 min or check billing.';
      else if (lower.includes('api key') || lower.includes('401')) userMsg += 'Invalid API key. Check User Hub → Neural Link.';
      else if (lower.includes('model') || lower.includes('404')) userMsg += 'Model unavailable. Try a different Live model in User Hub.';
      else userMsg += 'Check your API key and Live model in User Hub.';
      options?.onError ? options.onError(userMsg) : alert(userMsg);
    }
  }, [stopLiveSession, playSubtleTone, apiKey, modelName, options?.onError]);

  useEffect(() => {
    return () => stopLiveSession();
  }, [stopLiveSession]);

  return { isLive, liveTranscript, setLiveTranscript, startLiveSession, stopLiveSession, elapsedSeconds };
};