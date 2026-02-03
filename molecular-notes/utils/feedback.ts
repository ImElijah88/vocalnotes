// Audio Context for sound generation
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Settings
const isSoundEnabled = () => localStorage.getItem('molecular_sound_enabled') !== 'false';
const isHapticEnabled = () => localStorage.getItem('molecular_haptic_enabled') !== 'false';

// Sound Effects
export const playSound = {
  success: () => {
    if (!isSoundEnabled()) return;
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  },
  
  pop: () => {
    if (!isSoundEnabled()) return;
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(600, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  },
  
  delete: () => {
    if (!isSoundEnabled()) return;
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(600, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  }
};

// Haptic Feedback
export const haptic = {
  light: () => {
    if (!isHapticEnabled()) return;
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },
  
  medium: () => {
    if (!isHapticEnabled()) return;
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },
  
  strong: () => {
    if (!isHapticEnabled()) return;
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }
};

// Settings management
export const feedbackSettings = {
  getSoundEnabled: isSoundEnabled,
  setSoundEnabled: (enabled: boolean) => {
    localStorage.setItem('molecular_sound_enabled', String(enabled));
  },
  
  getHapticEnabled: isHapticEnabled,
  setHapticEnabled: (enabled: boolean) => {
    localStorage.setItem('molecular_haptic_enabled', String(enabled));
  },
  
  resetOnboarding: () => {
    localStorage.removeItem('molecular_onboarding_hint_shown');
  }
};
