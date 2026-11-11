import { Download, Redo2, Undo2 } from 'lucide-react';
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
    <header className="h-11 shrink-0 border-b border-neutral-800/80 bg-[#0f0f0f] px-3 flex items-center justify-between gap-2 z-30">
      {/* Brand */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-xs font-semibold text-neutral-100 tracking-tight select-none">
          Blanketeer
        </span>
        <span className="hidden md:inline-block text-[11px] font-mono text-neutral-500">
          {currentPreset.width}×{currentPreset.height}
        </span>
      </div>

      {/* Aspect Ratio Presets */}
      <div
        className="flex items-center gap-0.5 p-0.5 rounded-md bg-neutral-900 border border-neutral-800"
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
                'flex items-center gap-1 px-2.5 py-1 rounded-[5px] text-xs font-medium transition-colors',
                active
                  ? 'bg-neutral-800 text-neutral-100'
                  : 'text-neutral-500 hover:text-neutral-200'
              )}
            >
              <span className="hidden sm:inline">{preset.label}</span>
              <span
                className={cn(
                  'font-mono text-[11px]',
                  active ? 'text-neutral-300' : 'text-neutral-500'
                )}
              >
                {preset.ratioLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right Actions: Undo/Redo + Export */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex items-center gap-0.5 border-r border-neutral-800 pr-1.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Cmd/Ctrl + Z)"
            className={cn(
              'p-1.5 rounded-md transition-colors',
              canUndo
                ? 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                : 'text-neutral-700 cursor-not-allowed'
            )}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Cmd/Ctrl + Shift + Z)"
            className={cn(
              'p-1.5 rounded-md transition-colors',
              canRedo
                ? 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                : 'text-neutral-700 cursor-not-allowed'
            )}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onExportPNG}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-100 hover:bg-white active:bg-neutral-200 text-neutral-950 text-xs font-medium transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export PNG</span>
          <span className="sm:hidden">Export</span>
        </button>
      </div>
    </header>
  );
}
