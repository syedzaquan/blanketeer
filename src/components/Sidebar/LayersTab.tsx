import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Layers,
  Lock,
  Trash2,
  Type,
  Unlock,
} from 'lucide-react';
import type { LayerItem } from '../../types/editor';
import { cn } from '../../utils/cn';

interface LayersTabProps {
  layers: LayerItem[];
  onSelectLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  onDeleteLayer: (id: string) => void;
}

export function LayersTab({
  layers,
  onSelectLayer,
  onToggleVisibility,
  onToggleLock,
  onMoveLayer,
  onDeleteLayer,
}: LayersTabProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Layer Stack
        </h2>
        <span className="text-[11px] font-mono text-zinc-500">
          {layers.length} {layers.length === 1 ? 'layer' : 'layers'}
        </span>
      </div>

      {layers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 text-center">
          <Layers className="w-7 h-7 text-zinc-600 mb-2" />
          <p className="text-xs font-medium text-zinc-300">No layers yet</p>
          <p className="text-[11px] text-zinc-500 mt-1">
            Add text or upload an image to start composing your story.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {layers.map((layer, displayIdx) => {
            const Icon =
              layer.kind === 'text'
                ? Type
                : layer.kind === 'image'
                  ? ImageIcon
                  : Layers;

            return (
              <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectLayer(layer.id);
                  }
                }}
                className={cn(
                  'group flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer',
                  layer.isSelected
                    ? 'bg-violet-600/15 border-violet-500/60 text-white'
                    : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800/70'
                )}
              >
                <div
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                    layer.isSelected
                      ? 'bg-violet-500/25 text-violet-300'
                      : 'bg-zinc-800 text-zinc-400'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>

                <span
                  className={cn(
                    'flex-1 min-w-0 truncate text-xs font-medium',
                    !layer.visible && 'opacity-45 line-through'
                  )}
                >
                  {layer.label}
                </span>

                <div
                  className="flex items-center gap-0.5 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    disabled={displayIdx === 0}
                    onClick={() => onMoveLayer(layer.id, 'up')}
                    title="Move Up"
                    className={cn(
                      'p-1 rounded-md transition-colors',
                      displayIdx === 0
                        ? 'text-zinc-700 cursor-not-allowed'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-700/70'
                    )}
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    disabled={displayIdx === layers.length - 1}
                    onClick={() => onMoveLayer(layer.id, 'down')}
                    title="Move Down"
                    className={cn(
                      'p-1 rounded-md transition-colors',
                      displayIdx === layers.length - 1
                        ? 'text-zinc-700 cursor-not-allowed'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-700/70'
                    )}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleVisibility(layer.id)}
                    title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                    className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700/70 transition-colors"
                  >
                    {layer.visible ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3 text-zinc-500" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleLock(layer.id)}
                    title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                    className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700/70 transition-colors"
                  >
                    {layer.locked ? (
                      <Lock className="w-3 h-3 text-amber-400" />
                    ) : (
                      <Unlock className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteLayer(layer.id)}
                    title="Delete Layer"
                    className="p-1 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

