
import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, User, Shield, Zap, LogOut, Info, AlertTriangle, Key, Eye, EyeOff, ExternalLink, Plus, Edit3, Trash2, CheckSquare, Square, Image as ImageIcon, Palette } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { GeminiConfig } from '../types'; // Import GeminiConfig type
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs
import ColorPicker from './ColorPicker';

const DEFAULT_BACKGROUNDS = [
  { id: 'grid', name: 'Grid', value: 'radial-gradient(circle, #1a1a1a 1px, rgba(0, 0, 0, 0) 1px)', size: '30px 30px' },
  { id: 'dots', name: 'Dots', value: 'radial-gradient(circle, #2a2a2a 2px, transparent 2px)', size: '40px 40px' },
  { id: 'lines', name: 'Lines', value: 'repeating-linear-gradient(0deg, transparent, transparent 29px, #1a1a1a 29px, #1a1a1a 30px)', size: 'auto' },
  { id: 'solid', name: 'Solid', value: '#050505', size: 'auto' },
  { id: 'spline1', name: 'Black Hole', value: 'https://my.spline.design/blackhole-P8xBUx7R2aecELsor3E9OaRQ/', size: 'auto', type: 'spline' },
];

const DEFAULT_LIVE = 'gemini-2.5-flash-native-audio-preview-12-2025';
const DEFAULT_REFINEMENT = 'gemini-1.5-flash-latest';

// Models for Live transcription (audio input)
const LIVE_MODELS = [
  { id: 'gemini-2.5-flash-native-audio-preview-12-2025', name: 'Gemini 2.5 Flash Audio (Default)' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)' },
  { id: 'gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash (Fallback)' },
  { id: 'custom', name: 'Custom Model ID' },
];

// Models for text refinement (generateContent)
const REFINEMENT_MODELS = [
  { id: 'gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash (Default)' },
  { id: 'gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro' },
  { id: 'gemini-2.5-flash-native-audio-preview-12-2025', name: 'Gemini 2.5 Flash Audio' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' },
  { id: 'custom', name: 'Custom Model ID' },
];

function migrateConfig(c: Partial<GeminiConfig>): GeminiConfig {
  const live = c.liveModelName ?? c.modelName ?? DEFAULT_LIVE;
  const refinement = c.refinementModelName ?? (c.modelName && !c.modelName.includes('native-audio') ? c.modelName : DEFAULT_REFINEMENT);
  return {
    id: c.id!,
    name: c.name!,
    apiKey: c.apiKey ?? '',
    liveModelName: live,
    refinementModelName: refinement,
  };
}

interface SettingsModalProps {
  user: FirebaseUser | null;
  isGuest: boolean;
  onLogout: () => void;
  onClose: () => void;
  // New props for API key and model management
  geminiConfigs: GeminiConfig[];
  activeGeminiConfigId: string | null;
  onSaveConfig: (config: GeminiConfig) => void;
  onDeleteConfig: (configId: string) => void;
  onSetActiveConfig: (configId: string) => void;
  // Background props
  activeBackground: string;
  customBackgrounds: string[];
  onSetBackground: (bg: string) => void;
  onAddCustomBackground: (bg: string) => void;
  onDeleteCustomBackground: (bg: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  user,
  isGuest,
  onLogout,
  onClose,
  geminiConfigs,
  activeGeminiConfigId,
  onSaveConfig,
  onDeleteConfig,
  onSetActiveConfig,
  activeBackground,
  customBackgrounds,
  onSetBackground,
  onAddCustomBackground,
  onDeleteCustomBackground
}) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [tempBgColor, setTempBgColor] = useState('#050505');
  const [showBackgroundMenu, setShowBackgroundMenu] = useState(false);
  const [selectedBgOption, setSelectedBgOption] = useState<string | null>(null);
  
  const [editingConfig, setEditingConfig] = useState<GeminiConfig | null>(null);
  const [configNameInput, setConfigNameInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [selectedLiveModel, setSelectedLiveModel] = useState<string>(DEFAULT_LIVE);
  const [customLiveInput, setCustomLiveInput] = useState('');
  const [selectedRefinementModel, setSelectedRefinementModel] = useState<string>(DEFAULT_REFINEMENT);
  const [customRefinementInput, setCustomRefinementInput] = useState('');

  const [showApiKey, setShowApiKey] = useState(false);
  const [isKeyActive, setIsKeyActive] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isLiveCustom = selectedLiveModel === 'custom';
  const isRefinementCustom = selectedRefinementModel === 'custom';

  useEffect(() => {
    const currentActiveConfig = geminiConfigs.find(config => config.id === activeGeminiConfigId);
    setIsKeyActive(!!currentActiveConfig?.apiKey);
  }, [geminiConfigs, activeGeminiConfigId]);

  useEffect(() => {
    if (editingConfig) {
      const c = migrateConfig(editingConfig);
      setConfigNameInput(c.name);
      setApiKeyInput(c.apiKey);
      const livePredef = LIVE_MODELS.some(m => m.id === c.liveModelName);
      setSelectedLiveModel(livePredef ? c.liveModelName : 'custom');
      setCustomLiveInput(livePredef ? '' : c.liveModelName);
      const refPredef = REFINEMENT_MODELS.some(m => m.id === c.refinementModelName);
      setSelectedRefinementModel(refPredef ? c.refinementModelName : 'custom');
      setCustomRefinementInput(refPredef ? '' : c.refinementModelName);
    } else {
      setConfigNameInput('');
      setApiKeyInput('');
      setSelectedLiveModel(DEFAULT_LIVE);
      setCustomLiveInput('');
      setSelectedRefinementModel(DEFAULT_REFINEMENT);
      setCustomRefinementInput('');
    }
  }, [editingConfig]);

  const handleSaveForm = () => {
    const liveModel = selectedLiveModel === 'custom' ? customLiveInput : selectedLiveModel;
    const refinementModel = selectedRefinementModel === 'custom' ? customRefinementInput : selectedRefinementModel;
    if (!configNameInput || !apiKeyInput || !liveModel || !refinementModel ||
        (selectedLiveModel === 'custom' && !customLiveInput) ||
        (selectedRefinementModel === 'custom' && !customRefinementInput)) {
      alert("Please fill in all fields for the Gemini configuration.");
      return;
    }

    const newConfig: GeminiConfig = {
      id: editingConfig?.id || uuidv4(),
      name: configNameInput,
      apiKey: apiKeyInput,
      liveModelName: liveModel,
      refinementModelName: refinementModel,
    };
    onSaveConfig(newConfig);
    setEditingConfig(null);
  };

  const handleCancelEdit = () => setEditingConfig(null);

  const handleUploadBackground = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, WebP)');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }
    
    if (customBackgrounds.length >= 1) {
      alert('Maximum 1 custom background allowed. Delete existing one first.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        if (img.width > 1920 || img.height > 1080) {
          alert('Image resolution must be 1920x1080 or smaller');
          return;
        }
        const dataUrl = event.target?.result as string;
        onAddCustomBackground(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddConfig = () => {
    setEditingConfig({
      id: '',
      name: 'New Config',
      apiKey: '',
      liveModelName: DEFAULT_LIVE,
      refinementModelName: DEFAULT_REFINEMENT,
    });
  };

  const handleEditConfig = (config: GeminiConfig) => {
    setEditingConfig(config);
  };

  const handleLogout = () => {
    onLogout();
    onClose();
  };

  if (showLogoutConfirm) {
    return (
      <div className="fixed inset-0 z-[1600] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-6">
        <div className="max-w-md w-full bg-[#0a0a0a] border border-amber-500/30 rounded-[2.5rem] p-10 flex flex-col items-center text-center gap-8 shadow-[0_0_100px_rgba(212,175,55,0.1)]">
          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500">
            <AlertTriangle size={44} />
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-widest text-white">Sever Connection?</h2>
            <p className="text-gray-400 text-xs leading-relaxed">
              Are you sure, <span className="text-amber-500 font-black">{user?.displayName || 'Fragment'}</span>? Session persistence will be archived.
            </p>
          </div>
          <div className="w-full flex flex-col gap-4">
            <button 
              onClick={handleLogout} 
              className="w-full h-14 bg-amber-600 hover:bg-amber-500 text-black font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg active:scale-95"
            >
              Terminate
            </button>
            <button 
              onClick={() => setShowLogoutConfirm(false)} 
              className="w-full h-14 bg-white/5 hover:bg-white/10 text-gray-400 font-black uppercase tracking-widest rounded-2xl border border-white/5"
            >
              Maintain
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="max-w-xl w-full bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)] max-h-[90vh] relative">
        
        <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-black/40 shrink-0 relative z-30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 border border-amber-500/20 overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} className="w-full h-full object-cover" />
              ) : (
                <User size={24} />
              )}
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">{user?.displayName || 'Guest Fragment'}</h2>
              <p className="text-[10px] text-amber-500/60 font-bold tracking-widest uppercase">Neural command</p>
            </div>
          </div>
          
          <button onClick={onClose} className="w-[44px] h-[44px] flex items-center justify-center text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
          {/* BYOK / API Management Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-cyan-400">
                <Key size={16} />
                <h3 className="text-[10px] font-black uppercase tracking-widest">Neural Link (BYOK)</h3>
              </div>
              {isKeyActive && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[7px] font-black text-green-500 uppercase tracking-tighter">Active</span>
                </div>
              )}
            </div>

            <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6 space-y-6">
              <div className="space-y-2">
                <p className="text-gray-400 text-[11px] leading-relaxed">
                  High-fidelity transcription and academic refinement require a provided 
                  <span className="text-white font-bold"> Google AI Studio API Key</span> from a paid GCP project.
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <a 
                    href="https://ai.google.dev/gemini-api/docs/billing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-cyan-500/60 hover:text-cyan-400 text-[9px] font-black uppercase tracking-widest transition-colors"
                  >
                    Billing Documentation <ExternalLink size={10} />
                  </a>
                </div>
                <p className="text-gray-600 text-[9px] leading-relaxed">
                  Configs saved to {isGuest ? 'this browser (local storage)' : 'your profile (cloud sync)'}.
                </p>
              </div>

              {/* Display existing configs or the add/edit form */}
              {editingConfig ? (
                // Form for adding/editing a config
                <>
                  <label className="block space-y-2">
                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Config Name</span>
                    <input
                      type="text"
                      value={configNameInput}
                      onChange={(e) => setConfigNameInput(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      placeholder="e.g., My Pro Key"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Gemini API Key</span>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 pr-10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        placeholder="Enter your Gemini API Key here"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                      >
                        {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-cyan-500/60 hover:text-cyan-400 text-[9px] font-black uppercase tracking-widest transition-colors"
                    >
                      Get API key from Google AI Studio <ExternalLink size={10} />
                    </a>
                  </label>

                  <div className="space-y-2">
                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Live / Transcription (mic)</span>
                    <select
                      value={selectedLiveModel}
                      onChange={(e) => setSelectedLiveModel(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 [&_option]:bg-black [&_option]:text-white"
                    >
                      {LIVE_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    {isLiveCustom && (
                      <input
                        type="text"
                        value={customLiveInput}
                        onChange={(e) => setCustomLiveInput(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm mt-1"
                        placeholder="e.g., gemini-2.5-flash-native-audio-preview-12-2025"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Refinement (grammar/style)</span>
                    <select
                      value={selectedRefinementModel}
                      onChange={(e) => setSelectedRefinementModel(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 [&_option]:bg-black [&_option]:text-white"
                    >
                      {REFINEMENT_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    {isRefinementCustom && (
                      <input
                        type="text"
                        value={customRefinementInput}
                        onChange={(e) => setCustomRefinementInput(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm mt-1"
                        placeholder="e.g., gemini-1.5-flash-latest"
                      />
                    )}
                    <a
                      href="https://ai.google.dev/gemini-api/docs/models"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-cyan-500/60 hover:text-cyan-400 text-[9px] font-black uppercase tracking-widest transition-colors"
                    >
                      View models — copy-paste model IDs <ExternalLink size={10} />
                    </a>
                  </div>

                  <div className="flex gap-4 mt-6">
                    <button 
                      onClick={handleSaveForm}
                      className="flex-1 h-14 bg-cyan-600 hover:bg-cyan-500 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={18} />
                      Save Config
                    </button>
                    <button 
                      onClick={handleCancelEdit}
                      className="flex-1 h-14 bg-white/5 hover:bg-white/10 text-gray-400 font-black uppercase tracking-widest rounded-xl border border-white/5 flex items-center justify-center gap-2"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                // Display list of configs
                <>
                  <div className="space-y-3">
                    {geminiConfigs.length === 0 ? (
                      <p className="text-gray-500 text-center text-xs">No Gemini configurations saved. Add one!</p>
                    ) : (
                      geminiConfigs.map(config => (
                        <div key={config.id} className="flex items-center bg-white/5 border border-white/10 rounded-lg p-3">
                          <button onClick={() => onSetActiveConfig(config.id)} className="mr-3 text-gray-400 hover:text-cyan-400">
                            {config.id === activeGeminiConfigId ? <CheckSquare size={20} /> : <Square size={20} />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-white truncate">{config.name}</h4>
                            <p className="text-xs text-gray-500 truncate">
                              Live: {config.liveModelName ?? (config as any).modelName ?? '—'} · Refine: {config.refinementModelName ?? '—'}
                            </p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button onClick={() => handleEditConfig(config)} className="text-gray-400 hover:text-white">
                              <Edit3 size={18} />
                            </button>
                            <button onClick={() => onDeleteConfig(config.id)} className="text-gray-400 hover:text-red-500">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <button 
                    onClick={handleAddConfig}
                    className="w-full h-14 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 group"
                  >
                    <Plus size={18} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Add New Config</span>
                  </button>
                </>
              )}
            </div>
          </section>

          {/* Background Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 text-purple-400">
              <ImageIcon size={16} />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Canvas Background</h3>
            </div>
            <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6 space-y-4">
              {!showBackgroundMenu ? (
                <button
                  onClick={() => setShowBackgroundMenu(true)}
                  className="w-full h-16 rounded-xl border-2 border-white/10 hover:border-purple-500/50 transition-all relative overflow-hidden group"
                  style={(() => {
                    const defaultBgs: Record<string, any> = {
                      grid: { backgroundImage: 'radial-gradient(circle, #1a1a1a 1px, rgba(0, 0, 0, 0) 1px)', backgroundSize: '30px 30px' },
                      dots: { backgroundImage: 'radial-gradient(circle, #2a2a2a 2px, transparent 2px)', backgroundSize: '40px 40px' },
                      lines: { backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 29px, #1a1a1a 29px, #1a1a1a 30px)' },
                      solid: { backgroundColor: '#050505' },
                    };
                    if (defaultBgs[activeBackground]) return defaultBgs[activeBackground];
                    if (activeBackground.startsWith('#')) return { backgroundColor: activeBackground };
                    return { backgroundImage: `url(${activeBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' };
                  })()}
                >
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white">Change</span>
                  </div>
                </button>
              ) : !selectedBgOption ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {DEFAULT_BACKGROUNDS.map(bg => (
                      <button
                        key={bg.id}
                        onClick={() => setSelectedBgOption(bg.id)}
                        className="h-16 rounded-lg border border-white/10 hover:border-purple-500/50 transition-all relative overflow-hidden"
                        style={{ background: bg.value, backgroundSize: bg.size }}
                      >
                        <div className="absolute inset-0 bg-black/40 hover:bg-black/20 transition-colors flex items-center justify-center">
                          <span className="text-[7px] font-black uppercase text-white">{bg.name}</span>
                        </div>
                      </button>
                    ))}
                    {customBackgrounds.map((bg, idx) => (
                      <button
                        key={`custom-${idx}`}
                        onClick={() => setSelectedBgOption(bg)}
                        className="h-16 rounded-lg border border-white/10 hover:border-purple-500/50 transition-all"
                        style={{ backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                      />
                    ))}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={customBackgrounds.length >= 1}
                      className={`h-16 rounded-lg border border-dashed transition-all flex flex-col items-center justify-center text-[7px] font-bold uppercase ${
                        customBackgrounds.length >= 1 ? 'border-white/10 text-gray-600 cursor-not-allowed' : 'border-white/20 hover:border-purple-500/50 text-gray-400 hover:text-purple-400'
                      }`}
                      title="JPG/PNG/WebP, max 5MB, 1920x1080"
                    >
                      <Plus size={16} />
                      <span className="mt-1">Upload</span>
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleUploadBackground}
                    className="hidden"
                  />
                  <button onClick={() => setShowBackgroundMenu(false)} className="w-full text-[8px] text-gray-500 hover:text-white uppercase font-black tracking-widest">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div 
                    className="h-24 rounded-lg border border-purple-500/30 relative overflow-hidden"
                    style={(() => {
                      const bg = DEFAULT_BACKGROUNDS.find(b => b.id === selectedBgOption);
                      if (bg) return { background: bg.value, backgroundSize: bg.size };
                      if (selectedBgOption.startsWith('#')) return { backgroundColor: selectedBgOption };
                      return { backgroundImage: `url(${selectedBgOption})`, backgroundSize: 'cover', backgroundPosition: 'center' };
                    })()}
                  >
                    <button
                      onClick={() => setShowColorPicker(true)}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/80 hover:bg-black rounded-lg flex items-center justify-center text-purple-400 transition-all"
                    >
                      <Palette size={14} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onSetBackground(selectedBgOption); setShowBackgroundMenu(false); setSelectedBgOption(null); }}
                      className="flex-1 h-10 bg-purple-600 hover:bg-purple-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setSelectedBgOption(null)}
                      className="flex-1 h-10 bg-white/5 hover:bg-white/10 text-gray-400 text-[9px] font-black uppercase tracking-widest rounded-lg"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* System Status Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 text-cyan-400">
              <Zap size={16} />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Core Status</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatusCard 
                label="LIVE / TRANSCRIPTION" 
                value={geminiConfigs.find(c => c.id === activeGeminiConfigId)?.name || "N/A"} 
                detail={geminiConfigs.find(c => c.id === activeGeminiConfigId)?.liveModelName ?? (geminiConfigs.find(c => c.id === activeGeminiConfigId) as any)?.modelName ?? "—"}
                active={isKeyActive}
              />
              <StatusCard 
                label="REFINEMENT" 
                value={geminiConfigs.find(c => c.id === activeGeminiConfigId)?.name || "N/A"} 
                detail={geminiConfigs.find(c => c.id === activeGeminiConfigId)?.refinementModelName ?? "—"}
                active={isKeyActive}
              />
            </div>
          </section>

          {/* Version Info */}
          <div className="flex items-center justify-center gap-4 pt-4 opacity-20">
            <Info size={12} />
            <span className="text-[8px] font-black uppercase tracking-[0.4em]">Molecular v2.2.0-Neural-BYOK</span>
          </div>
        </div>

        <footer className="p-8 shrink-0 border-t border-white/5 bg-black/40 flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full h-16 bg-white/5 hover:bg-white/10 text-gray-400 font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all border border-white/5 flex items-center justify-center gap-3"
          >
            <LogOut size={18} />
            Terminate Link
          </button>
          <button 
            onClick={onClose} // This button now just closes the modal, save is handled by handleSaveForm
            className="w-full h-16 bg-cyan-600 hover:bg-cyan-500 text-black font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} />
            Return to Lattice
          </button>
        </footer>
      </div>
      
      {showColorPicker && (
        <ColorPicker
          currentColor={tempBgColor}
          savedColors={['#050505', '#0a0a0a', '#1a1a1a', '#2a2a2a']}
          onColorSelect={setTempBgColor}
          onSave={(color) => {
            setSelectedBgOption(color);
            setShowColorPicker(false);
          }}
          onClose={() => setShowColorPicker(false)}
        />
      )}
    </div>
  );
};

const StatusCard: React.FC<{ label: string, value: string, detail: string, active?: boolean }> = ({ label, value, detail, active }) => (
  <div className={`bg-black border p-5 rounded-2xl flex flex-col gap-1 transition-all ${active ? 'border-cyan-500/20 shadow-[0_0_20px_rgba(0,255,255,0.02)]' : 'border-white/5'}`}>
    <div className="text-[8px] text-gray-600 font-black uppercase tracking-widest">{label}</div>
    <div className={`text-[10px] font-black uppercase tracking-wider ${active ? 'text-cyan-500' : 'text-gray-400'}`}>{value}</div>
    <div className="text-[7px] text-gray-700 font-bold uppercase tracking-tighter mt-1">{detail}</div>
  </div>
);

export default SettingsModal;
