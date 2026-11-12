import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Circle,
  FlipHorizontal2,
  FlipVertical2,
  Heart,
  Link2,
  Link2Off,
  RotateCcw,
  SlidersHorizontal,
  Square,
  Star,
} from 'lucide-react';
import type {
  CutoutShape,
  ImageFilterConfig,
  ImageStrokeStyle,
  SelectedImageProps,
} from '../types/editor';
import type { AdjustmentQuality } from '../utils/backgroundFilters';
import {
  DEFAULT_IMAGE_FILTER,
  IMAGE_FILTER_PRESETS,
  isNeutralImageFilter,
} from '../utils/imageFilters';
import { cn } from '../utils/cn';
import { RangeSlider } from './RangeSlider';

export type ImagePropsPatch = Partial<{
  width: number;
  height: number;
  aspectLocked: boolean;
  angle: number;
  flipX: boolean;
  flipY: boolean;
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: ImageStrokeStyle;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowOpacity: number;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  filter: Partial<ImageFilterConfig>;
  filterQuality: AdjustmentQuality;
}>;

interface ImageStyleControlsProps {
  selectedImage: SelectedImageProps | null;
  canvasWidth: number;
  canvasHeight: number;
  idPrefix: string;
  showTransformControls?: boolean;
  onApplyCutout: (shape: CutoutShape, cornerPercent?: number) => void;
  onUpdateImageProps: (patch: ImagePropsPatch) => void;
}

const SIZE_PERCENT_PRESETS = [100, 50, 25] as const;

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
  '#0a0a0a',
  '#d4d4d4',
  '#fde68a',
  '#f472b6',
  '#38bdf8',
  '#34d399',
  '#f97316',
];

const STROKE_STYLES: { id: ImageStrokeStyle; label: string }[] = [
  { id: 'solid', label: 'Solid' },
  { id: 'dashed', label: 'Dashed' },
  { id: 'dotted', label: 'Dotted' },
  { id: 'stamp', label: 'Stamp' },
  { id: 'wavy', label: 'Wavy' },
  { id: 'polaroid', label: 'Polaroid' },
];

const SHADOW_SWATCHES = [
  '#000000',
  '#171717',
  '#262626',
  '#404040',
  '#737373',
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
        'flex items-center rounded-lg lg:rounded-md bg-neutral-800/80 border border-neutral-700 px-2.5 py-2 lg:px-2 lg:py-1 focus-within:border-neutral-500 transition-colors',
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
        className="w-full min-w-0 bg-transparent text-sm lg:text-xs font-mono text-neutral-100 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      {suffix && (
        <span className="text-[10px] font-mono text-neutral-500 ml-1 shrink-0">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function ImageStyleControls({
  selectedImage,
  canvasWidth,
  canvasHeight,
  idPrefix,
  showTransformControls = true,
  onApplyCutout,
  onUpdateImageProps,
}: ImageStyleControlsProps) {
  const strokeWidth = selectedImage?.strokeWidth ?? 0;
  const strokeColor = selectedImage?.strokeColor ?? '#ffffff';
  const strokeStyle = selectedImage?.strokeStyle ?? 'solid';
  const isFrameStyle =
    strokeStyle === 'stamp' ||
    strokeStyle === 'wavy' ||
    strokeStyle === 'polaroid';
  const hasStroke = strokeWidth > 0;
  const shadowEnabled = selectedImage?.shadowEnabled ?? false;
  const shadowColor = selectedImage?.shadowColor ?? '#000000';
  const shadowOpacity = selectedImage?.shadowOpacity ?? 45;
  const shadowBlur = selectedImage?.shadowBlur ?? 24;
  const shadowOffsetX = selectedImage?.shadowOffsetX ?? 0;
  const shadowOffsetY = selectedImage?.shadowOffsetY ?? 12;
  const imageFilter = selectedImage?.filter ?? DEFAULT_IMAGE_FILTER;
  const isFilterActive = !isNeutralImageFilter(imageFilter);
  const [showFineTuneFilters, setShowFineTuneFilters] = useState(false);

  const commitFilterFull = () => {
    onUpdateImageProps({
      filter: imageFilter,
      filterQuality: 'full',
    });
  };

  return (
    <>
      {/* Dimensions */}
      <div className="border-t border-neutral-800/80 pt-3.5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-neutral-300">
            Dimensions
          </h3>
          {selectedImage ? (
            <span className="text-[10px] font-mono text-neutral-500">
              Orig {selectedImage.naturalWidth}×{selectedImage.naturalHeight}
            </span>
          ) : (
            <span className="text-[10px] text-neutral-500">Select an image</span>
          )}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-1.5">
          <div>
            <label
              htmlFor={`${idPrefix}-width`}
              className="block text-[11px] text-neutral-400 mb-1"
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
              'h-9 w-9 lg:h-[26px] lg:w-7 mb-[1px] rounded-lg lg:rounded-md border flex items-center justify-center transition-colors',
              !selectedImage
                ? 'opacity-40 cursor-not-allowed bg-neutral-800/50 border-neutral-800 text-neutral-600'
                : selectedImage.aspectLocked
                  ? 'bg-neutral-700 border-neutral-500 text-white'
                  : 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:text-neutral-100'
            )}
          >
            {selectedImage?.aspectLocked ?? true ? (
              <Link2 className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
            ) : (
              <Link2Off className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
            )}
          </button>

          <div>
            <label
              htmlFor={`${idPrefix}-height`}
              className="block text-[11px] text-neutral-400 mb-1"
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

        {/* Quick % Size Presets (locks aspect ratio) */}
        <div className="mt-2.5 flex flex-col gap-1.5">
          {(
            [
              { axis: 'width', label: 'Width', total: canvasWidth, current: selectedImage?.width },
              { axis: 'height', label: 'Height', total: canvasHeight, current: selectedImage?.height },
            ] as const
          ).map((row) => (
            <div
              key={row.axis}
              className="grid grid-cols-[3rem_1fr] items-center gap-2"
            >
              <span className="text-[11px] text-neutral-400">{row.label}</span>
              <div className="grid grid-cols-3 gap-1">
                {SIZE_PERCENT_PRESETS.map((pct) => {
                  const targetPx = Math.round((row.total * pct) / 100);
                  const active =
                    Boolean(selectedImage?.aspectLocked) &&
                    row.current !== undefined &&
                    Math.abs(row.current - targetPx) <= 1;
                  return (
                    <button
                      key={pct}
                      type="button"
                      disabled={!selectedImage}
                      onClick={() =>
                        onUpdateImageProps({
                          [row.axis]: targetPx,
                          aspectLocked: true,
                        })
                      }
                      aria-label={`Set image ${row.axis} to ${pct}%`}
                      title={`Set ${row.label.toLowerCase()} to ${pct}% (${targetPx}px) with aspect ratio locked`}
                      className={cn(
                        'py-1.5 lg:py-1 rounded-md lg:rounded text-xs lg:text-[11px] font-mono font-medium border transition-colors',
                        !selectedImage
                          ? 'opacity-40 cursor-not-allowed bg-neutral-800/40 border-neutral-800 text-neutral-600'
                          : active
                            ? 'bg-neutral-700 border-neutral-500 text-white'
                            : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-700/70 hover:text-white'
                      )}
                    >
                      {pct}%
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showTransformControls && (
        <div className="border-t border-neutral-800/80 pt-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-neutral-300">
              Rotation &amp; Flip
            </h3>
            {selectedImage &&
              (selectedImage.angle !== 0 ||
                selectedImage.flipX ||
                selectedImage.flipY) && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateImageProps({ angle: 0, flipX: false, flipY: false })
                  }
                  aria-label="Reset rotation and flip"
                  title="Reset rotation & flip"
                  className="p-1.5 lg:p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/70 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
          </div>

          <div
            className={cn(
              'flex flex-col gap-2.5',
              !selectedImage && 'opacity-40 pointer-events-none'
            )}
          >
            <div className="grid grid-cols-2 gap-2 lg:gap-1.5">
              <button
                type="button"
                disabled={!selectedImage}
                onClick={() =>
                  onUpdateImageProps({ flipX: !selectedImage?.flipX })
                }
                aria-label="Flip horizontal"
                title="Flip horizontal"
                className={cn(
                  'flex items-center justify-center gap-1.5 py-2.5 lg:py-1.5 rounded-lg lg:rounded-md border text-xs lg:text-[11px] font-medium transition-colors',
                  selectedImage?.flipX
                    ? 'bg-neutral-700 border-neutral-500 text-white'
                    : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-700/70 hover:text-white'
                )}
              >
                <FlipHorizontal2 className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                <span>Flip H</span>
              </button>
              <button
                type="button"
                disabled={!selectedImage}
                onClick={() =>
                  onUpdateImageProps({ flipY: !selectedImage?.flipY })
                }
                aria-label="Flip vertical"
                title="Flip vertical"
                className={cn(
                  'flex items-center justify-center gap-1.5 py-2.5 lg:py-1.5 rounded-lg lg:rounded-md border text-xs lg:text-[11px] font-medium transition-colors',
                  selectedImage?.flipY
                    ? 'bg-neutral-700 border-neutral-500 text-white'
                    : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-700/70 hover:text-white'
                )}
              >
                <FlipVertical2 className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                <span>Flip V</span>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <label
                  htmlFor={`${idPrefix}-rotation`}
                  className="text-neutral-400"
                >
                  Rotation
                </label>
                <span className="font-mono text-neutral-300">
                  {selectedImage?.angle ?? 0}°
                </span>
              </div>
              <RangeSlider
                id={`${idPrefix}-rotation`}
                aria-label="Image rotation"
                min={-180}
                max={180}
                step={1}
                disabled={!selectedImage}
                value={
                  selectedImage
                    ? selectedImage.angle > 180
                      ? selectedImage.angle - 360
                      : selectedImage.angle
                    : 0
                }
                defaultValue={0}
                onValueChange={(angle) => onUpdateImageProps({ angle })}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Shape Cutout & Mask */}
      <div className="border-t border-neutral-800/80 pt-3.5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-neutral-300">
            Mask Shape
          </h3>
          {!selectedImage && (
            <span className="text-[10px] text-neutral-500">Select an image</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
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
                  'flex flex-col items-center justify-center gap-1 py-2.5 px-2 lg:py-2 lg:px-1.5 rounded-lg lg:rounded-md border text-xs lg:text-[11px] font-medium transition-colors',
                  !selectedImage
                    ? 'opacity-40 cursor-not-allowed bg-neutral-800/40 border-neutral-800 text-neutral-600'
                    : active
                      ? 'bg-neutral-700 border-neutral-500 text-white'
                      : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-700/70 hover:text-white'
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 lg:w-3.5 lg:h-3.5',
                    opt.id === 'rounded' && 'rounded-[3px]'
                  )}
                />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {selectedImage?.cutoutShape === 'rounded' && (
          <div className="mt-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <label
                htmlFor={`${idPrefix}-squircle-radius`}
                className="text-neutral-400"
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
            <RangeSlider
              id={`${idPrefix}-squircle-radius-slider`}
              aria-label="Squircle border radius slider"
              min={0}
              max={50}
              step={1}
              value={selectedImage.cutoutRadius}
              defaultValue={16}
              onValueChange={(val) => onApplyCutout('rounded', val)}
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* Border / Frame Options */}
      <div className="border-t border-neutral-800/80 pt-3.5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-neutral-300">
            Border / Frame
          </h3>
          {selectedImage && (
            <button
              id={`${idPrefix}-stroke-toggle`}
              type="button"
              onClick={() =>
                onUpdateImageProps({
                  strokeWidth: hasStroke
                    ? 0
                    : isFrameStyle
                      ? 24
                      : 8,
                })
              }
              className={cn(
                'px-3 py-1.5 lg:px-2 lg:py-0.5 rounded-md lg:rounded text-xs lg:text-[11px] font-medium border transition-colors',
                hasStroke
                  ? 'bg-neutral-100 border-neutral-100 text-neutral-950'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              )}
            >
              {hasStroke ? 'On' : 'Off'}
            </button>
          )}
        </div>

        <div
          className={cn(
            'flex flex-col gap-2.5',
            !selectedImage && 'opacity-40 pointer-events-none'
          )}
        >
          <div>
            <div className="flex items-center justify-between gap-2 text-xs mb-1">
              <label
                htmlFor={`${idPrefix}-stroke-width`}
                className="text-neutral-400"
              >
                {isFrameStyle ? 'Frame Width' : 'Stroke Width'}
              </label>
              <div className="w-16">
                <NumericField
                  id={`${idPrefix}-stroke-width`}
                  ariaLabel="Image border width in pixels"
                  value={strokeWidth}
                  min={0}
                  max={64}
                  disabled={!selectedImage}
                  suffix="px"
                  onCommit={(val) => onUpdateImageProps({ strokeWidth: val })}
                />
              </div>
            </div>
            <RangeSlider
              id={`${idPrefix}-stroke-width-slider`}
              aria-label="Image border width slider"
              min={0}
              max={64}
              step={1}
              disabled={!selectedImage}
              value={strokeWidth}
              defaultValue={isFrameStyle ? 24 : 0}
              onValueChange={(val) => onUpdateImageProps({ strokeWidth: val })}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-neutral-400">
                {isFrameStyle ? 'Frame Color' : 'Stroke Color'}
              </span>
              <span className="font-mono text-neutral-300">
                {strokeColor}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <input
                id={`${idPrefix}-stroke-color`}
                aria-label="Image border color"
                type="color"
                disabled={!selectedImage}
                value={strokeColor}
                onChange={(e) =>
                  onUpdateImageProps({
                    strokeColor: e.target.value,
                    ...(strokeWidth === 0
                      ? { strokeWidth: isFrameStyle ? 24 : 8 }
                      : {}),
                  })
                }
                className="w-8 h-8 lg:w-6 lg:h-6 rounded border border-neutral-700 bg-transparent cursor-pointer shrink-0"
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
                      ...(strokeWidth === 0
                        ? { strokeWidth: isFrameStyle ? 24 : 8 }
                        : {}),
                    })
                  }
                  className={cn(
                    'w-7 h-7 lg:w-5 lg:h-5 rounded-md lg:rounded border transition-colors',
                    strokeColor.toLowerCase() === swatch.toLowerCase() &&
                      hasStroke
                      ? 'border-white ring-1 ring-white/50'
                      : 'border-neutral-700'
                  )}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
          </div>

          <div>
            <span className="block text-[11px] text-neutral-400 mb-1">
              Style
            </span>
            <div className="flex flex-wrap gap-1.5 lg:gap-1">
              {STROKE_STYLES.map((opt) => {
                const optIsFrame =
                  opt.id === 'stamp' ||
                  opt.id === 'wavy' ||
                  opt.id === 'polaroid';
                return (
                  <button
                    key={opt.id}
                    id={`${idPrefix}-stroke-style-${opt.id}`}
                    type="button"
                    disabled={!selectedImage}
                    onClick={() =>
                      onUpdateImageProps({
                        strokeStyle: opt.id,
                        ...(optIsFrame && strokeWidth < 16
                          ? { strokeWidth: 24 }
                          : strokeWidth === 0
                            ? { strokeWidth: 8 }
                            : {}),
                      })
                    }
                    className={cn(
                      'flex-1 min-w-[30%] py-2 lg:py-1 rounded-lg lg:rounded-md text-xs lg:text-[11px] font-medium border transition-colors',
                      strokeStyle === opt.id
                        ? 'bg-neutral-700 border-neutral-500 text-white'
                        : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:text-white'
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Drop Shadow */}
      <div className="border-t border-neutral-800/80 pt-3.5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-neutral-300">
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
                'px-3 py-1.5 lg:px-2 lg:py-0.5 rounded-md lg:rounded text-xs lg:text-[11px] font-medium border transition-colors',
                shadowEnabled
                  ? 'bg-neutral-100 border-neutral-100 text-neutral-950'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              )}
            >
              {shadowEnabled ? 'On' : 'Off'}
            </button>
          )}
        </div>

        <div
          className={cn(
            'flex flex-col gap-2.5',
            !selectedImage && 'opacity-40 pointer-events-none'
          )}
        >
          <div>
            <div className="flex items-center justify-between gap-2 text-xs mb-1">
              <label
                htmlFor={`${idPrefix}-shadow-blur`}
                className="text-neutral-400"
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
            <RangeSlider
              id={`${idPrefix}-shadow-blur-slider`}
              aria-label="Drop shadow blur slider"
              min={0}
              max={80}
              step={1}
              disabled={!selectedImage}
              value={shadowBlur}
              defaultValue={24}
              onValueChange={(val) => onUpdateImageProps({ shadowBlur: val })}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 text-xs mb-1">
              <label
                htmlFor={`${idPrefix}-shadow-opacity`}
                className="text-neutral-400"
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
            <RangeSlider
              id={`${idPrefix}-shadow-opacity-slider`}
              aria-label="Drop shadow opacity slider"
              min={0}
              max={100}
              step={1}
              disabled={!selectedImage}
              value={shadowOpacity}
              defaultValue={45}
              onValueChange={(val) => onUpdateImageProps({ shadowOpacity: val })}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <label
                  htmlFor={`${idPrefix}-shadow-x`}
                  className="text-neutral-400"
                >
                  Offset X
                </label>
                <span className="font-mono text-neutral-300">{shadowOffsetX}</span>
              </div>
              <RangeSlider
                id={`${idPrefix}-shadow-x`}
                aria-label="Drop shadow offset X"
                min={-60}
                max={60}
                step={1}
                disabled={!selectedImage}
                value={shadowOffsetX}
                defaultValue={0}
                onValueChange={(val) =>
                  onUpdateImageProps({ shadowOffsetX: val })
                }
                className="w-full"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <label
                  htmlFor={`${idPrefix}-shadow-y`}
                  className="text-neutral-400"
                >
                  Offset Y
                </label>
                <span className="font-mono text-neutral-300">{shadowOffsetY}</span>
              </div>
              <RangeSlider
                id={`${idPrefix}-shadow-y`}
                aria-label="Drop shadow offset Y"
                min={-60}
                max={60}
                step={1}
                disabled={!selectedImage}
                value={shadowOffsetY}
                defaultValue={12}
                onValueChange={(val) =>
                  onUpdateImageProps({ shadowOffsetY: val })
                }
                className="w-full"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-neutral-400">Shadow Color</span>
              <span className="font-mono text-neutral-300">
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
                className="w-8 h-8 lg:w-6 lg:h-6 rounded border border-neutral-700 bg-transparent cursor-pointer shrink-0"
              />
              {SHADOW_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  disabled={!selectedImage}
                  aria-label={`Shadow color ${swatch}`}
                  onClick={() => onUpdateImageProps({ shadowColor: swatch })}
                  className={cn(
                    'w-7 h-7 lg:w-5 lg:h-5 rounded-md lg:rounded border transition-colors',
                    shadowColor.toLowerCase() === swatch.toLowerCase() &&
                      shadowEnabled
                      ? 'border-white ring-1 ring-white/50'
                      : 'border-neutral-700'
                  )}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Post-Process Filters */}
      <div className="border-t border-neutral-800/80 pt-3.5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-neutral-300">Filters</h3>
          {isFilterActive && (
            <button
              type="button"
              disabled={!selectedImage}
              onClick={() =>
                onUpdateImageProps({
                  filter: { ...DEFAULT_IMAGE_FILTER },
                  filterQuality: 'full',
                })
              }
              className="text-[11px] font-medium text-neutral-400 hover:text-white transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {/* 1-Tap Look Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 -mx-0.5 px-0.5">
          {IMAGE_FILTER_PRESETS.map((preset) => {
            const active = imageFilter.preset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={!selectedImage}
                onClick={() =>
                  onUpdateImageProps({
                    filter: {
                      preset: preset.id,
                      intensity: preset.id === 'none' ? 100 : imageFilter.intensity || 100,
                    },
                    filterQuality: 'full',
                  })
                }
                className={cn(
                  'shrink-0 flex flex-col items-center gap-1 p-1.5 rounded-lg transition-colors min-w-[54px]',
                  active
                    ? 'bg-neutral-700 text-white'
                    : 'bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                )}
              >
                <span
                  className="w-7 h-5 rounded"
                  style={{ background: preset.swatchStyle }}
                />
                <span className="text-[10px] font-medium leading-none">
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Preset Intensity */}
        {imageFilter.preset !== 'none' && (
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <label
                htmlFor={`${idPrefix}-filter-intensity`}
                className="text-neutral-400"
              >
                Intensity
              </label>
              <span className="font-mono text-neutral-300">
                {Math.round(imageFilter.intensity)}%
              </span>
            </div>
            <RangeSlider
              id={`${idPrefix}-filter-intensity`}
              aria-label="Filter intensity"
              min={0}
              max={100}
              step={1}
              disabled={!selectedImage}
              value={Math.round(imageFilter.intensity)}
              defaultValue={100}
              onValueChange={(val) =>
                onUpdateImageProps({
                  filter: { intensity: val },
                  filterQuality: 'preview',
                })
              }
              onPointerUp={commitFilterFull}
              onTouchEnd={commitFilterFull}
              className="w-full"
            />
          </div>
        )}

        {/* Collapsible Fine-Tune Adjustments */}
        <button
          type="button"
          onClick={() => setShowFineTuneFilters((prev) => !prev)}
          className="mt-2.5 w-full flex items-center justify-between px-2.5 py-2 lg:py-1.5 rounded-lg lg:rounded-md bg-neutral-800/70 border border-neutral-700/80 text-xs font-medium text-neutral-300 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-400" />
            Fine-Tune Adjustments
          </span>
          {showFineTuneFilters ? (
            <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          )}
        </button>

        {showFineTuneFilters && (
          <div className="mt-2.5 space-y-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800/80 p-2.5">
            {(
              [
                { key: 'brightness', label: 'Brightness', min: -100, max: 100 },
                { key: 'contrast', label: 'Contrast', min: -100, max: 100 },
                { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
                { key: 'warmth', label: 'Warmth', min: -100, max: 100 },
                { key: 'shadows', label: 'Shadows', min: -100, max: 100 },
                { key: 'highlights', label: 'Highlights', min: -100, max: 100 },
                { key: 'dehaze', label: 'Dehaze', min: -100, max: 100 },
                { key: 'blackPoint', label: 'Black Point', min: -100, max: 100 },
                { key: 'blur', label: 'Blur', min: 0, max: 100 },
              ] as const
            ).map((item) => {
              const rawVal = Math.round((imageFilter[item.key] ?? 0) * 100);
              return (
                <div key={item.key}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <label
                      htmlFor={`${idPrefix}-filter-${item.key}`}
                      className="text-neutral-400"
                    >
                      {item.label}
                    </label>
                    <span className="font-mono text-neutral-300">
                      {rawVal > 0 && item.min < 0 ? `+${rawVal}` : rawVal}
                    </span>
                  </div>
                  <RangeSlider
                    id={`${idPrefix}-filter-${item.key}`}
                    aria-label={item.label}
                    min={item.min}
                    max={item.max}
                    step={1}
                    disabled={!selectedImage}
                    value={rawVal}
                    defaultValue={0}
                    onValueChange={(val) =>
                      onUpdateImageProps({
                        filter: { [item.key]: val / 100 },
                        filterQuality: 'preview',
                      })
                    }
                    onPointerUp={commitFilterFull}
                    onTouchEnd={commitFilterFull}
                    className="w-full"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
