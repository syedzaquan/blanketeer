import {
  Download,
  Redo2,
  RectangleVertical,
  Square,
  Smartphone,
  Undo2,
  Layers,
} from 'lucide-react';
import {
  ASPECT_RATIO_PRESETS,
  type AspectRatioKey,
} from '../types/editor';
import { cn } from '../utils/cn';

interface HeaderProps {
  aspectRatio: AspectRatioKey;
  onAspectRatioChange: (ratio: AspectRatioKey) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onExportPNG: () => void;
}

const RATIO_ICONS: Record<AspectRatioKey, typeof Smartphone> = {
  '9:16': Smartphone,
  '1:1': Square,
  '4:5': RectangleVertical,
};

export function Header({
  aspectRatio,
  onAspectRatioChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onExportPNG,
}: HeaderProps) {
  const currentPreset = ASPECT_RATIO_PRESETS[aspectRatio];

  return (
    <header className="h-14 shrink-0 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur px-2.5 sm:px-4 flex items-center justify-between gap-2 sm:gap-3 z-30">
      {/* Brand */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-400 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
          <Layers className="w-4 h-4 text-white" />
        </div>
        <div className="hidden sm:flex items-baseline gap-2 truncate">
          <span className="font-fraunces font-bold text-base sm:text-lg tracking-tight text-white">
            Blanketeer
          </span>
          <span className="hidden md:inline-block text-[11px] font-medium uppercase tracking-widest text-zinc-500">
            Story Studio
          </span>
        </div>
      </div>

      {/* Aspect Ratio Presets */}
      <div
        className="flex items-center gap-0.5 sm:gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800/80"
        role="group"
        aria-label="Canvas aspect ratio"
      >
        {(Object.keys(ASPECT_RATIO_PRESETS) as AspectRatioKey[]).map((key) => {
          const preset = ASPECT_RATIO_PRESETS[key];
          const Icon = RATIO_ICONS[key];
          const active = aspectRatio === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onAspectRatioChange(key)}
              title={`${preset.label} (${preset.width} × ${preset.height}px)`}
              className={cn(
                'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all',
                active
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70'
              )}
            >
              <Icon className="hidden sm:block w-3.5 h-3.5" />
              <span className="hidden sm:inline">{preset.label}</span>
              <span
                className={cn(
                  'text-[10px] px-1 py-0.5 rounded',
                  active ? 'bg-white/15 text-white' : 'bg-zinc-800 text-zinc-400 sm:text-zinc-500'
                )}
              >
                {preset.ratioLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right Actions: Resolution Badge + Undo/Redo + Export */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <span className="hidden xl:inline-flex items-center px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400">
          {currentPreset.width} × {currentPreset.height}px
        </span>

        <div className="flex items-center gap-0.5 sm:gap-1 border-r border-zinc-800 pr-1.5 sm:pr-2">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Cmd/Ctrl + Z)"
            className={cn(
              'p-1.5 sm:p-2 rounded-lg transition-colors',
              canUndo
                ? 'text-zinc-200 hover:bg-zinc-800 active:bg-zinc-700'
                : 'text-zinc-600 cursor-not-allowed'
            )}
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Cmd/Ctrl + Shift + Z)"
            className={cn(
              'p-1.5 sm:p-2 rounded-lg transition-colors',
              canRedo
                ? 'text-zinc-200 hover:bg-zinc-800 active:bg-zinc-700'
                : 'text-zinc-600 cursor-not-allowed'
            )}
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onExportPNG}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 active:scale-[0.99] text-white text-xs font-semibold shadow-lg shadow-violet-600/25 transition-all"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export PNG</span>
          <span className="sm:hidden">Export</span>
        </button>
      </div>
    </header>
  );
}

