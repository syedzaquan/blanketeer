import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Copy,
  FlipHorizontal2,
  FlipVertical2,
  ImagePlus,
  Italic,
  RotateCcw,
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
import { PRESET_COLOR_SWATCHES } from '../utils/canvasHelpers';
import { cn } from '../utils/cn';
import {
  getFontWeightOptions,
  groupFontEntries,
  type FontOption,
} from '../utils/fonts';
import {
  TEXT_STYLE_PRESETS,
  findMatchingTextPreset,
  type TextStylePresetId,
} from '../utils/textPresets';
import {
  ImageStyleControls,
  type ImagePropsPatch,
} from './ImageStyleControls';

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
      fontOpsz: number;
      fontSoft: number;
      fontWonk: number;
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
  onApplyTextPreset: (preset: TextStylePresetId) => void;
  onApplyCutout: (shape: CutoutShape, cornerPercent?: number) => void;
  onUpdateImageProps: (patch: ImagePropsPatch) => void;
  onTriggerFillSlot: (slotId: string) => void;
  onUpdateSlotCorner: (slotId: string, cornerPercent: number) => void;
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

const HIGHLIGHT_SWATCHES = [
  '#ffffff',
  '#0a0a0a',
  '#262626',
  '#fde68a',
  '#f97316',
  '#0ea5e9',
  '#10b981',
  '#f43f5e',
];

const WEIGHT_PRESETS = [
  { value: 300, label: '300' },
  { value: 400, label: '400' },
  { value: 600, label: '600' },
  { value: 700, label: '700' },
  { value: 900, label: '900' },
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
  onApplyTextPreset,
  onApplyCutout,
  onUpdateImageProps,
  onTriggerFillSlot,
  onUpdateSlotCorner,
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
      <aside className="w-72 shrink-0 border-l border-neutral-800/80 bg-[#0f0f0f] p-3.5 overflow-y-auto hidden lg:flex flex-col gap-4">
        <div>
          <h2 className="text-xs font-medium text-neutral-300 mb-2">
            Canvas Overview
          </h2>
          <div className="flex flex-col gap-2 text-xs border-t border-neutral-800/80 pt-2.5">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Format</span>
              <span className="text-neutral-200">
                {preset.label} ({preset.ratioLabel})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Dimensions</span>
              <span className="font-mono text-neutral-300">
                {preset.width} × {preset.height}px
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Background</span>
              <span className="capitalize text-neutral-300">{background.mode}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Layers</span>
              <span className="font-mono text-neutral-300">{layerCount}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-800/80 pt-3.5">
          <h2 className="text-xs font-medium text-neutral-300 mb-2">
            Shortcuts
          </h2>
          <div className="flex flex-col gap-1.5 text-xs">
            {[
              { label: 'Edit text', keys: 'Double-click' },
              { label: 'Undo / Redo', keys: 'Cmd/Ctrl + Z' },
              { label: 'Duplicate', keys: 'Cmd/Ctrl + D' },
              { label: 'Delete', keys: 'Backspace' },
              { label: 'Nudge', keys: 'Arrow keys' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-1 text-neutral-400"
              >
                <span>{item.label}</span>
                <kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-neutral-300">
                  {item.keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        'border-neutral-800/80 bg-[#0f0f0f] p-4 lg:p-3.5 overflow-y-auto flex-col gap-4 lg:gap-3.5 shrink-0',
        mobileOpen
          ? 'flex w-full h-[44vh] max-h-[420px] border-t lg:w-72 lg:h-auto lg:max-h-none lg:border-t-0 lg:border-l'
          : 'hidden lg:flex lg:w-72 lg:border-l'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <span className="block text-[11px] text-neutral-500">
            {selectedObject.kind === 'text'
              ? 'Text Layer'
              : selectedObject.kind === 'image'
                ? 'Image Layer'
                : selectedObject.kind === 'slot'
                  ? 'Image Slot'
                  : 'Layer'}
          </span>
          <h2 className="text-sm lg:text-xs font-medium text-neutral-100 truncate max-w-[165px]">
            {selectedObject.name}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 lg:gap-1">
          <button
            type="button"
            onClick={onDuplicate}
            aria-label="Duplicate"
            title="Duplicate"
            className="p-2.5 lg:p-1.5 rounded-lg lg:rounded-md bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 transition-colors"
          >
            <Copy className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete"
            title="Delete"
            className="p-2.5 lg:p-1.5 rounded-lg lg:rounded-md bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Done"
            title="Done"
            className="lg:hidden p-2.5 rounded-lg bg-neutral-100 text-neutral-950 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TEXT INSPECTOR */}
      {selectedObject.kind === 'text' && (
        <>
          <div>
            <label className="block text-xs lg:text-[11px] text-neutral-400 mb-1.5 lg:mb-1">
              Content
            </label>
            <textarea
              rows={2}
              value={selectedObject.text}
              onChange={(e) => onUpdateText({ text: e.target.value })}
              className="w-full px-3 py-2 lg:px-2.5 lg:py-1.5 rounded-lg lg:rounded-md bg-neutral-800/80 border border-neutral-700 text-sm lg:text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-500 resize-y"
              placeholder="Enter text..."
            />
          </div>

          {/* Typography */}
          <div className="border-t border-neutral-800/80 pt-3.5 flex flex-col gap-3">
            <h3 className="text-xs font-medium text-neutral-300">
              Typography
            </h3>

            <div>
              <span className="block text-xs lg:text-[11px] text-neutral-400 mb-1.5 lg:mb-1">
                Style
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {TEXT_STYLE_PRESETS.map((preset) => {
                  const activePresetId = findMatchingTextPreset(
                    selectedObject.fontSize,
                    selectedObject.fontWeight,
                    selectedObject.fill
                  );
                  const isActive = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onApplyTextPreset(preset.id)}
                      className={cn(
                        'px-2.5 py-2 lg:py-1.5 rounded-lg lg:rounded-md border text-left transition-colors flex items-center justify-between gap-1.5',
                        isActive
                          ? 'bg-neutral-700 border-neutral-500 text-white'
                          : 'bg-neutral-800/80 border-neutral-700 text-neutral-200 hover:bg-neutral-700/70'
                      )}
                    >
                      <span className="text-xs font-medium truncate">
                        {preset.label}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                        {preset.fontSize}px
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs lg:text-[11px] text-neutral-400 mb-1.5 lg:mb-1">
                Font
              </label>
              <select
                value={selectedObject.fontFamily}
                onChange={(e) => onUpdateText({ fontFamily: e.target.value })}
                className="w-full px-3 py-2.5 lg:px-2.5 lg:py-1.5 rounded-lg lg:rounded-md bg-neutral-800/80 border border-neutral-700 text-sm lg:text-xs text-neutral-100 focus:outline-none focus:border-neutral-500"
              >
                {groupFontEntries(availableFonts).map((entry) =>
                  entry.kind === 'single' ? (
                    <option key={entry.font.family} value={entry.font.family}>
                      {entry.font.name} ({entry.font.categoryLabel})
                    </option>
                  ) : (
                    <optgroup
                      key={`optgroup-${entry.groupName}`}
                      label={entry.groupName}
                    >
                      {entry.fonts.map((font) => (
                        <option key={font.family} value={font.family}>
                          {font.name}
                          {font.badge ? ` (${font.badge})` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )
                )}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs lg:text-[11px] text-neutral-400">
                  Size
                </label>
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
                    className="w-16 lg:w-14 px-2 py-1.5 lg:px-1.5 lg:py-0.5 rounded-md lg:rounded bg-neutral-800/80 border border-neutral-700 text-sm lg:text-xs font-mono text-right text-neutral-100 focus:outline-none focus:border-neutral-500"
                  />
                  <span className="text-xs lg:text-[10px] text-neutral-500">px</span>
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
                className="hidden lg:block w-full"
              />
            </div>

            {/* Font Weight */}
            {selectedObject.fontFamily.toLowerCase() === 'fraunces' ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="inspector-font-weight"
                    className="text-[11px] text-neutral-400"
                  >
                    Weight
                  </label>
                  <span className="text-[11px] font-mono text-neutral-300">
                    {selectedObject.fontWeight}
                  </span>
                </div>
                <input
                  id="inspector-font-weight"
                  aria-label="Font Weight"
                  type="range"
                  min={100}
                  max={900}
                  step={10}
                  value={Math.min(900, Math.max(100, selectedObject.fontWeight))}
                  onChange={(e) =>
                    onUpdateText({ fontWeight: Number(e.target.value) })
                  }
                  className="w-full"
                />
                <div className="grid grid-cols-5 gap-1 mt-1 p-0.5 rounded-lg lg:rounded-md bg-neutral-800/80 border border-neutral-700">
                  {WEIGHT_PRESETS.map((w) => (
                    <button
                      key={w.value}
                      type="button"
                      onClick={() => onUpdateText({ fontWeight: w.value })}
                      className={cn(
                        'py-2 lg:py-1 rounded text-xs lg:text-[11px] font-medium transition-colors',
                        selectedObject.fontWeight === w.value
                          ? 'bg-neutral-700 text-white'
                          : 'text-neutral-400 hover:text-neutral-100'
                      )}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              (() => {
                const weightOptions = getFontWeightOptions(
                  selectedObject.fontFamily,
                  availableFonts
                );
                const colsClass =
                  weightOptions.length === 1
                    ? 'grid-cols-1'
                    : weightOptions.length <= 2
                      ? 'grid-cols-2'
                      : weightOptions.length >= 9
                        ? 'grid-cols-3'
                        : 'grid-cols-4';
                return (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-neutral-400">
                        Weight
                      </span>
                      <span className="text-[11px] font-mono text-neutral-300">
                        {selectedObject.fontWeight}
                      </span>
                    </div>
                    <div
                      className={cn(
                        'grid gap-1 p-0.5 rounded-md bg-neutral-800/80 border border-neutral-700',
                        colsClass
                      )}
                      role="group"
                      aria-label="Font Weight Selection"
                    >
                      {weightOptions.map((w) => (
                        <button
                          key={w.value}
                          type="button"
                          onClick={() => onUpdateText({ fontWeight: w.value })}
                          className={cn(
                            'py-2 px-1 lg:py-1 rounded flex flex-col items-center justify-center leading-tight transition-colors',
                            selectedObject.fontWeight === w.value
                              ? 'bg-neutral-700 text-white'
                              : 'text-neutral-400 hover:text-neutral-100'
                          )}
                        >
                          <span className="text-xs lg:text-[11px] font-medium">
                            {w.value}
                          </span>
                          <span className="text-[10px] lg:text-[9px] text-neutral-400 truncate max-w-full">
                            {w.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()
            )}

            {/* Fraunces Variable Axes */}
            {selectedObject.fontFamily.toLowerCase() === 'fraunces' && (
              <div className="p-2.5 rounded-md bg-neutral-800/60 border border-neutral-700/80 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-neutral-300">
                    Variable Axes
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateText({
                        fontOpsz: Math.min(
                          144,
                          Math.max(9, selectedObject.fontSize || 72)
                        ),
                        fontWeight: 600,
                        fontSoft: 100,
                        fontWonk: 0,
                      })
                    }
                    className="text-[11px] text-neutral-500 hover:text-neutral-200 transition-colors"
                  >
                    Reset
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <label
                      htmlFor="inspector-font-opsz"
                      className="text-neutral-400"
                    >
                      Optical Size
                    </label>
                    <span className="font-mono text-neutral-300">
                      {selectedObject.fontOpsz}
                    </span>
                  </div>
                  <input
                    id="inspector-font-opsz"
                    aria-label="Optical Size"
                    type="range"
                    min={9}
                    max={144}
                    step={1}
                    value={selectedObject.fontOpsz}
                    onChange={(e) =>
                      onUpdateText({ fontOpsz: Number(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <label
                      htmlFor="inspector-font-soft"
                      className="text-neutral-400"
                    >
                      Softness
                    </label>
                    <span className="font-mono text-neutral-300">
                      {String(selectedObject.fontSoft).padStart(3, '0')}
                    </span>
                  </div>
                  <input
                    id="inspector-font-soft"
                    aria-label="Softness"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={selectedObject.fontSoft}
                    onChange={(e) =>
                      onUpdateText({ fontSoft: Number(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <label
                      htmlFor="inspector-font-wonk"
                      className="text-neutral-400"
                    >
                      Wonky
                    </label>
                    <span className="font-mono text-neutral-300">
                      {selectedObject.fontWonk >= 0.5 ? '1 (On)' : '0 (Off)'}
                    </span>
                  </div>
                  <input
                    id="inspector-font-wonk"
                    aria-label="Wonky"
                    type="range"
                    min={0}
                    max={1}
                    step={1}
                    value={selectedObject.fontWonk >= 0.5 ? 1 : 0}
                    onChange={(e) =>
                      onUpdateText({ fontWonk: Number(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Style & Alignment */}
            <div className="grid grid-cols-2 gap-2 lg:gap-1.5">
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg lg:rounded-md bg-neutral-800/80 border border-neutral-700">
                <button
                  type="button"
                  aria-label="Italic"
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
                    'flex-1 py-2.5 lg:py-1.5 rounded flex items-center justify-center transition-colors',
                    selectedObject.fontStyle === 'italic'
                      ? 'bg-neutral-700 text-white'
                      : 'text-neutral-400 hover:text-neutral-100'
                  )}
                >
                  <Italic className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Underline"
                  title="Underline"
                  onClick={() =>
                    onUpdateText({ underline: !selectedObject.underline })
                  }
                  className={cn(
                    'flex-1 py-2.5 lg:py-1.5 rounded flex items-center justify-center transition-colors',
                    selectedObject.underline
                      ? 'bg-neutral-700 text-white'
                      : 'text-neutral-400 hover:text-neutral-100'
                  )}
                >
                  <Underline className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Strikethrough"
                  title="Strikethrough"
                  onClick={() =>
                    onUpdateText({ linethrough: !selectedObject.linethrough })
                  }
                  className={cn(
                    'flex-1 py-2.5 lg:py-1.5 rounded flex items-center justify-center transition-colors',
                    selectedObject.linethrough
                      ? 'bg-neutral-700 text-white'
                      : 'text-neutral-400 hover:text-neutral-100'
                  )}
                >
                  <Strikethrough className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-0.5 p-0.5 rounded-lg lg:rounded-md bg-neutral-800/80 border border-neutral-700">
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
                      aria-label={`Align ${align.id}`}
                      title={`Align ${align.id}`}
                      onClick={() => onUpdateText({ textAlign: align.id })}
                      className={cn(
                        'flex-1 py-2.5 lg:py-1.5 rounded flex items-center justify-center transition-colors',
                        selectedObject.textAlign === align.id
                          ? 'bg-neutral-700 text-white'
                          : 'text-neutral-400 hover:text-neutral-100'
                      )}
                    >
                      <Icon className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Text Color */}
          <div className="border-t border-neutral-800/80 pt-3.5 flex flex-col gap-2.5">
            <h3 className="text-xs font-medium text-neutral-300">
              Color
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selectedObject.fill}
                onChange={(e) => onUpdateText({ fill: e.target.value })}
                aria-label="Text fill color"
                className="w-9 h-9 lg:w-7 lg:h-7 rounded border border-neutral-600 bg-transparent cursor-pointer shrink-0"
              />
              <input
                type="text"
                value={selectedObject.fill}
                onChange={(e) => onUpdateText({ fill: e.target.value })}
                className="flex-1 px-3 py-2 lg:px-2.5 lg:py-1 rounded-lg lg:rounded-md bg-neutral-800/80 border border-neutral-700 text-sm lg:text-xs font-mono text-neutral-100 focus:outline-none focus:border-neutral-500"
              />
            </div>
            <div className="grid grid-cols-5 gap-2 lg:gap-1.5">
              {PRESET_COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => onUpdateText({ fill: swatch })}
                  aria-label={`Set text color ${swatch}`}
                  className={cn(
                    'h-8 lg:h-6 rounded-md lg:rounded border transition-colors',
                    selectedObject.fill.toLowerCase() === swatch.toLowerCase()
                      ? 'border-white ring-1 ring-white/50'
                      : 'border-neutral-700 hover:border-neutral-500'
                  )}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
          </div>

          {/* Line Highlight / Pill */}
          <div className="border-t border-neutral-800/80 pt-3.5 flex flex-col gap-2.5">
            <h3 className="text-xs font-medium text-neutral-300">
              Highlight
            </h3>

            <div className="grid grid-cols-3 gap-0.5 p-0.5 rounded-lg lg:rounded-md bg-neutral-800/80 border border-neutral-700">
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
                    'py-2 lg:py-1 rounded-md lg:rounded-[5px] text-xs font-medium transition-colors',
                    selectedObject.bgStyle === mode.id
                      ? 'bg-neutral-700 text-white'
                      : 'text-neutral-400 hover:text-neutral-100'
                  )}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {selectedObject.bgStyle !== 'none' && (
              <div className="flex flex-col gap-2.5 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedObject.textBgColor}
                    onChange={(e) =>
                      onUpdateText({ textBgColor: e.target.value })
                    }
                    aria-label="Highlight background color"
                    className="w-9 h-9 lg:w-7 lg:h-7 rounded border border-neutral-600 bg-transparent cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={selectedObject.textBgColor}
                    onChange={(e) =>
                      onUpdateText({ textBgColor: e.target.value })
                    }
                    className="flex-1 px-3 py-2 lg:px-2.5 lg:py-1 rounded-lg lg:rounded-md bg-neutral-800/80 border border-neutral-700 text-sm lg:text-xs font-mono text-neutral-100 focus:outline-none focus:border-neutral-500"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2 lg:gap-1.5">
                  {HIGHLIGHT_SWATCHES.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() => onUpdateText({ textBgColor: swatch })}
                      aria-label={`Set highlight color ${swatch}`}
                      className={cn(
                        'h-8 lg:h-6 rounded-md lg:rounded border transition-colors',
                        selectedObject.textBgColor.toLowerCase() ===
                          swatch.toLowerCase()
                          ? 'border-white ring-1 ring-white/50'
                          : 'border-neutral-800 hover:border-neutral-600'
                      )}
                      style={{ backgroundColor: swatch }}
                    />
                  ))}
                </div>

                {selectedObject.bgStyle === 'pill' && (
                  <>
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-neutral-400">Pill Radius</span>
                        <span className="font-mono text-neutral-300">
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
                        className="w-full"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-neutral-400">Pad X</span>
                          <span className="font-mono text-neutral-300">
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
                          className="w-full"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-neutral-400">Pad Y</span>
                          <span className="font-mono text-neutral-300">
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
                          className="w-full"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Spacing Controls */}
          <div className="border-t border-neutral-800/80 pt-3.5 flex flex-col gap-2.5">
            <h3 className="text-xs font-medium text-neutral-300">
              Spacing
            </h3>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <label
                  htmlFor="inspector-line-height"
                  className="text-neutral-400"
                >
                  Line Height
                </label>
                <span className="font-mono text-neutral-300">
                  {selectedObject.lineHeight.toFixed(2)}
                </span>
              </div>
              <input
                id="inspector-line-height"
                aria-label="Line Height"
                type="range"
                min={0.5}
                max={3.0}
                step={0.05}
                value={selectedObject.lineHeight}
                onChange={(e) =>
                  onUpdateText({ lineHeight: Number(e.target.value) })
                }
                className="w-full"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <label
                  htmlFor="inspector-char-spacing"
                  className="text-neutral-400"
                >
                  Letter Spacing
                </label>
                <span className="font-mono text-neutral-300">
                  {selectedObject.charSpacing}
                </span>
              </div>
              <input
                id="inspector-char-spacing"
                aria-label="Letter Spacing"
                type="range"
                min={-200}
                max={1000}
                step={10}
                value={selectedObject.charSpacing}
                onChange={(e) =>
                  onUpdateText({ charSpacing: Number(e.target.value) })
                }
                className="w-full"
              />
            </div>
          </div>
        </>
      )}

      {/* IMAGE INSPECTOR */}
      {selectedObject.kind === 'image' && (
        <ImageStyleControls
          selectedImage={selectedObject}
          idPrefix="inspector-image"
          onApplyCutout={onApplyCutout}
          onUpdateImageProps={onUpdateImageProps}
        />
      )}

      {/* TEMPLATE SLOT INSPECTOR */}
      {selectedObject.kind === 'slot' && (
        <div className="border-t border-neutral-800/80 pt-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-neutral-300">
              Photo Slot
            </h3>
            <span className="text-[10px] font-mono text-neutral-500">
              {selectedObject.width} × {selectedObject.height}px
            </span>
          </div>

          <button
            type="button"
            onClick={() => onTriggerFillSlot(selectedObject.id)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 lg:py-2 px-3 rounded-lg lg:rounded-md bg-neutral-100 hover:bg-white text-neutral-950 text-sm lg:text-xs font-medium transition-colors"
          >
            <ImagePlus className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
            <span>Choose Photo</span>
          </button>

          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <label
                htmlFor="inspector-slot-corner"
                className="text-neutral-400"
              >
                Corner Radius
              </label>
              <span className="font-mono text-neutral-300">
                {selectedObject.cornerPercent}%
              </span>
            </div>
            <input
              id="inspector-slot-corner"
              aria-label="Slot corner radius"
              type="range"
              min={0}
              max={25}
              step={1}
              value={selectedObject.cornerPercent}
              onChange={(e) =>
                onUpdateSlotCorner(selectedObject.id, Number(e.target.value))
              }
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* COMMON TRANSFORM & LAYER ORDER */}
      <div className="border-t border-neutral-800/80 pt-3.5 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-neutral-300">
            Transform
          </h3>
          <button
            type="button"
            onClick={() => onUpdateCommon({ resetTransform: true })}
            aria-label="Reset transform"
            title="Reset transform"
            className="p-2 lg:p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/70 transition-colors"
          >
            <RotateCcw className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:gap-1.5">
          <button
            type="button"
            onClick={() => onUpdateCommon({ flipX: !selectedObject.flipX })}
            aria-label="Flip horizontal"
            title="Flip horizontal"
            className={cn(
              'flex items-center justify-center py-2.5 lg:py-1.5 rounded-lg lg:rounded-md border transition-colors',
              selectedObject.flipX
                ? 'bg-neutral-700 border-neutral-500 text-white'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-700/70 hover:text-white'
            )}
          >
            <FlipHorizontal2 className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onUpdateCommon({ flipY: !selectedObject.flipY })}
            aria-label="Flip vertical"
            title="Flip vertical"
            className={cn(
              'flex items-center justify-center py-2.5 lg:py-1.5 rounded-lg lg:rounded-md border transition-colors',
              selectedObject.flipY
                ? 'bg-neutral-700 border-neutral-500 text-white'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-700/70 hover:text-white'
            )}
          >
            <FlipVertical2 className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-neutral-400">Opacity</span>
            <span className="font-mono text-neutral-300">
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
            className="w-full"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-neutral-400">Rotation</span>
            <span className="font-mono text-neutral-300">
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
            className="w-full"
          />
        </div>
      </div>

      {/* Layer Ordering */}
      <div className="border-t border-neutral-800/80 pt-3.5">
        <h3 className="text-xs font-medium text-neutral-300 mb-2">
          Arrange
        </h3>
        <div className="grid grid-cols-4 gap-1.5 lg:gap-1">
          <button
            type="button"
            onClick={onBringToFront}
            aria-label="Bring to Front"
            title="Bring to Front"
            className="flex items-center justify-center py-2.5 lg:py-2 rounded-lg lg:rounded-md bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 transition-colors"
          >
            <ArrowUpToLine className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
          </button>
          <button
            type="button"
            onClick={onBringForward}
            aria-label="Bring Forward"
            title="Bring Forward"
            className="flex items-center justify-center py-2.5 lg:py-2 rounded-lg lg:rounded-md bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 transition-colors"
          >
            <ArrowUp className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
          </button>
          <button
            type="button"
            onClick={onSendBackward}
            aria-label="Send Backward"
            title="Send Backward"
            className="flex items-center justify-center py-2.5 lg:py-2 rounded-lg lg:rounded-md bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 transition-colors"
          >
            <ArrowDown className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
          </button>
          <button
            type="button"
            onClick={onSendToBack}
            aria-label="Send to Back"
            title="Send to Back"
            className="flex items-center justify-center py-2.5 lg:py-2 rounded-lg lg:rounded-md bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 transition-colors"
          >
            <ArrowDownToLine className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
