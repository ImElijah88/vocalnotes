
import React, { useState } from 'react';
import { 
  ChevronLeft, ChevronRight, FolderPlus, Folder as FolderIcon, 
  Hand, Palette, Plus, Minus, MoveRight, Scissors, Hash, 
  Minus as MinusIcon, Zap, AlignJustify, User as UserIcon,
  GripVertical, ChevronDown, FileText, Lightbulb, Footprints, 
  DollarSign, Wrench, User, Cable
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { Folder as FolderType, LineType, Note, NoteType } from '../types';

interface SidebarProps {
  user: FirebaseUser | null;
  onLogout: () => void;
  folders: FolderType[];
  notes: Note[];
  activeFolderId: string;
  onFolderSelect: (id: string) => void;
  onAddFolder: () => void;
  onUpdateFolders: (folders: FolderType[]) => void;
  onMoveNoteToFolder: (noteId: string, folderId: string) => void;
  onToolSelect: (tool: 'pan' | 'color' | 'zoom-in' | 'zoom-out' | 'thickness-up' | 'thickness-down' | LineType) => void;
  activeTool: string;
  activeColor: string;
  activeLineType: LineType;
  activeLineThickness: number;
  onOpenSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  user,
  folders, 
  notes,
  activeFolderId, 
  onFolderSelect, 
  onAddFolder,
  onUpdateFolders,
  onMoveNoteToFolder,
  onToolSelect,
  activeTool,
  activeColor,
  activeLineType,
  activeLineThickness,
  onOpenSettings
}) => {
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ [activeFolderId]: true });
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);

  const lineIcons: Record<LineType, React.ReactNode> = {
    cable: <Cable size={20} />,
    arrow: <MoveRight size={20} />,
    solid: <MinusIcon size={20} />,
    double: <AlignJustify size={20} className="rotate-90" />,
    dashed: <Scissors size={20} />,
    dotted: <Hash size={20} />,
    glow: <Zap size={20} />
  };

  const lineLabels: Record<LineType, string> = {
    cable: 'Neural Cable',
    arrow: 'Flow Stream',
    solid: 'Solid Connection',
    double: 'Dual Interface',
    dashed: 'Fragmented Link',
    dotted: 'Point Sequence',
    glow: 'Neural Discharge'
  };

  const handleLineSelect = (lt: LineType) => {
    onToolSelect(lt);
    setIsSubmenuOpen(false);
  };

  const handleFolderDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDropTargetFolderId(null);
    const type = e.dataTransfer.getData('type');
    if (type === 'folder' && draggedFolderId && draggedFolderId !== targetId) {
      const newFolders = [...folders];
      const fromIdx = newFolders.findIndex(f => f.id === draggedFolderId);
      const toIdx = newFolders.findIndex(f => f.id === targetId);
      const [moved] = newFolders.splice(fromIdx, 1);
      newFolders.splice(toIdx, 0, moved);
      onUpdateFolders(newFolders.map((f, i) => ({ ...f, order: i })));
    } else if (type === 'note') {
      const noteId = e.dataTransfer.getData('noteId');
      onMoveNoteToFolder(noteId, targetId);
    }
    setDraggedFolderId(null);
  };

  return (
    <>
      {/* FIXED MAIN TOOLBAR (PORT LEFT) */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-[1000] flex flex-row items-center gap-3">
        <div className="bg-[#0a0a0a]/95 border border-white/10 rounded-2xl p-1.5 flex flex-col gap-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
          {/* 1. Profile (Settings) */}
          <ToolbarButton 
            active={false} 
            onClick={onOpenSettings}
            icon={user?.photoURL ? <img src={user.photoURL} className="w-5 h-5 rounded-full" /> : <UserIcon size={20} />} 
            tooltip="Neural Core"
            highlightColor="#D4AF37"
            className="text-amber-500 border-b border-white/5 pb-1.5 mb-0.5 rounded-none"
          />

          {/* 2. Chevron (Directory Toggle) */}
          <ToolbarButton 
            active={isDirectoryOpen}
            onClick={() => {
              setIsDirectoryOpen(!isDirectoryOpen);
              setIsSubmenuOpen(false);
            }}
            icon={isDirectoryOpen ? <ChevronLeft size={22} strokeWidth={2.5} /> : <ChevronRight size={22} strokeWidth={2.5} />}
            tooltip="Vocal Notes"
            highlightColor="#00FFFF"
            className="text-cyan-400"
          />

          {/* 3. Hand (Panning) */}
          <ToolbarButton 
            active={activeTool === 'pan'} 
            onClick={() => { onToolSelect('pan'); setIsSubmenuOpen(false); }}
            icon={<Hand size={20} />} 
            tooltip="Lattice Panning"
            highlightColor={activeColor}
          />

          {/* 4. Data Link (Main Style Toggle) */}
          <ToolbarButton 
            active={isSubmenuOpen} 
            onClick={() => {
              setIsSubmenuOpen(!isSubmenuOpen);
              if (isDirectoryOpen) setIsDirectoryOpen(false);
            }}
            icon={lineIcons[activeLineType]} 
            tooltip="Data Link"
            highlightColor={activeColor}
          />

          {/* 5. Colour (Palette) */}
          <ToolbarButton 
            active={activeTool === 'color'} 
            onClick={() => { onToolSelect('color'); setIsSubmenuOpen(false); }}
            icon={<Palette size={20} style={{ color: activeColor }} />} 
            tooltip="Spectral Core"
            highlightColor={activeColor}
          />

          {/* 6. Plus (Zoom/Thickness) */}
          <ToolbarButton 
            active={false} 
            onClick={() => {
              if (isSubmenuOpen) onToolSelect('thickness-up');
              else onToolSelect('zoom-in');
            }}
            icon={<Plus size={20} />} 
            tooltip={isSubmenuOpen ? "Amplify Interface" : "Zoom Lattice"}
            highlightColor={isSubmenuOpen ? activeColor : undefined}
          />

          {/* 7. Minus (Zoom Out/Thickness) */}
          <ToolbarButton 
            active={false} 
            onClick={() => {
              if (isSubmenuOpen) onToolSelect('thickness-down');
              else onToolSelect('zoom-out');
            }}
            icon={<Minus size={20} />} 
            tooltip={isSubmenuOpen ? "Reduce Interface" : "Scale Lattice"}
            highlightColor={isSubmenuOpen ? activeColor : undefined}
          />
        </div>

        {/* SECONDARY TOOL BAR (DATA LINK MODELS) */}
        {isSubmenuOpen && (
          <div className="bg-[#0f0f0f]/95 border border-white/10 rounded-2xl p-1.5 flex flex-col gap-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-in slide-in-from-left-4 fade-in duration-300">
            {(Object.keys(lineIcons) as LineType[]).map((lt) => (
              <ToolbarButton
                key={lt}
                active={activeLineType === lt}
                onClick={() => handleLineSelect(lt)}
                icon={lineIcons[lt]}
                tooltip={lineLabels[lt]}
                highlightColor={activeColor}
                isSmall
              />
            ))}
          </div>
        )}
      </div>

      {/* DIRECTORY PANEL (MOLECULE INDEX) */}
      {isDirectoryOpen && (
        <div className="fixed left-[78px] top-0 h-screen bg-[#030303] border-r border-white/5 w-80 z-[900] shadow-[30px_0_100px_rgba(0,0,0,0.8)] animate-in slide-in-from-left-full duration-500">
          <div className="flex flex-col h-full overflow-hidden w-full">
            <div className="p-8 border-b border-white/5 flex items-end justify-between bg-black/40 gap-2">
              <img src="/logo-512.png" alt="Vocal Notes" className="w-8 h-8 shrink-0" />
              <h2 className="font-black text-[11px] uppercase tracking-[0.4em] text-cyan-500 leading-none pb-0.5 flex-1">Vocal Notes</h2>
              <div className="relative group/add">
                <button onClick={onAddFolder} className="w-[34px] h-[34px] flex items-center justify-center hover:bg-cyan-500/10 rounded-lg text-gray-400 hover:text-cyan-400 transition-all active:scale-90">
                  <FolderPlus size={18} />
                </button>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-black border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-cyan-400 opacity-0 group-hover/add:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[200]">
                  New Canvas
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
              {folders.sort((a, b) => a.order - b.order).map((folder) => {
                const isExpanded = expandedFolders[folder.id];
                const folderNotes = notes.filter(n => n.folderId === folder.id);
                const isActive = activeFolderId === folder.id;
                return (
                  <div key={folder.id} className="flex flex-col rounded-2xl overflow-hidden transition-all border border-transparent" onDragOver={(e) => { e.preventDefault(); setDropTargetFolderId(folder.id); }} onDragLeave={() => setDropTargetFolderId(null)} onDrop={(e) => handleFolderDrop(e, folder.id)}>
                    <div 
                      draggable 
                      onDragStart={(e) => { e.dataTransfer.setData('type', 'folder'); setDraggedFolderId(folder.id); }} 
                      onClick={() => onFolderSelect(folder.id)} 
                      className={`flex items-center gap-4 px-4 h-14 cursor-pointer transition-all group ${isActive ? 'bg-cyan-500/10 text-cyan-100' : 'text-gray-500 hover:bg-white/5 hover:text-white'} ${dropTargetFolderId === folder.id ? 'bg-cyan-500/5' : ''}`}
                    >
                      <GripVertical size={14} className="opacity-0 group-hover:opacity-20 cursor-grab shrink-0" />
                      <FolderIcon size={18} className={isActive ? 'text-cyan-500' : 'text-gray-700'} />
                      <span className="flex-1 text-[11px] font-black uppercase tracking-[0.2em] truncate">{folder.name}</span>
                      {folderNotes.length > 0 && (
                        <button onClick={(e) => { e.stopPropagation(); setExpandedFolders(p => ({ ...p, [folder.id]: !p[folder.id] })); }} className="w-8 h-8 flex items-center justify-center text-gray-700 hover:text-white transition-colors">
                          <ChevronDown size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>
                    {isExpanded && folderNotes.length > 0 && (
                      <div className="pl-14 pr-4 pb-4 space-y-1.5">
                        {folderNotes.map(note => (
                          <div key={note.id} draggable onDragStart={(e) => { e.dataTransfer.setData('type', 'note'); e.dataTransfer.setData('noteId', note.id); }} className="flex items-center gap-3 h-10 px-3 rounded-xl text-[9px] font-bold uppercase tracking-widest text-gray-600 hover:text-cyan-400 hover:bg-white/5 cursor-grab active:cursor-grabbing transition-colors">
                            <span className="truncate flex-1">{note.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const ToolbarButton: React.FC<{ 
  icon: React.ReactNode, 
  active?: boolean, 
  onClick: () => void, 
  tooltip?: string,
  highlightColor?: string,
  className?: string,
  isSmall?: boolean
}> = ({ icon, active, onClick, tooltip, highlightColor = '#00FFFF', className = '', isSmall = false }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative flex items-center group">
      <button 
        onClick={onClick} 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`${isSmall ? 'w-[38px] h-[38px]' : 'w-[48px] h-[48px]'} flex items-center justify-center rounded-xl transition-all duration-300 relative ${active ? 'text-black z-10 scale-[1.05]' : `text-white/40 hover:text-white hover:bg-white/5 ${className}`}`} 
        style={{ 
          backgroundColor: active ? highlightColor : undefined, 
          boxShadow: active ? `0 0 25px ${highlightColor}44` : undefined 
        }}
      >
        {icon}
        {active && !isSmall && <div className="absolute -left-1 w-1.5 h-6 rounded-full" style={{ backgroundColor: highlightColor }} />}
      </button>

      {tooltip && isHovered && (
        <div 
          className="absolute left-full ml-5 px-5 py-2.5 bg-black/95 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] whitespace-nowrap z-[2000] animate-in slide-in-from-left-3 fade-in duration-200 shadow-[0_15px_45px_rgba(0,0,0,1)]"
          style={{ 
            color: active ? 'white' : highlightColor,
            borderColor: active ? highlightColor : 'rgba(255,255,255,0.1)'
          }}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
