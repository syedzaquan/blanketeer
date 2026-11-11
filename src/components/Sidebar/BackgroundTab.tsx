import { useRef, type ChangeEvent } from 'react';
import {
  Image as ImageIcon,
  Palette,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import type {
  BackgroundImageConfig,
  BackgroundMode,
  BackgroundState,
  GradientConfig,
} from '../../types/editor';
import { cn } from '../../utils/cn';

interface BackgroundTabProps {
  background: BackgroundState;
  onModeChange: (mode: BackgroundMode) => void;
  onColorChange: (color: string) => void;
  onGradientChange: (gradient: GradientConfig) => void;
  onUploadBgImage: (file: File) => void;
  onUpdateBgImageConfig: (patch: Partial<BackgroundImageConfig>) => void;
  onRemoveBgImage: () => void;
}

const SOLID_SWATCHES = [
  '#FE5925',
  '#2A9F47',
  '#F02D3B',
  '#F6BE01',
  '#6DB4E2',
  '#12A437',
  '#D5D5D5',
  '#F79A00',
  '#FB3704',
  '#FC848B',
];

const GRADIENT_PRESETS: { name: string; gradient: GradientConfig }[] = [
  {
    name: 'Twilight',
    gradient: { startColor: '#2e1065', endColor: '#c026d3', angle: 145 },
  },
  {
    name: 'Sunset',
    gradient: { startColor: '#f97316', endColor: '#db2777', angle: 135 },
  },
  {
    name: 'Ocean',
    gradient: { startColor: '#0f172a', endColor: '#0284c7', angle: 160 },
  },
  {
    name: 'Cream',
    gradient: { startColor: '#fef3c7', endColor: '#fde68a', angle: 180 },
  },
  {
    name: 'Sage',
    gradient: { startColor: '#064e3b', endColor: '#10b981', angle: 150 },
  },
  {
    name: 'Obsidian',
    gradient: { startColor: '#09090b', endColor: '#3f3f46', angle: 180 },
  },
];

export function BackgroundTab({
  background,
  onModeChange,
  onColorChange,
  onGradientChange,
  onUploadBgImage,
  onUpdateBgImageConfig,
  onRemoveBgImage,
}: BackgroundTabProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onUploadBgImage(file);
    }
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Mode Switcher */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2.5">
          Background Type
        </h2>
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
          {(
            [
              { id: 'color', label: 'Solid', icon: Palette },
              { id: 'gradient', label: 'Gradient', icon: Sparkles },
              { id: 'image', label: 'Image', icon: ImageIcon },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = background.mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onModeChange(item.id)}
                className={cn(
                  'flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all',
                  active
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Solid Color Controls */}
      {background.mode === 'color' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
            <input
              type="color"
              value={background.color}
              onChange={(e) => onColorChange(e.target.value)}
              aria-label="Solid background color"
              className="w-10 h-10 rounded-lg border border-zinc-700 bg-transparent cursor-pointer shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-zinc-400 mb-1">Canvas Color</p>
              <input
                type="text"
                value={background.color}
                onChange={(e) => onColorChange(e.target.value)}
                className="w-full px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100 uppercase focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-zinc-400 mb-2">
              Studio Swatches
            </p>
            <div className="grid grid-cols-5 gap-2">
              {SOLID_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => onColorChange(swatch)}
                  aria-label={`Set background ${swatch}`}
                  className={cn(
                    'w-full aspect-square rounded-lg border transition-transform hover:scale-105',
                    background.color.toLowerCase() === swatch.toLowerCase()
                      ? 'border-violet-400 ring-2 ring-violet-500/40'
                      : 'border-white/15'
                  )}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gradient Controls */}
      {background.mode === 'gradient' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2.5">
            <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800 cursor-pointer">
              <input
                type="color"
                value={background.gradient.startColor}
                onChange={(e) =>
                  onGradientChange({
                    ...background.gradient,
                    startColor: e.target.value,
                  })
                }
                className="w-8 h-8 rounded-md border border-zinc-700 bg-transparent cursor-pointer"
              />
              <div className="min-w-0">
                <span className="block text-[10px] text-zinc-400">Start</span>
                <span className="block text-xs font-mono text-zinc-200 uppercase">
                  {background.gradient.startColor}
                </span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800 cursor-pointer">
              <input
                type="color"
                value={background.gradient.endColor}
                onChange={(e) =>
                  onGradientChange({
                    ...background.gradient,
                    endColor: e.target.value,
                  })
                }
                className="w-8 h-8 rounded-md border border-zinc-700 bg-transparent cursor-pointer"
              />
              <div className="min-w-0">
                <span className="block text-[10px] text-zinc-400">End</span>
                <span className="block text-xs font-mono text-zinc-200 uppercase">
                  {background.gradient.endColor}
                </span>
              </div>
            </label>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-zinc-400">Gradient Angle</span>
              <span className="font-mono text-zinc-200">
                {background.gradient.angle}°
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              value={background.gradient.angle}
              onChange={(e) =>
                onGradientChange({
                  ...background.gradient,
                  angle: Number(e.target.value),
                })
              }
              className="w-full accent-violet-500"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-zinc-400 mb-2">
              Curated Gradients
            </p>
            <div className="grid grid-cols-3 gap-2">
              {GRADIENT_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => onGradientChange(preset.gradient)}
                  className="group relative h-12 rounded-xl border border-white/10 overflow-hidden transition-transform hover:scale-[1.03]"
                  style={{
                    background: `linear-gradient(${preset.gradient.angle}deg, ${preset.gradient.startColor}, ${preset.gradient.endColor})`,
                  }}
                >
                  <span className="absolute inset-x-0 bottom-0 py-0.5 bg-black/45 backdrop-blur-[2px] text-[10px] font-medium text-white">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Background Image Controls */}
      {background.mode === 'image' && (
        <div className="flex flex-col gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>
              {background.image
                ? 'Replace Background Image'
                : 'Upload Background Image'}
            </span>
          </button>

          {background.image ? (
            <>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
                {(['cover', 'contain'] as const).map((fitMode) => (
                  <button
                    key={fitMode}
                    type="button"
                    onClick={() => onUpdateBgImageConfig({ fitMode })}
                    className={cn(
                      'py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                      background.image?.fitMode === fitMode
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    {fitMode === 'cover' ? 'Fill Frame' : 'Fit Whole'}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-3 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-zinc-400">Zoom Scale</span>
                    <span className="font-mono text-zinc-200">
                      {background.image.zoom.toFixed(2)}×
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={3}
                    step={0.05}
                    value={background.image.zoom}
                    onChange={(e) =>
                      onUpdateBgImageConfig({ zoom: Number(e.target.value) })
                    }
                    className="w-full accent-violet-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-zinc-400">Pan X</span>
                    <span className="font-mono text-zinc-200">
                      {Math.round(background.image.panX)}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-600}
                    max={600}
                    step={5}
                    value={background.image.panX}
                    onChange={(e) =>
                      onUpdateBgImageConfig({ panX: Number(e.target.value) })
                    }
                    className="w-full accent-violet-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-zinc-400">Pan Y</span>
                    <span className="font-mono text-zinc-200">
                      {Math.round(background.image.panY)}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-800}
                    max={800}
                    step={5}
                    value={background.image.panY}
                    onChange={(e) =>
                      onUpdateBgImageConfig({ panY: Number(e.target.value) })
                    }
                    className="w-full accent-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateBgImageConfig({ zoom: 1, panX: 0, panY: 0 })
                  }
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset View</span>
                </button>
                <button
                  type="button"
                  onClick={onRemoveBgImage}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-xs font-medium text-rose-300 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </>
          ) : (
            <p className="text-xs text-zinc-500 text-center py-4 px-2 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
              Upload an image to set it as your full-bleed canvas backdrop with
              zoom and pan controls.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

