import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Circle,
  Copy,
  FlipHorizontal2,
  FlipVertical2,
  Heart,
  Italic,
  Keyboard,
  RotateCcw,
  Square,
  Star,
  Strikethrough,
  Trash2,
  Underline,
  X,
} from 'lucide-react';
import {
  ASPECT_RATIO_PRESETS,
  type AspectRatioKey,
  type BackgroundState,
  type CutoutShape,
  type SelectedObjectState,
  type TextBackgroundStyle,
} from '../types/editor';
import { cn } from '../utils/cn';
import type { FontOption } from '../utils/fonts';

interface InspectorProps {
  selectedObject: SelectedObjectState | null;
  availableFonts: FontOption[];
  aspectRatio: AspectRatioKey;
  background: BackgroundState;
  layerCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onUpdateText: (
    patch: Partial<{
      text: string;
      fontFamily: string;
      fontSize: number;
      fontWeight: number;
      fontStyle: 'normal' | 'italic';
      underline: boolean;
      linethrough: boolean;
      textAlign: 'left' | 'center' | 'right' | 'justify';
      fill: string;
      lineHeight: number;
      charSpacing: number;
      bgStyle: TextBackgroundStyle;
      textBgColor: string;
      pillRadius: number;
      pillPaddingX: number;
      pillPaddingY: number;
    }>
  ) => void;
  onApplyCutout: (shape: CutoutShape, cornerPercent?: number) => void;
  onUpdateCommon: (
    patch: Partial<{
      opacity: number;
      angle: number;
      flipX: boolean;
      flipY: boolean;
      resetTransform: boolean;
    }>
  ) => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const TEXT_COLOR_SWATCHES = [
  '#ffffff',
  '#09090b',
  '#fde68a',
  '#f472b6',
  '#a78bfa',
  '#38bdf8',
  '#34d399',
  '#fb7185',
  '#f97316',
  '#e4e4e7',
];

const HIGHLIGHT_SWATCHES = [
  '#ffffff',
  '#09090b',
  '#fde68a',
  '#8b5cf6',
  '#ec4899',
  '#0ea5e9',
  '#10b981',
  '#f43f5e',
];

const FONT_WEIGHTS = [
  { value: 400, label: '400' },
  { value: 600, label: '600' },
  { value: 700, label: '700' },
  { value: 900, label: '900' },
];

const CUTOUT_BUTTONS: { id: CutoutShape; label: string; icon: typeof Circle }[] = [
  { id: 'none', label: 'None', icon: RotateCcw },
  { id: 'circle', label: 'Circle', icon: Circle },
  { id: 'square', label: 'Square', icon: Square },
  { id: 'rounded', label: 'Squircle', icon: Square },
  { id: 'star', label: 'Star', icon: Star },
  { id: 'heart', label: 'Heart', icon: Heart },
];

export function Inspector({
  selectedObject,
  availableFonts,
  aspectRatio,
  background,
  layerCount,
  mobileOpen,
  onCloseMobile,
  onUpdateText,
  onApplyCutout,
  onUpdateCommon,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onDuplicate,
  onDelete,
}: InspectorProps) {
  if (!selectedObject) {
    const preset = ASPECT_RATIO_PRESETS[aspectRatio];
    return (
      <aside className="w-80 shrink-0 border-l border-zinc-800/80 bg-zinc-950/90 p-4 overflow-y-auto hidden lg:flex flex-col gap-5">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
            Canvas Overview
          </h2>
          <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex flex-col gap-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Format</span>
              <span className="font-medium text-zinc-100">
                {preset.label} ({preset.ratioLabel})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Export Size</span>
              <span className="font-mono text-zinc-200">
                {preset.width} × {preset.height}px
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Background</span>
              <span className="capitalize text-zinc-200">{background.mode}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Layers</span>
              <span className="font-mono text-zinc-200">{layerCount}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800/80 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Keyboard className="w-3.5 h-3.5 text-violet-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Quick Shortcuts
            </h2>
          </div>
          <div className="flex flex-col gap-2 text-xs">
            {[
              { label: 'Edit text inline', keys: 'Double-click' },
              { label: 'Undo / Redo', keys: 'Cmd/Ctrl + Z' },
              { label: 'Duplicate layer', keys: 'Cmd/Ctrl + D' },
              { label: 'Delete layer', keys: 'Del / Backspace' },
              { label: 'Nudge position', keys: 'Arrow keys' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/60"
              >
                <span className="text-zinc-400">{item.label}</span>
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-200">
                  {item.keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto p-3.5 rounded-2xl bg-gradient-to-br from-violet-950/40 to-zinc-900/80 border border-violet-500/20 text-xs text-zinc-300 leading-relaxed">
          Select any text or image on the canvas to customize Fedro / Fraunces
          typography, pill highlights, shape cutouts, and layer order.
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        'border-zinc-800/80 bg-zinc-950/95 p-3.5 sm:p-4 overflow-y-auto flex-col gap-4 sm:gap-5 shrink-0',
        mobileOpen
          ? 'flex w-full h-[38vh] max-h-[340px] border-t lg:w-80 lg:h-auto lg:max-h-none lg:border-t-0 lg:border-l'
          : 'hidden lg:flex lg:w-80 lg:border-l'
      )}
    >
      {/* Header badge */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-400">
            {selectedObject.kind === 'text'
              ? 'Text Inspector'
              : selectedObject.kind === 'image'
                ? 'Image Inspector'
                : 'Object Inspector'}
          </span>
          <h2 className="text-sm font-semibold text-white truncate max-w-[175px]">
            {selectedObject.name}
          </h2>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onDuplicate}
            title="Duplicate"
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete"
            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            title="Done"
            className="lg:hidden flex items-center gap-1 px-2 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-medium text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Done</span>
          </button>
        </div>
      </div>

      {/* TEXT INSPECTOR */}
      {selectedObject.kind === 'text' && (
        <>
          {/* Live Text Content */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
              Text Content
            </label>
            <textarea
              rows={2}
              value={selectedObject.text}
              onChange={(e) => onUpdateText({ text: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 resize-y"
              placeholder="Type your story text..."
            />
          </div>

          {/* Font Family & Size */}
          <div className="border-t border-zinc-800/80 pt-4 flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Typography
            </h3>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">
                Font Family
              </label>
              <select
                value={selectedObject.fontFamily}
                onChange={(e) => onUpdateText({ fontFamily: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
              >
                {availableFonts.map((font) => (
                  <option key={font.family} value={font.family}>
                    {font.name} ({font.categoryLabel})
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size slider + numeric input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] text-zinc-400">Font Size</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={12}
                    max={Math.max(280, selectedObject.fontSize)}
                    value={selectedObject.fontSize}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (Number.isFinite(val) && val >= 8) {
                        onUpdateText({ fontSize: Math.min(400, val) });
                      }
                    }}
                    className="w-16 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-right text-zinc-100 focus:outline-none focus:border-violet-500"
                  />
                  <span className="text-[11px] text-zinc-500">px</span>
                </div>
              </div>
              <input
                type="range"
                min={16}
                max={Math.max(220, selectedObject.fontSize)}
                value={selectedObject.fontSize}
                onChange={(e) =>
                  onUpdateText({ fontSize: Number(e.target.value) })
                }
                className="w-full accent-violet-500"
              />
            </div>

            {/* Font Weight */}
            <div>
              <span className="block text-[11px] text-zinc-400 mb-1.5">
                Weight
              </span>
              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
                {FONT_WEIGHTS.map((w) => (
                  <button
                    key={w.value}
                    type="button"
                    onClick={() => onUpdateText({ fontWeight: w.value })}
                    className={cn(
                      'py-1.5 rounded-lg text-xs font-medium transition-colors',
                      selectedObject.fontWeight === w.value
                        ? 'bg-violet-600 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Italic, Underline, Strikethrough + Alignment */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
                <button
                  type="button"
                  title="Italic"
                  onClick={() =>
                    onUpdateText({
                      fontStyle:
                        selectedObject.fontStyle === 'italic'
                          ? 'normal'
                          : 'italic',
                    })
                  }
                  className={cn(
                    'flex-1 py-1.5 rounded-lg flex items-center justify-center transition-colors',
                    selectedObject.fontStyle === 'italic'
                      ? 'bg-violet-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  )}
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Underline"
                  onClick={() =>
                    onUpdateText({ underline: !selectedObject.underline })
                  }
                  className={cn(
                    'flex-1 py-1.5 rounded-lg flex items-center justify-center transition-colors',
                    selectedObject.underline
                      ? 'bg-violet-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  )}
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Strikethrough"
                  onClick={() =>
                    onUpdateText({ linethrough: !selectedObject.linethrough })
                  }
                  className={cn(
                    'flex-1 py-1.5 rounded-lg flex items-center justify-center transition-colors',
                    selectedObject.linethrough
                      ? 'bg-violet-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  )}
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
                {(
                  [
                    { id: 'left', icon: AlignLeft },
                    { id: 'center', icon: AlignCenter },
                    { id: 'right', icon: AlignRight },
                    { id: 'justify', icon: AlignJustify },
                  ] as const
                ).map((align) => {
                  const Icon = align.icon;
                  return (
                    <button
                      key={align.id}
                      type="button"
                      title={`Align ${align.id}`}
                      onClick={() => onUpdateText({ textAlign: align.id })}
                      className={cn(
                        'flex-1 py-1.5 rounded-lg flex items-center justify-center transition-colors',
                        selectedObject.textAlign === align.id
                          ? 'bg-violet-600 text-white'
                          : 'text-zinc-400 hover:text-white'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Text Color */}
          <div className="border-t border-zinc-800/80 pt-4 flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Text Color
            </h3>
            <div className="flex items-center gap-2.5">
              <input
                type="color"
                value={selectedObject.fill}
                onChange={(e) => onUpdateText({ fill: e.target.value })}
                aria-label="Text fill color"
                className="w-9 h-9 rounded-lg border border-zinc-700 bg-transparent cursor-pointer shrink-0"
              />
              <input
                type="text"
                value={selectedObject.fill}
                onChange={(e) => onUpdateText({ fill: e.target.value })}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-100 uppercase focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {TEXT_COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => onUpdateText({ fill: swatch })}
                  aria-label={`Set text color ${swatch}`}
                  className={cn(
                    'h-7 rounded-lg border transition-transform hover:scale-105',
                    selectedObject.fill.toLowerCase() === swatch.toLowerCase()
                      ? 'border-violet-400 ring-2 ring-violet-500/40'
                      : 'border-white/15'
                  )}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
          </div>

          {/* Instagram Pill / Line Background */}
          <div className="border-t border-zinc-800/80 pt-4 flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Line Highlight / Pill
            </h3>

            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
              {(
                [
                  { id: 'none', label: 'None' },
                  { id: 'solid', label: 'Solid' },
                  { id: 'pill', label: 'IG Pill' },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onUpdateText({ bgStyle: mode.id })}
                  className={cn(
                    'py-1.5 rounded-lg text-xs font-medium transition-colors',
                    selectedObject.bgStyle === mode.id
                      ? 'bg-violet-600 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {selectedObject.bgStyle !== 'none' && (
              <div className="flex flex-col gap-3 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    value={selectedObject.textBgColor}
                    onChange={(e) =>
                      onUpdateText({ textBgColor: e.target.value })
                    }
                    aria-label="Highlight background color"
                    className="w-8 h-8 rounded-md border border-zinc-700 bg-transparent cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={selectedObject.textBgColor}
                    onChange={(e) =>
                      onUpdateText({ textBgColor: e.target.value })
                    }
                    className="flex-1 px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100 uppercase focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {HIGHLIGHT_SWATCHES.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() => onUpdateText({ textBgColor: swatch })}
                      aria-label={`Set highlight color ${swatch}`}
                      className={cn(
                        'h-6 rounded-md border transition-transform hover:scale-105',
                        selectedObject.textBgColor.toLowerCase() ===
                          swatch.toLowerCase()
                          ? 'border-violet-400 ring-2 ring-violet-500/40'
                          : 'border-white/15'
                      )}
                      style={{ backgroundColor: swatch }}
                    />
                  ))}
                </div>

                {selectedObject.bgStyle === 'pill' && (
                  <>
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-zinc-400">Pill Radius</span>
                        <span className="font-mono text-zinc-200">
                          {selectedObject.pillRadius}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={48}
                        value={selectedObject.pillRadius}
                        onChange={(e) =>
                          onUpdateText({ pillRadius: Number(e.target.value) })
                        }
                        className="w-full accent-violet-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-zinc-400">Pad X</span>
                          <span className="font-mono text-zinc-200">
                            {selectedObject.pillPaddingX}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={6}
                          max={60}
                          value={selectedObject.pillPaddingX}
                          onChange={(e) =>
                            onUpdateText({
                              pillPaddingX: Number(e.target.value),
                            })
                          }
                          className="w-full accent-violet-500"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-zinc-400">Pad Y</span>
                          <span className="font-mono text-zinc-200">
                            {selectedObject.pillPaddingY}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={32}
                          value={selectedObject.pillPaddingY}
                          onChange={(e) =>
                            onUpdateText({
                              pillPaddingY: Number(e.target.value),
                            })
                          }
                          className="w-full accent-violet-500"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Spacing Controls */}
          <div className="border-t border-zinc-800/80 pt-4 flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Spacing
            </h3>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-zinc-400">Line Height</span>
                <span className="font-mono text-zinc-200">
                  {selectedObject.lineHeight.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.8}
                max={2.4}
                step={0.05}
                value={selectedObject.lineHeight}
                onChange={(e) =>
                  onUpdateText({ lineHeight: Number(e.target.value) })
                }
                className="w-full accent-violet-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-zinc-400">Letter Spacing</span>
                <span className="font-mono text-zinc-200">
                  {selectedObject.charSpacing}
                </span>
              </div>
              <input
                type="range"
                min={-80}
                max={500}
                step={10}
                value={selectedObject.charSpacing}
                onChange={(e) =>
                  onUpdateText({ charSpacing: Number(e.target.value) })
                }
                className="w-full accent-violet-500"
              />
            </div>
          </div>
        </>
      )}

      {/* IMAGE INSPECTOR */}
      {selectedObject.kind === 'image' && (
        <div className="border-t border-zinc-800/80 pt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Shape Cutout
            </h3>
            <span className="text-[10px] font-mono text-zinc-500">
              {selectedObject.naturalWidth} × {selectedObject.naturalHeight}px
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {CUTOUT_BUTTONS.map((btn) => {
              const Icon = btn.icon;
              const active = selectedObject.cutoutShape === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => onApplyCutout(btn.id)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl border text-[11px] font-medium transition-all',
                    active
                      ? 'bg-violet-600/20 border-violet-500 text-white'
                      : 'bg-zinc-900/70 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>

          {selectedObject.cutoutShape === 'rounded' && (
            <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-zinc-400">Corner Radius</span>
                <span className="font-mono text-zinc-200">
                  {selectedObject.cutoutRadius}%
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={48}
                value={selectedObject.cutoutRadius}
                onChange={(e) =>
                  onApplyCutout('rounded', Number(e.target.value))
                }
                className="w-full accent-violet-500"
              />
            </div>
          )}
        </div>
      )}

      {/* COMMON TRANSFORM & LAYER ORDER */}
      <div className="border-t border-zinc-800/80 pt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Transform & Opacity
          </h3>
          <button
            type="button"
            onClick={() => onUpdateCommon({ resetTransform: true })}
            className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onUpdateCommon({ flipX: !selectedObject.flipX })}
            className={cn(
              'flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-colors',
              selectedObject.flipX
                ? 'bg-violet-600/20 border-violet-500 text-white'
                : 'bg-zinc-900/70 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
            )}
          >
            <FlipHorizontal2 className="w-3.5 h-3.5" />
            <span>Flip H</span>
          </button>
          <button
            type="button"
            onClick={() => onUpdateCommon({ flipY: !selectedObject.flipY })}
            className={cn(
              'flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-colors',
              selectedObject.flipY
                ? 'bg-violet-600/20 border-violet-500 text-white'
                : 'bg-zinc-900/70 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
            )}
          >
            <FlipVertical2 className="w-3.5 h-3.5" />
            <span>Flip V</span>
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-zinc-400">Opacity</span>
            <span className="font-mono text-zinc-200">
              {Math.round(selectedObject.opacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={selectedObject.opacity}
            onChange={(e) =>
              onUpdateCommon({ opacity: Number(e.target.value) })
            }
            className="w-full accent-violet-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-zinc-400">Rotation</span>
            <span className="font-mono text-zinc-200">
              {selectedObject.angle}°
            </span>
          </div>
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={
              selectedObject.angle > 180
                ? selectedObject.angle - 360
                : selectedObject.angle
            }
            onChange={(e) => onUpdateCommon({ angle: Number(e.target.value) })}
            className="w-full accent-violet-500"
          />
        </div>
      </div>

      {/* Layer Ordering */}
      <div className="border-t border-zinc-800/80 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2.5">
          Layer Order
        </h3>
        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={onBringToFront}
            title="Bring to Front"
            className="flex flex-col items-center gap-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 transition-colors"
          >
            <ArrowUpToLine className="w-3.5 h-3.5" />
            <span>Front</span>
          </button>
          <button
            type="button"
            onClick={onBringForward}
            title="Bring Forward"
            className="flex flex-col items-center gap-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 transition-colors"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Forward</span>
          </button>
          <button
            type="button"
            onClick={onSendBackward}
            title="Send Backward"
            className="flex flex-col items-center gap-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 transition-colors"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <button
            type="button"
            onClick={onSendToBack}
            title="Send to Back"
            className="flex flex-col items-center gap-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-300 transition-colors"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Bottom</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

