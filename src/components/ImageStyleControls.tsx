import { useState } from 'react';
import {
  Circle,
  Heart,
  Link2,
  Link2Off,
  RotateCcw,
  Square,
  Star,
} from 'lucide-react';
import type {
  CutoutShape,
  ImageStrokeStyle,
  SelectedImageProps,
} from '../types/editor';
import { cn } from '../utils/cn';

export type ImagePropsPatch = Partial<{
  width: number;
  height: number;
  aspectLocked: boolean;
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: ImageStrokeStyle;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowOpacity: number;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}>;

interface ImageStyleControlsProps {
  selectedImage: SelectedImageProps | null;
  idPrefix: string;
  onApplyCutout: (shape: CutoutShape, cornerPercent?: number) => void;
  onUpdateImageProps: (patch: ImagePropsPatch) => void;
}

const CUTOUT_OPTIONS: {
  id: CutoutShape;
  label: string;
  icon: typeof Circle;
}[] = [
  { id: 'none', label: 'Original', icon: RotateCcw },
  { id: 'circle', label: 'Circle', icon: Circle },
  { id: 'square', label: 'Square', icon: Square },
  { id: 'rounded', label: 'Squircle', icon: Square },
  { id: 'star', label: 'Star', icon: Star },
  { id: 'heart', label: 'Heart', icon: Heart },
];

const STROKE_SWATCHES = [
  '#ffffff',
  '#09090b',
  '#fde68a',
  '#f472b6',
  '#a78bfa',
  '#38bdf8',
  '#34d399',
  '#f97316',
];

const STROKE_STYLES: { id: ImageStrokeStyle; label: string }[] = [
  { id: 'solid', label: 'Solid' },
  { id: 'dashed', label: 'Dashed' },
  { id: 'dotted', label: 'Dotted' },
];

const SHADOW_SWATCHES = [
  '#000000',
  '#18181b',
  '#312e81',
  '#581c87',
  '#0f172a',
  '#ffffff',
];

interface NumericFieldProps {
  id: string;
  ariaLabel: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  suffix?: string;
  onCommit: (next: number) => void;
}

function NumericField({
  id,
  ariaLabel,
  value,
  min,
  max,
  disabled = false,
  suffix,
  onCommit,
}: NumericFieldProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const commitValue = (raw: string) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || raw.trim() === '') {
      setDraft(String(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, Math.round(parsed)));
    setDraft(String(clamped));
    if (clamped !== value) {
      onCommit(clamped);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center rounded-lg bg-zinc-950 border border-zinc-800 px-2 py-1 focus-within:border-violet-500 transition-colors',
        disabled && 'opacity-40 pointer-events-none'
      )}
    >
      <input
        id={id}
        aria-label={ariaLabel}
        type="number"
        min={min}
        max={max}
        disabled={disabled}
        value={focused ? draft : String(value)}
        onFocus={() => {
          setDraft(String(value));
          setFocused(true);
        }}
        onChange={(e) => {
          const nextRaw = e.target.value;
          setDraft(nextRaw);
          const parsed = Number(nextRaw);
          if (
            nextRaw.trim() !== '' &&
            Number.isFinite(parsed) &&
            parsed >= min &&
            parsed <= max
          ) {
            onCommit(Math.round(parsed));
          }
        }}
        onBlur={(e) => {
          setFocused(false);
          commitValue(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commitValue((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            setDraft(String(value));
            setFocused(false);
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="w-full min-w-0 bg-transparent text-xs font-mono text-zinc-100 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      {suffix && (
        <span className="text-[10px] font-mono text-zinc-500 ml-1 shrink-0">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function ImageStyleControls({
  selectedImage,
  idPrefix,
  onApplyCutout,
  onUpdateImageProps,
}: ImageStyleControlsProps) {
  const strokeWidth = selectedImage?.strokeWidth ?? 0;
  const strokeColor = selectedImage?.strokeColor ?? '#ffffff';
  const strokeStyle = selectedImage?.strokeStyle ?? 'solid';
  const hasStroke = strokeWidth > 0;
  const shadowEnabled = selectedImage?.shadowEnabled ?? false;
  const shadowColor = selectedImage?.shadowColor ?? '#000000';
  const shadowOpacity = selectedImage?.shadowOpacity ?? 45;
  const shadowBlur = selectedImage?.shadowBlur ?? 24;
  const shadowOffsetX = selectedImage?.shadowOffsetX ?? 0;
  const shadowOffsetY = selectedImage?.shadowOffsetY ?? 12;

  return (
    <>
      {/* Dimensions (Width, Lock Aspect Ratio, Height) */}
      <div className="border-t border-zinc-800/80 pt-4">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Dimensions
          </h3>
          {selectedImage ? (
            <span className="text-[10px] font-mono text-zinc-500">
              Orig {selectedImage.naturalWidth}×{selectedImage.naturalHeight}
            </span>
          ) : (
            <span className="text-[10px] text-zinc-500">Select an image</span>
          )}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-1.5 p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
          <div>
            <label
              htmlFor={`${idPrefix}-width`}
              className="block text-[10px] text-zinc-400 mb-1"
            >
              Width
            </label>
            <NumericField
              id={`${idPrefix}-width`}
              ariaLabel="Image width in pixels"
              value={selectedImage?.width ?? 0}
              min={20}
              max={4000}
              disabled={!selectedImage}
              suffix="px"
              onCommit={(width) => onUpdateImageProps({ width })}
            />
          </div>

          <button
            id={`${idPrefix}-aspect-lock`}
            type="button"
            disabled={!selectedImage}
            aria-label="Lock aspect ratio"
            aria-pressed={selectedImage?.aspectLocked ?? true}
            title={
              selectedImage?.aspectLocked
                ? 'Unlock aspect ratio'
                : 'Lock aspect ratio'
            }
            onClick={() =>
              selectedImage &&
              onUpdateImageProps({ aspectLocked: !selectedImage.aspectLocked })
            }
            className={cn(
              'h-[26px] w-7 mb-[1px] rounded-lg border flex items-center justify-center transition-colors',
              !selectedImage
                ? 'opacity-40 cursor-not-allowed bg-zinc-950 border-zinc-800 text-zinc-500'
                : selectedImage.aspectLocked
                  ? 'bg-violet-600/25 border-violet-500/60 text-violet-200'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            )}
          >
            {selectedImage?.aspectLocked ?? true ? (
              <Link2 className="w-3.5 h-3.5" />
            ) : (
              <Link2Off className="w-3.5 h-3.5" />
            )}
          </button>

          <div>
            <label
              htmlFor={`${idPrefix}-height`}
              className="block text-[10px] text-zinc-400 mb-1"
            >
              Height
            </label>
            <NumericField
              id={`${idPrefix}-height`}
              ariaLabel="Image height in pixels"
              value={selectedImage?.height ?? 0}
              min={20}
              max={4000}
              disabled={!selectedImage}
              suffix="px"
              onCommit={(height) => onUpdateImageProps({ height })}
            />
          </div>
        </div>
      </div>

      {/* Shape Cutout & Mask + Squircle Border Radius */}
      <div className="border-t border-zinc-800/80 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Shape Cutout & Mask
          </h3>
          {!selectedImage && (
            <span className="text-[10px] text-zinc-500">Select an image</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {CUTOUT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = selectedImage?.cutoutShape === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={!selectedImage}
                onClick={() => onApplyCutout(opt.id)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-[11px] font-medium transition-all',
                  !selectedImage
                    ? 'opacity-40 cursor-not-allowed bg-zinc-900/40 border-zinc-800 text-zinc-500'
                    : active
                      ? 'bg-violet-600/20 border-violet-500 text-white'
                      : 'bg-zinc-900/70 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700'
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4',
                    opt.id === 'rounded' && 'rounded-[4px]'
                  )}
                />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {selectedImage?.cutoutShape === 'rounded' && (
          <div className="mt-3 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <label
                htmlFor={`${idPrefix}-squircle-radius`}
                className="text-zinc-400"
              >
                Border Radius
              </label>
              <div className="w-16">
                <NumericField
                  id={`${idPrefix}-squircle-radius`}
                  ariaLabel="Squircle border radius percentage"
                  value={selectedImage.cutoutRadius}
                  min={0}
                  max={50}
                  suffix="%"
                  onCommit={(val) => onApplyCutout('rounded', val)}
                />
              </div>
            </div>
            <input
              id={`${idPrefix}-squircle-radius-slider`}
              aria-label="Squircle border radius slider"
              type="range"
              min={0}
              max={50}
              step={1}
              value={selectedImage.cutoutRadius}
              onChange={(e) =>
                onApplyCutout('rounded', Number(e.target.value))
              }
              className="w-full accent-violet-500"
            />
          </div>
        )}
      </div>

      {/* Stroke Options */}
      <div className="border-t border-zinc-800/80 pt-4">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Stroke
          </h3>
          {selectedImage && (
            <button
              id={`${idPrefix}-stroke-toggle`}
              type="button"
              onClick={() =>
                onUpdateImageProps({ strokeWidth: hasStroke ? 0 : 8 })
              }
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors',
                hasStroke
                  ? 'bg-violet-600 border-violet-400/50 text-white'
                  : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:text-zinc-200'
              )}
            >
              {hasStroke ? 'On' : 'Off'}
            </button>
          )}
        </div>

        <div
          className={cn(
            'flex flex-col gap-3 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800',
            !selectedImage && 'opacity-40 pointer-events-none'
          )}
        >
          {/* Stroke Width Slider + Numeric px Input */}
          <div>
            <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
              <label
                htmlFor={`${idPrefix}-stroke-width`}
                className="text-zinc-400"
              >
                Stroke Width
              </label>
              <div className="w-16">
                <NumericField
                  id={`${idPrefix}-stroke-width`}
                  ariaLabel="Image stroke width in pixels"
                  value={strokeWidth}
                  min={0}
                  max={40}
                  disabled={!selectedImage}
                  suffix="px"
                  onCommit={(val) => onUpdateImageProps({ strokeWidth: val })}
                />
              </div>
            </div>
            <input
              id={`${idPrefix}-stroke-width-slider`}
              aria-label="Image stroke width slider"
              type="range"
              min={0}
              max={40}
              step={1}
              disabled={!selectedImage}
              value={strokeWidth}
              onChange={(e) =>
                onUpdateImageProps({ strokeWidth: Number(e.target.value) })
              }
              className="w-full accent-violet-500"
            />
          </div>

          {/* Stroke Color Picker + Swatches */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-zinc-400">Stroke Color</span>
              <span className="font-mono text-zinc-300 uppercase">
                {strokeColor}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <input
                id={`${idPrefix}-stroke-color`}
                aria-label="Image stroke color"
                type="color"
                disabled={!selectedImage}
                value={strokeColor}
                onChange={(e) =>
                  onUpdateImageProps({
                    strokeColor: e.target.value,
                    ...(strokeWidth === 0 ? { strokeWidth: 8 } : {}),
                  })
                }
                className="w-7 h-7 rounded-lg border border-zinc-700 bg-transparent cursor-pointer shrink-0"
              />
              {STROKE_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  disabled={!selectedImage}
                  aria-label={`Stroke color ${swatch}`}
                  onClick={() =>
                    onUpdateImageProps({
                      strokeColor: swatch,
                      ...(strokeWidth === 0 ? { strokeWidth: 8 } : {}),
                    })
                  }
                  className={cn(
                    'w-5 h-5 rounded-full border transition-transform hover:scale-110',
                    strokeColor.toLowerCase() === swatch.toLowerCase() &&
                      hasStroke
                      ? 'border-white ring-2 ring-violet-500/60'
                      : 'border-zinc-700'
                  )}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
          </div>

          {/* Stroke Style */}
          <div>
            <span className="block text-[11px] text-zinc-400 mb-1.5">
              Stroke Style
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {STROKE_STYLES.map((opt) => (
                <button
                  key={opt.id}
                  id={`${idPrefix}-stroke-style-${opt.id}`}
                  type="button"
                  disabled={!selectedImage}
                  onClick={() =>
                    onUpdateImageProps({
                      strokeStyle: opt.id,
                      ...(strokeWidth === 0 ? { strokeWidth: 8 } : {}),
                    })
                  }
                  className={cn(
                    'py-1.5 rounded-lg text-[11px] font-medium border transition-colors',
                    strokeStyle === opt.id
                      ? 'bg-violet-600/25 border-violet-500 text-white'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Drop Shadow */}
      <div className="border-t border-zinc-800/80 pt-4">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Drop Shadow
          </h3>
          {selectedImage && (
            <button
              id={`${idPrefix}-shadow-toggle`}
              type="button"
              role="switch"
              aria-checked={shadowEnabled}
              aria-label="Toggle Drop Shadow"
              onClick={() =>
                onUpdateImageProps({ shadowEnabled: !shadowEnabled })
              }
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors',
                shadowEnabled
                  ? 'bg-violet-600 border-violet-400/50 text-white'
                  : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:text-zinc-200'
              )}
            >
              {shadowEnabled ? 'On' : 'Off'}
            </button>
          )}
        </div>

        <div
          className={cn(
            'flex flex-col gap-3 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800',
            !selectedImage && 'opacity-40 pointer-events-none'
          )}
        >
          {/* Blur */}
          <div>
            <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
              <label
                htmlFor={`${idPrefix}-shadow-blur`}
                className="text-zinc-400"
              >
                Blur
              </label>
              <div className="w-16">
                <NumericField
                  id={`${idPrefix}-shadow-blur`}
                  ariaLabel="Drop shadow blur in pixels"
                  value={shadowBlur}
                  min={0}
                  max={80}
                  disabled={!selectedImage}
                  suffix="px"
                  onCommit={(val) => onUpdateImageProps({ shadowBlur: val })}
                />
              </div>
            </div>
            <input
              id={`${idPrefix}-shadow-blur-slider`}
              aria-label="Drop shadow blur slider"
              type="range"
              min={0}
              max={80}
              step={1}
              disabled={!selectedImage}
              value={shadowBlur}
              onChange={(e) =>
                onUpdateImageProps({ shadowBlur: Number(e.target.value) })
              }
              className="w-full accent-violet-500"
            />
          </div>

          {/* Opacity */}
          <div>
            <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
              <label
                htmlFor={`${idPrefix}-shadow-opacity`}
                className="text-zinc-400"
              >
                Opacity
              </label>
              <div className="w-16">
                <NumericField
                  id={`${idPrefix}-shadow-opacity`}
                  ariaLabel="Drop shadow opacity percentage"
                  value={shadowOpacity}
                  min={0}
                  max={100}
                  disabled={!selectedImage}
                  suffix="%"
                  onCommit={(val) => onUpdateImageProps({ shadowOpacity: val })}
                />
              </div>
            </div>
            <input
              id={`${idPrefix}-shadow-opacity-slider`}
              aria-label="Drop shadow opacity slider"
              type="range"
              min={0}
              max={100}
              step={1}
              disabled={!selectedImage}
              value={shadowOpacity}
              onChange={(e) =>
                onUpdateImageProps({ shadowOpacity: Number(e.target.value) })
              }
              className="w-full accent-violet-500"
            />
          </div>

          {/* Offset X & Offset Y */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <label
                  htmlFor={`${idPrefix}-shadow-x`}
                  className="text-zinc-400"
                >
                  Offset X
                </label>
                <span className="font-mono text-zinc-200">{shadowOffsetX}</span>
              </div>
              <input
                id={`${idPrefix}-shadow-x`}
                aria-label="Drop shadow offset X"
                type="range"
                min={-60}
                max={60}
                step={1}
                disabled={!selectedImage}
                value={shadowOffsetX}
                onChange={(e) =>
                  onUpdateImageProps({ shadowOffsetX: Number(e.target.value) })
                }
                className="w-full accent-violet-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <label
                  htmlFor={`${idPrefix}-shadow-y`}
                  className="text-zinc-400"
                >
                  Offset Y
                </label>
                <span className="font-mono text-zinc-200">{shadowOffsetY}</span>
              </div>
              <input
                id={`${idPrefix}-shadow-y`}
                aria-label="Drop shadow offset Y"
                type="range"
                min={-60}
                max={60}
                step={1}
                disabled={!selectedImage}
                value={shadowOffsetY}
                onChange={(e) =>
                  onUpdateImageProps({ shadowOffsetY: Number(e.target.value) })
                }
                className="w-full accent-violet-500"
              />
            </div>
          </div>

          {/* Shadow Color */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-zinc-400">Shadow Color</span>
              <span className="font-mono text-zinc-300 uppercase">
                {shadowColor}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <input
                id={`${idPrefix}-shadow-color`}
                aria-label="Drop shadow color"
                type="color"
                disabled={!selectedImage}
                value={shadowColor}
                onChange={(e) =>
                  onUpdateImageProps({ shadowColor: e.target.value })
                }
                className="w-7 h-7 rounded-lg border border-zinc-700 bg-transparent cursor-pointer shrink-0"
              />
              {SHADOW_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  disabled={!selectedImage}
                  aria-label={`Shadow color ${swatch}`}
                  onClick={() => onUpdateImageProps({ shadowColor: swatch })}
                  className={cn(
                    'w-5 h-5 rounded-full border transition-transform hover:scale-110',
                    shadowColor.toLowerCase() === swatch.toLowerCase() &&
                      shadowEnabled
                      ? 'border-white ring-2 ring-violet-500/60'
                      : 'border-zinc-700'
                  )}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

