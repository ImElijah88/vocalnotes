import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import RadialMenu from './components/RadialMenu';
import NoteModal from './components/NoteModal';
import CreateMenu from './components/CreateMenu';
import ColorPicker from './components/ColorPicker';
import LandingPage from './components/LandingPage';
import SettingsModal from './components/SettingsModal';
import ShareModal from './components/ShareModal';
import OnboardingHint from './components/OnboardingHint';
import Toast from './components/Toast';
import { Folder, Note, Connection, Point, NoteType, LineType, RadialOption, GeminiConfig } from './types';
import { v4 as uuidv4 } from 'uuid';
import { Lightbulb, Footprints, FileText, DollarSign, Wrench, User, Trash2, AlertTriangle, CheckSquare } from 'lucide-react';
import { auth, db, logout } from './services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { playSound, haptic } from './utils/feedback';
const MOCK_FOLDERS: Folder[] = [
  { id: 'f1', name: 'Molecular Architecture', order: 0 },
  { id: 'f2', name: 'Project: Neural Interface', order: 1 },
];

const MOCK_NOTES: Note[] = [
  { id: 'n1', folderId: 'f1', title: 'CORE CONCEPT', content: 'The fundamental principle of molecular note-taking is non-linear progression.', x: 400, y: 300, type: 'idea', color: '#00FFFF' },
  { id: 'n2', folderId: 'f1', title: 'DATABASE SCHEMA', content: 'Utilizing Firestore for real-time synchronization across nodes.', x: 600, y: 200, type: 'tool', color: '#D946EF' },
];

const MOCK_CONNECTIONS: Connection[] = [
  { id: 'c1', from: 'n1', to: 'n2', lineType: 'cable', color: '#FFFFFF', thickness: 2 },
];

// Constants for localStorage keys
const GEMINI_CONFIGS_STORAGE_KEY = 'gemini_configs';
const ACTIVE_GEMINI_CONFIG_ID_STORAGE_KEY = 'active_gemini_config_id';
const DEFAULT_LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
const DEFAULT_REFINEMENT_MODEL = 'gemini-1.5-flash-latest';

function migrateGeminiConfig(c: Partial<GeminiConfig>): GeminiConfig {
  const live = (c as any).liveModelName ?? (c as any).modelName ?? DEFAULT_LIVE_MODEL;
  const refinement = (c as any).refinementModelName ?? ((c as any).modelName && !String((c as any).modelName).includes('native-audio') ? (c as any).modelName : DEFAULT_REFINEMENT_MODEL);
  return {
    id: c.id!,
    name: c.name!,
    apiKey: c.apiKey ?? '',
    liveModelName: live,
    refinementModelName: refinement,
  };
}

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(() => localStorage.getItem('molecular_is_guest') === 'true');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [folders, setFolders] = useState<Folder[]>(MOCK_FOLDERS);
  const [activeFolderId, setActiveFolderId] = useState<string>(MOCK_FOLDERS[0].id);
  const [notes, setNotes] = useState<Note[]>(MOCK_NOTES);
  const [connections, setConnections] = useState<Connection[]>(MOCK_CONNECTIONS);
  const [savedColors, setSavedColors] = useState<string[]>(['#00FFFF', '#D946EF', '#FFFFFF', '#22D3EE', '#A855F7']);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState<'pan' | 'select' | 'color'>('select');
  const [activeLineType, setActiveLineType] = useState<LineType>('cable');
  const [activeLineThickness, setActiveLineThickness] = useState(2);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [activeColor, setActiveColor] = useState('#00FFFF');

  const [radialPos, setRadialPos] = useState<Point | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);
  const [movingNodeId, setMovingNodeId] = useState<string | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [potentialTargetId, setPotentialTargetId] = useState<string | null>(null);
  const [targetNodeId, setTargetNodeId] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<Point>({ x: 0, y: 0 });
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [sharingNoteId, setSharingNoteId] = useState<string | null>(null);
  const [showOnboardingHint, setShowOnboardingHint] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastKey, setToastKey] = useState(0);

  // Background state
  const [activeBackground, setActiveBackground] = useState<string>('grid');
  const [customBackgrounds, setCustomBackgrounds] = useState<string[]>([]);

  // New states for Gemini configurations
  const [geminiConfigs, setGeminiConfigs] = useState<GeminiConfig[]>([]);
  const [activeGeminiConfigId, setActiveGeminiConfigId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const lastTouchDistRef = useRef<number | null>(null);
  const lastPointRef = useRef<Point | null>(null);
  const movingNodeIdRef = useRef<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    movingNodeIdRef.current = movingNodeId;
  }, [movingNodeId]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setIsGuest(false);
      setIsInitializing(false);
    });
    return () => unsubAuth();
  }, []);

  // Show onboarding hint for first-time users
  useEffect(() => {
    if (!isInitializing && (user || isGuest)) {
      const hasSeenHint = localStorage.getItem('molecular_onboarding_hint_shown');
      if (!hasSeenHint) {
        setTimeout(() => setShowOnboardingHint(true), 1000);
      }
    }
  }, [isInitializing, user, isGuest]);

  // Derived active Gemini API key and model name
  const currentActiveGeminiConfig = useMemo(() => {
    if (activeGeminiConfigId) {
      return geminiConfigs.find(config => config.id === activeGeminiConfigId);
    }
    // Fallback: if no active ID, try to find a config named "Default", or just the first one
    if (geminiConfigs.length === 1) return geminiConfigs[0];
    return geminiConfigs.find(config => config.name === "Default") || geminiConfigs[0];
  }, [geminiConfigs, activeGeminiConfigId]);

  const activeApiKey = currentActiveGeminiConfig?.apiKey || '';
  const activeLiveModelName = currentActiveGeminiConfig ? migrateGeminiConfig(currentActiveGeminiConfig).liveModelName : DEFAULT_LIVE_MODEL;
  const activeRefinementModelName = currentActiveGeminiConfig ? migrateGeminiConfig(currentActiveGeminiConfig).refinementModelName : DEFAULT_REFINEMENT_MODEL;

  // Callback to persist all data, including Gemini configs
  const persistData = useCallback(async (
    newFolders: Folder[], 
    newNotes: Note[], 
    newConnections: Connection[], 
    newColors: string[],
    newGeminiConfigs: GeminiConfig[], // New parameter
    newActiveGeminiConfigId: string | null, // New parameter
    newActiveBackground: string,
    newCustomBackgrounds: string[]
  ) => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        folders: newFolders,
        notes: newNotes,
        connections: newConnections,
        savedColors: newColors,
        geminiConfigs: newGeminiConfigs, // Save to Firestore
        activeGeminiConfigId: newActiveGeminiConfigId, // Save to Firestore
        activeBackground: newActiveBackground,
        customBackgrounds: newCustomBackgrounds,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } else if (isGuest) {
      localStorage.setItem('molecular_notes', JSON.stringify(newNotes));
      localStorage.setItem('molecular_connections', JSON.stringify(newConnections));
      localStorage.setItem('molecular_folders', JSON.stringify(newFolders));
      localStorage.setItem('molecular_colors', JSON.stringify(newColors));
      localStorage.setItem(GEMINI_CONFIGS_STORAGE_KEY, JSON.stringify(newGeminiConfigs)); // Save to localStorage
      localStorage.setItem(ACTIVE_GEMINI_CONFIG_ID_STORAGE_KEY, newActiveGeminiConfigId || ''); // Save to localStorage
      localStorage.setItem('molecular_background', newActiveBackground);
      localStorage.setItem('molecular_custom_backgrounds', JSON.stringify(newCustomBackgrounds));
    }
  }, [user, isGuest]);

  // General data update callback
  const updateData = useCallback((updater: { 
    notes?: Note[], 
    folders?: Folder[], 
    connections?: Connection[], 
    colors?: string[]
  },
  geminiUpdater?: {
    configs?: GeminiConfig[],
    activeConfigId?: string | null
  }) => {
    const updatedNotes = updater.notes ?? notes;
    const updatedFolders = updater.folders ?? folders;
    const updatedConnections = updater.connections ?? connections;
    const updatedColors = updater.colors ?? savedColors;
    const updatedGeminiConfigs = geminiUpdater?.configs ?? geminiConfigs;
    const updatedActiveGeminiConfigId = geminiUpdater?.activeConfigId ?? activeGeminiConfigId;

    if (updater.notes) setNotes(updater.notes);
    if (updater.folders) setFolders(updater.folders);
    if (updater.connections) setConnections(updater.connections);
    if (updater.colors) setSavedColors(updater.colors);
    if (geminiUpdater?.configs) setGeminiConfigs(geminiUpdater.configs);
    if (geminiUpdater?.activeConfigId !== undefined) setActiveGeminiConfigId(geminiUpdater.activeConfigId);
    
    // Pass all current states to persistData
    persistData(updatedFolders, updatedNotes, updatedConnections, updatedColors, updatedGeminiConfigs, updatedActiveGeminiConfigId, activeBackground, customBackgrounds);
  }, [notes, folders, connections, savedColors, geminiConfigs, activeGeminiConfigId, persistData]);

  // Initial data load and Gemini config setup
  useEffect(() => {
    if (isInitializing) return;

    const loadGeminiConfigs = () => {
      let loadedConfigs: GeminiConfig[] = [];
      let loadedActiveConfigId: string | null = null;

      if (isGuest) {
        const savedConfigs = localStorage.getItem(GEMINI_CONFIGS_STORAGE_KEY);
        if (savedConfigs) {
          loadedConfigs = JSON.parse(savedConfigs);
        }
        loadedActiveConfigId = localStorage.getItem(ACTIVE_GEMINI_CONFIG_ID_STORAGE_KEY);
      }
      // For authenticated users, data is loaded via onSnapshot, handled below

      if (loadedConfigs.length === 0) {
        const initialApiKey = process.env.API_KEY || '';
        const defaultId = uuidv4();
        const defaultConfig: GeminiConfig = { 
          id: defaultId, 
          name: "Default Config", 
          apiKey: initialApiKey, 
          liveModelName: DEFAULT_LIVE_MODEL, 
          refinementModelName: DEFAULT_REFINEMENT_MODEL 
        };
        loadedConfigs = [defaultConfig];
        loadedActiveConfigId = defaultId;
      } else {
        loadedConfigs = loadedConfigs.map(c => migrateGeminiConfig(c));
      }

      setGeminiConfigs(loadedConfigs);
      setActiveGeminiConfigId(loadedActiveConfigId);
    };

    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsub = onSnapshot(userDocRef, (snapshot) => {
        // Don't update notes if we're currently moving one
        if (movingNodeIdRef.current && movingNodeIdRef.current !== 'PAN_CANVAS') {
          return;
        }
        
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.folders) setFolders(data.folders);
          if (data.notes) setNotes(data.notes);
          if (data.connections) setConnections(data.connections);
          if (data.savedColors) setSavedColors(data.savedColors);
          
      if (data.geminiConfigs) setGeminiConfigs((data.geminiConfigs as any[]).map((c: any) => migrateGeminiConfig(c)));
          if (data.activeGeminiConfigId !== undefined) setActiveGeminiConfigId(data.activeGeminiConfigId);
          if (data.activeBackground) setActiveBackground(data.activeBackground);
          if (data.customBackgrounds) setCustomBackgrounds(data.customBackgrounds);
        } else {
          const initialApiKey = process.env.API_KEY || '';
          const defaultId = uuidv4();
          const defaultConfig: GeminiConfig = { 
            id: defaultId, 
            name: "Default Config", 
            apiKey: initialApiKey, 
            liveModelName: DEFAULT_LIVE_MODEL, 
            refinementModelName: DEFAULT_REFINEMENT_MODEL 
          };
          persistData(MOCK_FOLDERS, MOCK_NOTES, MOCK_CONNECTIONS, savedColors, [defaultConfig], defaultId, 'grid', []);
        }
      });
      return () => unsub();
    } else if (isGuest) {
      const savedNotes = localStorage.getItem('molecular_notes');
      const savedConns = localStorage.getItem('molecular_connections');
      const savedFolders = localStorage.getItem('molecular_folders');
      const savedColorsLocal = localStorage.getItem('molecular_colors');
      if (savedNotes) setNotes(JSON.parse(savedNotes));
      if (savedConns) setConnections(JSON.parse(savedConns));
      if (savedFolders) setFolders(JSON.parse(savedFolders));
      if (savedColorsLocal) setSavedColors(JSON.parse(savedColorsLocal));
      
      const savedBg = localStorage.getItem('molecular_background');
      if (savedBg) setActiveBackground(savedBg);
      const savedCustomBgs = localStorage.getItem('molecular_custom_backgrounds');
      if (savedCustomBgs) setCustomBackgrounds(JSON.parse(savedCustomBgs));
      
      // Load Gemini settings for guest
      loadGeminiConfigs();
    }
  }, [user, isGuest, isInitializing, savedColors, persistData]);


  // Callbacks for managing Gemini configurations
  const handleSaveGeminiConfig = useCallback((config: GeminiConfig) => {
    setGeminiConfigs(prevConfigs => {
      const existingIndex = prevConfigs.findIndex(c => c.id === config.id);
      let newConfigs;
      if (existingIndex > -1) {
        newConfigs = prevConfigs.map((c, i) => i === existingIndex ? config : c);
      } else {
        newConfigs = [...prevConfigs, config];
      }
      updateData({}, { configs: newConfigs });
      return newConfigs;
    });
  }, [updateData]);

  const handleDeleteGeminiConfig = useCallback((configId: string) => {
    setGeminiConfigs(prevConfigs => {
      const newConfigs = prevConfigs.filter(c => c.id !== configId);
      // If the deleted config was active, set active to null or another config
      if (activeGeminiConfigId === configId) {
        setActiveGeminiConfigId(newConfigs.length > 0 ? newConfigs[0].id : null);
        updateData({}, { configs: newConfigs, activeConfigId: newConfigs.length > 0 ? newConfigs[0].id : null });
      } else {
        updateData({}, { configs: newConfigs });
      }
      return newConfigs;
    });
  }, [activeGeminiConfigId, updateData]);

  const handleSetActiveGeminiConfig = useCallback((configId: string) => {
    setActiveGeminiConfigId(configId);
    updateData({}, { activeConfigId: configId });
  }, [updateData]);

  const handleLogout = useCallback(() => {
    if (user) {
      logout();
    } else if (isGuest) {
      localStorage.removeItem('molecular_is_guest');
      localStorage.removeItem('molecular_notes');
      localStorage.removeItem('molecular_connections');
      localStorage.removeItem('molecular_folders');
      localStorage.removeItem('molecular_colors');
      localStorage.removeItem(GEMINI_CONFIGS_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_GEMINI_CONFIG_ID_STORAGE_KEY);
      setIsGuest(false);
    }
    setIsSettingsOpen(false);
  }, [user, isGuest]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheelManual = (e: WheelEvent) => {
      e.preventDefault();
      // Smooth omni-directional panning via wheel/trackpad
      setPan(p => ({
        x: p.x - e.deltaX,
        y: p.y - e.deltaY
      }));
    };

    canvas.addEventListener('wheel', onWheelManual, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheelManual);
  }, []);

  const getCanvasCoords = useCallback((e: any): Point => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    let cx, cy;
    if (e.touches && e.touches.length > 0) {
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
    } else {
      cx = e.clientX;
      cy = e.clientY;
    }
    return {
      x: (cx - rect.left - pan.x) / zoom,
      y: (cy - rect.top - pan.y) / zoom
    };
  }, [pan, zoom]);

  const handleToolSelect = (tool: 'pan' | 'color' | 'zoom-in' | 'zoom-out' | 'thickness-up' | 'thickness-down' | LineType) => {
    if (tool === 'zoom-in') { setZoom(z => Math.min(z + 0.15, 5)); return; }
    if (tool === 'zoom-out') { setZoom(z => Math.max(z - 0.15, 0.1)); return; }
    if (tool === 'thickness-up') { setActiveLineThickness(t => Math.min(t + 1, 12)); return; }
    if (tool === 'thickness-down') { setActiveLineThickness(t => Math.max(t - 1, 1)); return; }
    
    if (['solid', 'dashed', 'dotted', 'arrow', 'double', 'glow', 'cable'].includes(tool as string)) {
      setActiveLineType(tool as LineType);
      setActiveTool('select');
      return;
    }
    if (tool === 'color') {
      setIsColorPickerOpen(!isColorPickerOpen);
      setIsCreateMenuOpen(false);
      return;
    }
    setActiveTool(activeTool === tool ? 'select' : tool as any);
    setIsCreateMenuOpen(false);
    setIsColorPickerOpen(false);
  };

  const handleInputStart = useCallback((e: any, nodeId?: string) => {
    if (e.touches && e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      lastTouchDistRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      // Clear any existing long-press timer when pinch starts
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
      return;
    }

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    lastPointRef.current = { x: clientX, y: clientY };

    const coords = getCanvasCoords(e);
    setCursorPos(coords);

    if (activeTool === 'pan') {
      setMovingNodeId('PAN_CANVAS');
      return;
    }

    // If a node is already in move mode or connecting, don't allow long-press
    if (movingNodeId || connectingFromId) {
      return;
    }

    // Start long press timer for radial menu
    const timer = window.setTimeout(() => {
      setRadialPos({ x: coords.x * zoom + pan.x, y: coords.y * zoom + pan.y });
      setTargetNodeId(nodeId || null);
    }, 450);
    setLongPressTimer(timer);
  }, [activeTool, movingNodeId, getCanvasCoords, connectingFromId, zoom, pan, longPressTimer]);

  const handleInputMove = useCallback((e: any) => {
    if (e.touches && e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (lastTouchDistRef.current !== null) {
        const delta = dist / lastTouchDistRef.current;
        setZoom(z => Math.max(0.1, Math.min(5, z * delta)));
      }
      lastTouchDistRef.current = dist;
      return;
    }

    // Only process move if we have a starting point
    if (!lastPointRef.current) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const dx = clientX - lastPointRef.current.x;
    const dy = clientY - lastPointRef.current.y;
    
    lastPointRef.current = { x: clientX, y: clientY };

    const coords = getCanvasCoords(e);
    setCursorPos(coords);

    if (movingNodeIdRef.current === 'PAN_CANVAS') {
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      if (longPressTimer) { clearTimeout(longPressTimer); setLongPressTimer(null); }
    } else if (movingNodeIdRef.current && movingNodeIdRef.current !== 'PAN_CANVAS') {
      // This is normal drag with mouse button held - don't interfere with move mode
      setNotes(prev => prev.map(n => n.id === movingNodeIdRef.current ? { ...n, x: coords.x, y: coords.y } : n));
      if (longPressTimer) { clearTimeout(longPressTimer); setLongPressTimer(null); }
    }

    // Check for potential connection targets
    if (connectingFromId) {
      let foundTarget: string | null = null;
      for (const note of notes) {
        if (note.id === connectingFromId || note.folderId !== activeFolderId) continue;
        const dist = Math.sqrt(Math.pow(note.x - coords.x, 2) + Math.pow(note.y - coords.y, 2));
        if (dist < 44) { foundTarget = note.id; break; }
      }
      setPotentialTargetId(foundTarget);
      if (longPressTimer) { clearTimeout(longPressTimer); setLongPressTimer(null); }
    }
  }, [getCanvasCoords, longPressTimer, connectingFromId, notes, activeFolderId]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);
    setCursorPos(coords);
    
    // Check for potential connection targets when connecting
    if (connectingFromId) {
      let foundTarget: string | null = null;
      for (const note of notes) {
        if (note.id === connectingFromId || note.folderId !== activeFolderId) continue;
        const dist = Math.sqrt(Math.pow(note.x - coords.x, 2) + Math.pow(note.y - coords.y, 2));
        if (dist < 44) { foundTarget = note.id; break; }
      }
      setPotentialTargetId(foundTarget);
    }
    
    if (movingNodeIdRef.current && movingNodeIdRef.current !== 'PAN_CANVAS') {
      setNotes(prev => prev.map(n => 
        n.id === movingNodeIdRef.current ? { ...n, x: coords.x, y: coords.y } : n
      ));
      return;
    }
    
    if (lastPointRef.current) {
      handleInputMove(e);
    }
  }, [getCanvasCoords, handleInputMove, connectingFromId, notes, activeFolderId]);

  const handleCanvasTouchMove = useCallback((e: React.TouchEvent) => {
    const coords = getCanvasCoords(e);
    setCursorPos(coords);
    
    // Check for potential connection targets when connecting
    if (connectingFromId) {
      let foundTarget: string | null = null;
      for (const note of notes) {
        if (note.id === connectingFromId || note.folderId !== activeFolderId) continue;
        const dist = Math.sqrt(Math.pow(note.x - coords.x, 2) + Math.pow(note.y - coords.y, 2));
        if (dist < 44) { foundTarget = note.id; break; }
      }
      setPotentialTargetId(foundTarget);
    }
    
    if (movingNodeIdRef.current && movingNodeIdRef.current !== 'PAN_CANVAS') {
      setNotes(prev => prev.map(n => 
        n.id === movingNodeIdRef.current ? { ...n, x: coords.x, y: coords.y } : n
      ));
      return;
    }
    
    handleInputMove(e);
  }, [getCanvasCoords, handleInputMove, connectingFromId, notes, activeFolderId]);

  const handleCanvasMouseLeave = useCallback((e: React.MouseEvent) => {
    if (movingNodeIdRef.current && movingNodeIdRef.current !== 'PAN_CANVAS') {
      updateData({ notes });
      setMovingNodeId(null);
    } else {
      handleInputEnd(e);
    }
  }, [notes, updateData]);

  const handleInputEnd = (e: any) => {
    lastTouchDistRef.current = null;
    lastPointRef.current = null;
    if (longPressTimer) { clearTimeout(longPressTimer); setLongPressTimer(null); }
    
    if (movingNodeId === 'PAN_CANVAS') {
      setMovingNodeId(null);
      return;
    } 
    
    if (movingNodeId) {
      updateData({ notes });
      setMovingNodeId(null);
      return;
    }
    
    if (connectingFromId && potentialTargetId) {
      const existingConnIndex = connections.findIndex(c => 
        (c.from === connectingFromId && c.to === potentialTargetId) || 
        (c.from === potentialTargetId && c.to === connectingFromId)
      );
      if (existingConnIndex !== -1) {
        const newConnections = [...connections];
        newConnections.splice(existingConnIndex, 1);
        updateData({ connections: newConnections });
      } else {
        updateData({ 
          connections: [
            ...connections, 
            { 
              id: uuidv4(), 
              from: connectingFromId, 
              to: potentialTargetId, 
              lineType: activeLineType, 
              color: activeColor,
              thickness: activeLineThickness
            }
          ] 
        });
        playSound.pop();
        haptic.light();
        setToastMessage('Connected ✓');
        setToastKey(prev => prev + 1);
        setShowToast(true);
      }
      setConnectingFromId(null);
      setPotentialTargetId(null);
    } else if (connectingFromId) {
      setConnectingFromId(null);
      setPotentialTargetId(null);
    }
  };

  const createNote = (type: NoteType) => {
    const id = uuidv4();
    const x = radialPos ? (radialPos.x - pan.x) / zoom : cursorPos.x;
    const y = radialPos ? (radialPos.y - pan.y) / zoom : cursorPos.y;
    const newNote: Note = { id, folderId: activeFolderId, title: type.toUpperCase(), content: '', x, y, type, color: activeColor };
    updateData({ notes: [...notes, newNote] });
    setIsCreateMenuOpen(false);
    setRadialPos(null);
    playSound.success();
    haptic.medium();
    setToastMessage('Note created ✓');
    setToastKey(prev => prev + 1);
    setShowToast(true);
  };

  const renderConnection = (conn: Connection) => {
    const from = notes.find(n => n.id === conn.from);
    const to = notes.find(n => n.id === conn.to);
    if (!from || !to) return null;

    const baseProps = {
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      stroke: conn.color,
      strokeWidth: conn.thickness || 2,
    };

    const d = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;

    if (conn.lineType === 'cable') {
      return (
        <g key={conn.id}>
          <path d={d} stroke="#1a1a1a" strokeWidth="6" strokeLinecap="round" />
          <path d={d} stroke="#333333" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          <circle r="2.5" fill={from.color} className="drop-shadow-[0_0_3px_currentColor]">
            <animateMotion dur="5s" repeatCount="indefinite" path={d} />
          </circle>
        </g>
      );
    }

    if (conn.lineType === 'arrow') {
      return (
        <g key={conn.id}>
          <path d={d} {...baseProps} fill="none" opacity="0.2" />
          <path d="M -6 -4 L 0 0 L -6 4" fill="none" stroke={from.color} strokeWidth={conn.thickness} strokeLinecap="round" strokeLinejoin="round">
            <animateMotion 
              dur="4s" 
              repeatCount="indefinite" 
              path={d} 
              rotate="auto"
            />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="4s" repeatCount="indefinite" />
          </path>
        </g>
      );
    }

    if (conn.lineType === 'double') {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / len * 3;
      const ny = dx / len * 3;
      return (
        <g key={conn.id}>
          <line {...baseProps} x1={from.x + nx} y1={from.y + ny} x2={to.x + nx} y2={to.y + ny} />
          <line {...baseProps} x1={from.x - nx} y1={from.y - ny} x2={to.x - nx} y2={to.y - ny} />
        </g>
      );
    }

    if (conn.lineType === 'glow') {
      return (
        <g key={conn.id}>
          <line {...baseProps} strokeWidth={(conn.thickness || 2) * 4} opacity="0.1" className="blur-md" />
          <line {...baseProps} strokeWidth={(conn.thickness || 2) * 2} opacity="0.2" className="blur-sm" />
          <line {...baseProps} />
        </g>
      );
    }

    if (conn.lineType === 'solid') {
      return (
        <g key={conn.id}>
          <line {...baseProps} />
          <text fontSize="20" fill={from.color} fontWeight="bold">
            <animateMotion dur="4s" repeatCount="indefinite" path={d} />
            <tspan>→</tspan>
          </text>
        </g>
      );
    }

    if (conn.lineType === 'dashed') {
      return (
        <g key={conn.id}>
          <line {...baseProps} strokeDasharray="8,8" />
          <circle r="5" fill={from.color} opacity="0.8">
            <animateMotion dur="3.5s" repeatCount="indefinite" path={d} />
          </circle>
        </g>
      );
    }

    if (conn.lineType === 'dotted') {
      return (
        <g key={conn.id}>
          <line {...baseProps} strokeDasharray="2,4" />
          <text fontSize="20" fill={from.color} fontWeight="bold">
            <animateMotion dur="5s" repeatCount="indefinite" path={d} />
            <tspan>$</tspan>
          </text>
        </g>
      );
    }

    return <line key={conn.id} {...baseProps} />;
  };

  const updateNoteTitle = (id: string, newTitle: string) => {
    updateData({ notes: notes.map(n => n.id === id ? { ...n, title: newTitle || n.type.toUpperCase() } : n) });
    setEditingTitleId(null);
  };

  const getIconForType = (type: NoteType, size: number = 20) => {
    switch(type) {
      case 'idea': return <Lightbulb size={size} />;
      case 'step': return <Footprints size={size} />;
      case 'note': return <FileText size={size} />;
      case 'cost': return <DollarSign size={size} />;
      case 'tool': return <Wrench size={size} />;
      case 'actor': return <User size={size} />;
      case 'task': return <CheckSquare size={size} />;
      default: return <FileText size={size} />;
    }
  };

  const getBackgroundStyle = () => {
    const defaultBgs: Record<string, any> = {
      grid: { backgroundImage: 'radial-gradient(circle, #1a1a1a 1px, rgba(0, 0, 0, 0) 1px)', backgroundSize: '30px 30px' },
      dots: { backgroundImage: 'radial-gradient(circle, #2a2a2a 2px, transparent 2px)', backgroundSize: '40px 40px' },
      lines: { backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 29px, #1a1a1a 29px, #1a1a1a 30px)' },
      solid: { backgroundColor: '#050505' },
      spline1: { backgroundColor: '#000000' },
    };
    if (defaultBgs[activeBackground]) return defaultBgs[activeBackground];
    if (activeBackground.startsWith('#')) return { backgroundColor: activeBackground };
    if (activeBackground.includes('spline.design')) return { backgroundColor: '#000000' };
    return { backgroundImage: `url(${activeBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  };

  if (isInitializing) return null;
  if (!user && !isGuest) return <LandingPage onGuestAccess={() => { setIsGuest(true); localStorage.setItem('molecular_is_guest', 'true'); }} />;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050505] relative selection:bg-cyan-500/20" style={getBackgroundStyle()}>
      {(activeBackground.includes('spline.design') || activeBackground === 'spline1') && (
        <iframe 
          src={activeBackground === 'spline1' ? 'https://my.spline.design/blackhole-P8xBUx7R2aecELsor3E9OaRQ/' : activeBackground}
          className="absolute inset-0 w-full h-full pointer-events-none border-0"
        />
      )}
      {!editingNoteId && (
        <Sidebar 
          user={user}
          onLogout={handleLogout}
          folders={folders}
          notes={notes}
          activeFolderId={activeFolderId}
          onFolderSelect={setActiveFolderId}
          onAddFolder={() => updateData({ folders: [...folders, { id: uuidv4(), name: 'New Canvas', order: folders.length }] })}
          onUpdateFolders={(f) => updateData({ folders: f })}
          onMoveNoteToFolder={(nid, fid) => {
            const updatedNotes = notes.map(n => n.id === nid ? { ...n, folderId: fid } : n);
            const orphanedConnections = connections.filter(c => {
              const fromNote = updatedNotes.find(n => n.id === c.from);
              const toNote = updatedNotes.find(n => n.id === c.to);
              return fromNote && toNote && fromNote.folderId === toNote.folderId;
            });
            updateData({ notes: updatedNotes, connections: orphanedConnections });
          }}
          onToolSelect={handleToolSelect}
          activeTool={activeTool}
          activeColor={activeColor}
          activeLineType={activeLineType}
          activeLineThickness={activeLineThickness}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onShowToast={(msg) => { setToastMessage(msg); setShowToast(true); }}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal 
          user={user} 
          isGuest={isGuest} 
          onLogout={handleLogout} 
          onClose={() => setIsSettingsOpen(false)}
          geminiConfigs={geminiConfigs} // Pass all configs
          activeGeminiConfigId={activeGeminiConfigId} // Pass active config ID
          onSaveConfig={handleSaveGeminiConfig} // Pass save callback
          onDeleteConfig={handleDeleteGeminiConfig} // Pass delete callback
          onSetActiveConfig={handleSetActiveGeminiConfig} // Pass set active callback
          activeBackground={activeBackground}
          customBackgrounds={customBackgrounds}
          onSetBackground={(bg) => { setActiveBackground(bg); persistData(folders, notes, connections, savedColors, geminiConfigs, activeGeminiConfigId, bg, customBackgrounds); }}
          onAddCustomBackground={(bg) => { const newBgs = [...customBackgrounds, bg]; setCustomBackgrounds(newBgs); persistData(folders, notes, connections, savedColors, geminiConfigs, activeGeminiConfigId, activeBackground, newBgs); }}
          onDeleteCustomBackground={(bg) => { const newBgs = customBackgrounds.filter(b => b !== bg); setCustomBackgrounds(newBgs); persistData(folders, notes, connections, savedColors, geminiConfigs, activeGeminiConfigId, activeBackground, newBgs); }}
        />
      )}

      {isCreateMenuOpen && radialPos && (
        <CreateMenu x={radialPos.x} y={radialPos.y} onSelect={createNote} onClose={() => { setIsCreateMenuOpen(false); setRadialPos(null); }} />
      )}

      {isColorPickerOpen && (
        <ColorPicker 
          currentColor={activeColor} 
          savedColors={savedColors} 
          onColorSelect={setActiveColor} 
          onSave={(c) => { 
            const newColors = [c, ...savedColors.filter(x => x !== c)];
            updateData({ colors: newColors });
            setActiveColor(c); 
            setIsColorPickerOpen(false); 
          }}
          onClose={() => setIsColorPickerOpen(false)}
        />
      )}

      <main 
        ref={canvasRef}
        className={`flex-1 relative overflow-hidden touch-none ${activeTool === 'pan' ? 'cursor-grab active:cursor-grabbing' : movingNodeId && movingNodeId !== 'PAN_CANVAS' ? 'cursor-move' : 'cursor-crosshair'}`}
        onMouseDown={handleInputStart}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleInputEnd}
        onMouseLeave={handleCanvasMouseLeave}
        onTouchStart={handleInputStart}
        onTouchMove={handleCanvasTouchMove}
        onTouchEnd={handleInputEnd}
      >
        <div 
          className="absolute inset-0 transition-transform duration-75 origin-top-left"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          <svg className="absolute inset-0 w-[8000px] h-[8000px] pointer-events-none">
            {connections.filter(c => notes.find(n => n.id === c.from)?.folderId === activeFolderId).map(renderConnection)}
            {connectingFromId && (
              <line 
                x1={notes.find(n => n.id === connectingFromId)?.x} 
                y1={notes.find(n => n.id === connectingFromId)?.y} 
                x2={potentialTargetId ? notes.find(n => n.id === potentialTargetId)?.x : cursorPos.x} 
                y2={potentialTargetId ? notes.find(n => n.id === potentialTargetId)?.y : cursorPos.y} 
                stroke={activeColor} strokeWidth={activeLineThickness} 
                strokeDasharray={activeLineType === 'dashed' ? "8,8" : activeLineType === 'dotted' ? "1,4" : undefined}
                className="animate-pulse"
              />
            )}
          </svg>

          {notes.filter(n => n.folderId === activeFolderId).map(note => (
            <div
              key={note.id}
              onMouseDown={(e) => { e.stopPropagation(); handleInputStart(e, note.id); }}
              onMouseUp={(e) => { e.stopPropagation(); handleInputEnd(e); }}
              onTouchStart={(e) => { e.stopPropagation(); handleInputStart(e, note.id); }}
              onTouchEnd={(e) => { e.stopPropagation(); handleInputEnd(e); }}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 w-[44px] h-[44px] rounded-xl flex flex-col items-center justify-center bg-[#0a0a0a] border border-white/5 group ${
                movingNodeId === note.id ? 'z-50 border-cyan-500 shadow-[0_0_15px_rgba(0,255,255,0.2)] scale-110' : 'transition-all hover:border-cyan-500/50'
              } ${
                potentialTargetId === note.id ? 'scale-125 ring-4 ring-cyan-500 shadow-[0_0_30px_rgba(0,255,255,0.6)] z-50 animate-pulse' : ''
              }`}
              style={{ left: note.x, top: note.y, color: note.color, borderColor: potentialTargetId === note.id ? '#00FFFF' : undefined }}
            >
              <div className="flex flex-col items-center gap-0.5">
                {getIconForType(note.type, 20)}
                {editingTitleId === note.id ? (
                  <input 
                    autoFocus 
                    className="bg-transparent text-[7px] text-center uppercase font-black tracking-tighter outline-none border-b py-0 min-w-[40px]" 
                    style={{ borderBottomColor: note.color, color: note.color, width: 'auto' }} 
                    defaultValue={note.title} 
                    onBlur={(e) => updateNoteTitle(note.id, e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && updateNoteTitle(note.id, e.currentTarget.value)} 
                    onMouseDown={(e) => e.stopPropagation()} 
                  />
                ) : (
                  <span onDoubleClick={(e) => { e.stopPropagation(); setEditingTitleId(note.id); }} className="text-[7px] uppercase font-black tracking-tight opacity-40 group-hover:opacity-100 cursor-text select-none text-center px-0.5 whitespace-nowrap">
                    {note.title}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {!isCreateMenuOpen && (
        <RadialMenu 
          isVisible={!!radialPos} x={radialPos?.x || 0} y={radialPos?.y || 0}
          onSelect={(opt: RadialOption) => {
            if (opt === 'create') {
              setIsCreateMenuOpen(true);
              // Keep radialPos for CreateMenu positioning, but it will be cleared when CreateMenu closes
            }
            else if (opt === 'move' && targetNodeId) { 
              setMovingNodeId(targetNodeId); 
              setRadialPos(null); 
            }
            else if (opt === 'connect' && targetNodeId) { 
              setConnectingFromId(targetNodeId);
              const note = notes.find(n => n.id === targetNodeId);
              if (note) {
                setCursorPos({ x: note.x, y: note.y });
              }
              setRadialPos(null); 
            }
            else if (opt === 'view' && targetNodeId) { 
              setEditingNoteId(targetNodeId); 
              setRadialPos(null); 
            }
            else if (opt === 'delete' && targetNodeId) { 
              setConfirmDeleteId(targetNodeId); 
              setRadialPos(null); 
            }
            else if (opt === 'share' && targetNodeId) { 
              setSharingNoteId(targetNodeId);
              // Keep radialPos for ShareModal positioning
            }
          }}
          onClose={() => setRadialPos(null)}
        />
      )}

      {editingNoteId && (
        <NoteModal 
          note={notes.find(n => n.id === editingNoteId)!} 
          onClose={() => setEditingNoteId(null)} 
          onSave={(u) => updateData({ notes: notes.map(n => n.id === u.id ? u : n) })}
          onCreateNote={(content, title) => {
            const editingNote = notes.find(n => n.id === editingNoteId);
            if (editingNote) {
              const newNote: Note = {
                id: uuidv4(),
                folderId: activeFolderId,
                title: title,
                content: content,
                x: editingNote.x + 150,
                y: editingNote.y + 150,
                type: editingNote.type,
                color: editingNote.color
              };
              updateData({ notes: [...notes, newNote] });
            }
          }}
          apiKey={activeApiKey}
          liveModelName={activeLiveModelName}
          refinementModelName={activeRefinementModelName}
        />
      )}

      {sharingNoteId && radialPos && (
        <ShareModal
          note={notes.find(n => n.id === sharingNoteId)!}
          onClose={() => { setSharingNoteId(null); setRadialPos(null); }}
          x={radialPos.x}
          y={radialPos.y}
        />
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="max-w-sm w-full bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 flex flex-col gap-4 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="space-y-2">
              <h2 className="text-base font-bold text-white">Delete Note?</h2>
              <p className="text-gray-400 text-sm">
                "{notes.find(n => n.id === confirmDeleteId)?.title}" will be permanently removed.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { 
                updateData({ notes: notes.filter(n => n.id !== confirmDeleteId), connections: connections.filter(c => c.from !== confirmDeleteId && c.to !== confirmDeleteId) }); 
                setConfirmDeleteId(null);
                playSound.delete();
                haptic.strong();
                setToastMessage('Note deleted');
                setToastKey(prev => prev + 1);
                setShowToast(true);
              }} className="flex-1 h-10 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-lg transition-all">
                Delete
              </button>
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 h-10 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-bold rounded-lg transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showOnboardingHint && (
        <OnboardingHint
          message="Long-press anywhere on the canvas to create your first note"
          onDismiss={() => {
            setShowOnboardingHint(false);
            localStorage.setItem('molecular_onboarding_hint_shown', 'true');
          }}
        />
      )}
      
      {showToast && (
        <Toast key={toastKey} message={toastMessage} onClose={() => setShowToast(false)} />
      )}
    </div>
  );
};

export default App;