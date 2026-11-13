import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  ChevronDown,
  Download,
  FileDown,
  FileUp,
  Layers,
  Redo2,
  RotateCcw,
  Undo2,
} from 'lucide-react';
import {
  ASPECT_RATIO_PRESETS,
  type AspectRatioKey,
  type ExportImageFormat,
} from '../types/editor';
import { cn } from '../utils/cn';

interface HeaderProps {
  aspectRatio: AspectRatioKey;
  onAspectRatioChange: (ratio: AspectRatioKey) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onResetProject: () => void;
  onExportImage: (format: ExportImageFormat) => void;
  onOpenExportPages: () => void;
  pageCount: number;
  onExportProjectJSON: () => void;
  onImportProjectJSON: (file: File) => void;
}

export function Header({
  aspectRatio,
  onAspectRatioChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onResetProject,
  onExportImage,
  onOpenExportPages,
  pageCount,
  onExportProjectJSON,
  onImportProjectJSON,
}: HeaderProps) {
  const currentPreset = ASPECT_RATIO_PRESETS[aspectRatio];
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [menuOpen]);

  const handleJsonChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportProjectJSON(file);
    }
    e.target.value = '';
  };

  return (
    <header className="shrink-0 border-b border-neutral-800/80 bg-[#0f0f0f] z-30 flex flex-col lg:flex-row lg:h-11 lg:items-center lg:justify-between lg:px-3 lg:gap-2">
      {/* Brand: centered top row on mobile/tablet, left-aligned on desktop */}
      <div className="flex items-center justify-center gap-2.5 py-1.5 border-b border-neutral-800/60 lg:border-b-0 lg:py-0 lg:justify-start min-w-0">
        <span className="text-xs font-semibold text-neutral-100 tracking-tight select-none">
          Blanketeer
        </span>
        <span className="hidden lg:inline-block text-[11px] font-mono text-neutral-500">
          {currentPreset.width}×{currentPreset.height}
        </span>
      </div>

      <div className="h-11 lg:h-auto px-2.5 sm:px-3 lg:px-0 flex items-center justify-between gap-2 lg:contents">
        {/* Aspect Ratio Presets */}
      <div
        className="flex items-center gap-0.5 p-0.5 rounded-lg lg:rounded-md bg-neutral-800/80 border border-neutral-700"
        role="group"
        aria-label="Canvas aspect ratio"
      >
        {(Object.keys(ASPECT_RATIO_PRESETS) as AspectRatioKey[]).map((key) => {
          const preset = ASPECT_RATIO_PRESETS[key];
          const active = aspectRatio === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onAspectRatioChange(key)}
              title={`${preset.label} (${preset.width} × ${preset.height}px)`}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 lg:py-1 rounded-md lg:rounded-[5px] text-xs font-medium transition-colors',
                active
                  ? 'bg-neutral-700 text-white'
                  : 'text-neutral-400 hover:text-neutral-100'
              )}
            >
              <span className="hidden sm:inline">{preset.label}</span>
              <span
                className={cn(
                  'font-mono text-xs lg:text-[11px]',
                  active ? 'text-neutral-200' : 'text-neutral-400'
                )}
              >
                {preset.ratioLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right Actions: Undo/Redo + Reset + Export */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex items-center gap-0.5 border-r border-neutral-800 pr-1.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo"
            title="Undo (Cmd/Ctrl + Z)"
            className={cn(
              'p-2 lg:p-1.5 rounded-md transition-colors',
              canUndo
                ? 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                : 'text-neutral-700 cursor-not-allowed'
            )}
          >
            <Undo2 className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Redo"
            title="Redo (Cmd/Ctrl + Shift + Z)"
            className={cn(
              'p-2 lg:p-1.5 rounded-md transition-colors',
              canRedo
                ? 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                : 'text-neutral-700 cursor-not-allowed'
            )}
          >
            <Redo2 className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
          </button>
        </div>

        <button
          id="header-reset-project"
          type="button"
          onClick={onResetProject}
          aria-label="Reset canvas and clear saved draft"
          title="Reset canvas & clear saved draft"
          className="p-2 lg:p-1.5 rounded-md border border-neutral-700 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
        >
          <RotateCcw className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
        </button>

        <input
          ref={jsonInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleJsonChange}
          className="hidden"
        />

        <div ref={menuRef} className="relative flex items-center">
          <button
            type="button"
            onClick={() => onExportImage('png')}
            aria-label="Export PNG"
            title="Export PNG"
            className="flex items-center gap-1.5 px-3 py-2 lg:px-2.5 lg:py-1 rounded-l-md bg-neutral-100 hover:bg-white active:bg-neutral-200 text-neutral-950 text-xs font-medium transition-colors"
          >
            <Download className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="More export and template options"
            aria-expanded={menuOpen}
            title="Export format & template save/load"
            className="flex items-center justify-center px-1.5 py-2 lg:py-1 rounded-r-md bg-neutral-200 hover:bg-white border-l border-neutral-300 text-neutral-950 transition-colors"
          >
            <ChevronDown className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 rounded-lg bg-[#1c1c1e] border border-neutral-700/90 shadow-xl py-1 z-50 text-xs text-neutral-200">
              <div className="px-2.5 py-1 text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                Export Image
              </div>
              {(
                [
                  { format: 'png', label: 'PNG (Lossless)' },
                  { format: 'jpeg', label: 'JPEG (Smaller file)' },
                  { format: 'webp', label: 'WebP (Balanced)' },
                ] as const
              ).map((item) => (
                <button
                  key={item.format}
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onExportImage(item.format);
                  }}
                  className="w-full px-3 py-2 lg:py-1.5 text-left hover:bg-neutral-800 flex items-center gap-2 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{item.label}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenExportPages();
                }}
                className="w-full px-3 py-2 lg:py-1.5 text-left hover:bg-neutral-800 flex items-center justify-between gap-2 transition-colors text-indigo-300"
              >
                <span className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Export Slides…</span>
                </span>
                <span className="text-[10px] text-neutral-400">{pageCount}</span>
              </button>

              <div className="my-1 border-t border-neutral-800" />
              <div className="px-2.5 py-1 text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                Template File
              </div>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onExportProjectJSON();
                }}
                className="w-full px-3 py-2 lg:py-1.5 text-left hover:bg-neutral-800 flex items-center gap-2 transition-colors"
              >
                <FileDown className="w-3.5 h-3.5 text-neutral-400" />
                <span>Save Template (.json)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  jsonInputRef.current?.click();
                }}
                className="w-full px-3 py-2 lg:py-1.5 text-left hover:bg-neutral-800 flex items-center gap-2 transition-colors"
              >
                <FileUp className="w-3.5 h-3.5 text-neutral-400" />
                <span>Load Template (.json)</span>
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </header>
  );
}
