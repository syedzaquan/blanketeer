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
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium text-neutral-300">
          Layers
        </h2>
        <span className="text-[11px] font-mono text-neutral-500">
          {layers.length} {layers.length === 1 ? 'layer' : 'layers'}
        </span>
      </div>

      {layers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-3 rounded-md bg-neutral-900/50 border border-neutral-800/80 text-center">
          <Layers className="w-5 h-5 text-neutral-600 mb-1.5" />
          <p className="text-xs font-medium text-neutral-400">No layers</p>
          <p className="text-[11px] text-neutral-600 mt-0.5">
            Add text or an image to begin.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
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
                  'group flex items-center gap-2 px-2 py-1.5 rounded-md border transition-colors cursor-pointer',
                  layer.isSelected
                    ? 'bg-neutral-800 border-neutral-600 text-neutral-100'
                    : 'bg-neutral-900/50 border-neutral-800/80 text-neutral-300 hover:bg-neutral-800/60'
                )}
              >
                <div
                  className={cn(
                    'w-6 h-6 rounded flex items-center justify-center shrink-0',
                    layer.isSelected
                      ? 'bg-neutral-700 text-neutral-100'
                      : 'bg-neutral-800/80 text-neutral-500'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>

                <span
                  className={cn(
                    'flex-1 min-w-0 truncate text-xs font-medium',
                    !layer.visible && 'opacity-40 line-through'
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
                      'p-1 rounded transition-colors',
                      displayIdx === 0
                        ? 'text-neutral-700 cursor-not-allowed'
                        : 'text-neutral-500 hover:text-neutral-100 hover:bg-neutral-700/60'
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
                      'p-1 rounded transition-colors',
                      displayIdx === layers.length - 1
                        ? 'text-neutral-700 cursor-not-allowed'
                        : 'text-neutral-500 hover:text-neutral-100 hover:bg-neutral-700/60'
                    )}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleVisibility(layer.id)}
                    title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                    className="p-1 rounded text-neutral-500 hover:text-neutral-100 hover:bg-neutral-700/60 transition-colors"
                  >
                    {layer.visible ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3 text-neutral-600" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleLock(layer.id)}
                    title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                    className="p-1 rounded text-neutral-500 hover:text-neutral-100 hover:bg-neutral-700/60 transition-colors"
                  >
                    {layer.locked ? (
                      <Lock className="w-3 h-3 text-neutral-200" />
                    ) : (
                      <Unlock className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteLayer(layer.id)}
                    title="Delete Layer"
                    className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-neutral-700/60 transition-colors"
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
