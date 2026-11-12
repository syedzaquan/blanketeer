import { useRef, type ChangeEvent } from 'react';
import {
  ArrowUpDown,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import type {
  BackgroundImageAdjustments,
  BackgroundImageConfig,
  BackgroundMode,
  BackgroundOverlayGradient,
  BackgroundState,
  GradientBlendMode,
  GradientConfig,
} from '../../types/editor';
import {
  DEFAULT_BG_ADJUSTMENTS,
  isNeutralAdjustments,
} from '../../utils/backgroundFilters';
import {
  DEFAULT_OVERLAY_GRADIENT,
  PRESET_COLOR_SWATCHES,
  buildGradientCssPreview,
} from '../../utils/canvasHelpers';
import { RangeSlider } from '../RangeSlider';
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

const GRADIENT_PRESETS: { name: string; gradient: GradientConfig }[] = [
  {
    name: 'Dusk Rose',
    gradient: {
      startColor: '#F2A7A0',
      endColor: '#4D1D42',
      angle: 155,
      stops: [
        { offset: 0, color: '#F2A7A0' },
        { offset: 0.35, color: '#D6687E' },
        { offset: 0.7, color: '#983862' },
        { offset: 1, color: '#4D1D42' },
      ],
    },
  },
  {
    name: 'Sunset Glow',
    gradient: {
      startColor: '#F9C98E',
      endColor: '#67244E',
      angle: 150,
      stops: [
        { offset: 0, color: '#F9C98E' },
        { offset: 0.35, color: '#EC8366' },
        { offset: 0.7, color: '#BF4862' },
        { offset: 1, color: '#67244E' },
      ],
    },
  },
  {
    name: 'Honey Amber',
    gradient: {
      startColor: '#F7D488',
      endColor: '#7D3423',
      angle: 155,
      stops: [
        { offset: 0, color: '#F7D488' },
        { offset: 0.5, color: '#DE7E46' },
        { offset: 1, color: '#7D3423' },
      ],
    },
  },
  {
    name: 'Iris Twilight',
    gradient: {
      startColor: '#D4C4FC',
      endColor: '#241763',
      angle: 155,
      stops: [
        { offset: 0, color: '#D4C4FC' },
        { offset: 0.35, color: '#937DF2' },
        { offset: 0.7, color: '#5640B8' },
        { offset: 1, color: '#241763' },
      ],
    },
  },
  {
    name: 'Coastal Tide',
    gradient: {
      startColor: '#AEE5DE',
      endColor: '#113B57',
      angle: 160,
      stops: [
        { offset: 0, color: '#AEE5DE' },
        { offset: 0.35, color: '#56B4BF' },
        { offset: 0.7, color: '#287394' },
        { offset: 1, color: '#113B57' },
      ],
    },
  },
  {
    name: 'Emerald Sage',
    gradient: {
      startColor: '#BCE3C5',
      endColor: '#1C4B3B',
      angle: 160,
      stops: [
        { offset: 0, color: '#BCE3C5' },
        { offset: 0.5, color: '#4E9672' },
        { offset: 1, color: '#1C4B3B' },
      ],
    },
  },
  {
    name: 'Cotton Candy',
    gradient: {
      startColor: '#FAD0C4',
      endColor: '#8F8AE0',
      angle: 145,
      stops: [
        { offset: 0, color: '#FAD0C4' },
        { offset: 0.5, color: '#E899B8' },
        { offset: 1, color: '#8F8AE0' },
      ],
    },
  },
  {
    name: 'Aurora Sky',
    gradient: {
      startColor: '#D7ECF7',
      endColor: '#2C3E73',
      angle: 155,
      stops: [
        { offset: 0, color: '#D7ECF7' },
        { offset: 0.35, color: '#8ABEE2' },
        { offset: 0.7, color: '#597BBF' },
        { offset: 1, color: '#2C3E73' },
      ],
    },
  },
  {
    name: 'Espresso Slate',
    gradient: {
      startColor: '#9CA3B2',
      endColor: '#1D212B',
      angle: 165,
      stops: [
        { offset: 0, color: '#9CA3B2' },
        { offset: 0.5, color: '#4F5666' },
        { offset: 1, color: '#1D212B' },
      ],
    },
  },
];

const OVERLAY_PRESETS: {
  name: string;
  patch: Partial<BackgroundOverlayGradient>;
}[] = [
  {
    name: 'Bottom Dark',
    patch: {
      enabled: true,
      startColor: '#000000',
      startAlpha: 100,
      endColor: '#000000',
      endAlpha: 0,
      opacity: 80,
      angle: 0,
      coverage: 65,
      midpoint: 50,
      blendMode: 'source-over',
    },
  },
  {
    name: 'Top Dark',
    patch: {
      enabled: true,
      startColor: '#000000',
      startAlpha: 100,
      endColor: '#000000',
      endAlpha: 0,
      opacity: 80,
      angle: 180,
      coverage: 60,
      midpoint: 50,
      blendMode: 'source-over',
    },
  },
  {
    name: 'Full Fade',
    patch: {
      enabled: true,
      startColor: '#000000',
      startAlpha: 90,
      endColor: '#000000',
      endAlpha: 30,
      opacity: 75,
      angle: 0,
      coverage: 100,
      midpoint: 50,
      blendMode: 'multiply',
    },
  },
  {
    name: 'Warm Scrim',
    patch: {
      enabled: true,
      startColor: '#09090b',
      startAlpha: 95,
      endColor: '#f97316',
      endAlpha: 15,
      opacity: 70,
      angle: 20,
      coverage: 80,
      midpoint: 45,
      blendMode: 'overlay',
    },
  },
];

const BLEND_MODES: { value: GradientBlendMode; label: string }[] = [
  { value: 'source-over', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'screen', label: 'Screen' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
];

const OVERLAY_ANGLE_PRESETS = [
  { angle: 0, label: '0° ↑' },
  { angle: 90, label: '90° →' },
  { angle: 180, label: '180° ↓' },
  { angle: 270, label: '270° ←' },
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

  const overlayGradient: BackgroundOverlayGradient =
    background.image?.overlayGradient ?? DEFAULT_OVERLAY_GRADIENT;

  const updateOverlayGradient = (patch: Partial<BackgroundOverlayGradient>) => {
    onUpdateBgImageConfig({
      overlayGradient: { ...overlayGradient, ...patch },
    });
  };

  const adjustments: BackgroundImageAdjustments =
    background.image?.adjustments ?? DEFAULT_BG_ADJUSTMENTS;

  const updateAdjustment = (
    key: keyof BackgroundImageAdjustments,
    value: number
  ) => {
    onUpdateBgImageConfig({
      adjustments: { ...adjustments, [key]: value },
    });
  };

  const hasCustomAdjustments = !isNeutralAdjustments(adjustments);

  const ADJUSTMENT_CONTROLS: {
    key: keyof BackgroundImageAdjustments;
    id: string;
    label: string;
  }[] = [
    { key: 'brightness', id: 'bg-adjust-brightness', label: 'Brightness' },
    { key: 'contrast', id: 'bg-adjust-contrast', label: 'Contrast' },
    { key: 'shadows', id: 'bg-adjust-shadows', label: 'Shadows' },
    { key: 'highlights', id: 'bg-adjust-highlights', label: 'Highlights' },
    { key: 'dehaze', id: 'bg-adjust-dehaze', label: 'Dehaze' },
    { key: 'blackPoint', id: 'bg-adjust-black-point', label: 'Black Point' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Mode Switcher */}
      <div>
        <h2 className="text-xs font-medium text-neutral-300 mb-2">
          Background
        </h2>
        <div className="grid grid-cols-3 gap-0.5 p-0.5 rounded-lg lg:rounded-md bg-neutral-800/80 border border-neutral-700">
          {(
            [
              { id: 'color', label: 'Solid' },
              { id: 'gradient', label: 'Gradient' },
              { id: 'image', label: 'Image' },
            ] as const
          ).map((item) => {
            const active = background.mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onModeChange(item.id)}
                className={cn(
                  'py-2 lg:py-1.5 rounded-md lg:rounded-[5px] text-xs font-medium transition-colors',
                  active
                    ? 'bg-neutral-700 text-white'
                    : 'text-neutral-400 hover:text-neutral-100'
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Solid Color Controls */}
      {background.mode === 'color' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={background.color}
              onChange={(e) => onColorChange(e.target.value)}
              aria-label="Solid background color"
              className="w-9 h-9 lg:w-7 lg:h-7 rounded border border-neutral-600 bg-transparent cursor-pointer shrink-0"
            />
            <input
              type="text"
              value={background.color}
              onChange={(e) => onColorChange(e.target.value)}
              className="flex-1 px-3 py-2 lg:px-2.5 lg:py-1 rounded-lg lg:rounded-md bg-neutral-800/80 border border-neutral-700 text-sm lg:text-xs font-mono text-neutral-100 focus:outline-none focus:border-neutral-500"
            />
          </div>

          <div>
            <p className="text-[11px] text-neutral-500 mb-1.5">
              Presets
            </p>
            <div className="grid grid-cols-5 gap-2 lg:gap-1.5">
              {PRESET_COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => onColorChange(swatch)}
                  aria-label={`Set background ${swatch}`}
                  className={cn(
                    'w-full h-9 lg:h-7 rounded-md lg:rounded border transition-colors',
                    background.color.toLowerCase() === swatch.toLowerCase()
                      ? 'border-white ring-1 ring-white/50'
                      : 'border-neutral-700 hover:border-neutral-500'
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
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2.5 lg:gap-2 p-2.5 lg:p-2 rounded-lg lg:rounded-md bg-neutral-800/80 border border-neutral-700 cursor-pointer">
              <input
                type="color"
                value={background.gradient.startColor}
                onChange={(e) =>
                  onGradientChange({
                    startColor: e.target.value,
                    endColor: background.gradient.endColor,
                    angle: background.gradient.angle,
                  })
                }
                className="w-8 h-8 lg:w-6 lg:h-6 rounded border border-neutral-600 bg-transparent cursor-pointer shrink-0"
              />
              <div className="min-w-0">
                <span className="block text-[10px] text-neutral-400">Start</span>
                <span className="block text-xs font-mono text-neutral-100">
                  {background.gradient.startColor}
                </span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 lg:gap-2 p-2.5 lg:p-2 rounded-lg lg:rounded-md bg-neutral-800/80 border border-neutral-700 cursor-pointer">
              <input
                type="color"
                value={background.gradient.endColor}
                onChange={(e) =>
                  onGradientChange({
                    startColor: background.gradient.startColor,
                    endColor: e.target.value,
                    angle: background.gradient.angle,
                  })
                }
                className="w-8 h-8 lg:w-6 lg:h-6 rounded border border-neutral-600 bg-transparent cursor-pointer shrink-0"
              />
              <div className="min-w-0">
                <span className="block text-[10px] text-neutral-400">End</span>
                <span className="block text-xs font-mono text-neutral-100">
                  {background.gradient.endColor}
                </span>
              </div>
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-neutral-400">Angle</span>
              <span className="font-mono text-neutral-300">
                {background.gradient.angle}°
              </span>
            </div>
            <RangeSlider
              min={0}
              max={360}
              value={background.gradient.angle}
              defaultValue={155}
              onValueChange={(angle) =>
                onGradientChange({
                  ...background.gradient,
                  angle,
                })
              }
              className="w-full"
            />
          </div>

          <div>
            <p className="text-[11px] text-neutral-500 mb-1.5">
              Curated Gradients
            </p>
            <div className="grid grid-cols-3 gap-2">
              {GRADIENT_PRESETS.map((preset) => {
                const currentStops = background.gradient.stops ?? [];
                const presetStops = preset.gradient.stops ?? [];
                const stopsMatch =
                  currentStops.length === presetStops.length &&
                  currentStops.every(
                    (stop, idx) =>
                      stop.offset === presetStops[idx]?.offset &&
                      stop.color.toLowerCase() ===
                        presetStops[idx]?.color.toLowerCase()
                  );
                const isActive =
                  background.gradient.startColor.toLowerCase() ===
                    preset.gradient.startColor.toLowerCase() &&
                  background.gradient.endColor.toLowerCase() ===
                    preset.gradient.endColor.toLowerCase() &&
                  background.gradient.angle === preset.gradient.angle &&
                  stopsMatch;

                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => onGradientChange(preset.gradient)}
                    aria-label={preset.name}
                    title={preset.name}
                    className={cn(
                      'group relative h-14 lg:h-12 rounded-lg lg:rounded-md border overflow-hidden transition-transform hover:scale-[1.02]',
                      isActive
                        ? 'border-white ring-1 ring-white/50'
                        : 'border-white/10'
                    )}
                    style={{
                      backgroundColor: preset.gradient.endColor,
                      backgroundImage: buildGradientCssPreview(preset.gradient),
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Background Image Controls */}
      {background.mode === 'image' && (
        <div className="flex flex-col gap-3.5">
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
            className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-md bg-neutral-100 hover:bg-white text-neutral-950 text-xs font-medium transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>
              {background.image
                ? 'Replace Background Image'
                : 'Upload Background Image'}
            </span>
          </button>

          {background.image ? (
            <>
              <div className="grid grid-cols-2 gap-0.5 p-0.5 rounded-md bg-neutral-800/80 border border-neutral-700">
                {(['cover', 'contain'] as const).map((fitMode) => (
                  <button
                    key={fitMode}
                    type="button"
                    onClick={() => onUpdateBgImageConfig({ fitMode })}
                    className={cn(
                      'py-2 lg:py-1 rounded-[5px] text-xs font-medium transition-colors',
                      background.image?.fitMode === fitMode
                        ? 'bg-neutral-700 text-white'
                        : 'text-neutral-400 hover:text-neutral-100'
                    )}
                  >
                    {fitMode === 'cover' ? 'Fill Frame' : 'Fit Whole'}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2.5 pt-2 border-t border-neutral-800/80">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-neutral-400">Zoom Scale</span>
                    <span className="font-mono text-neutral-300">
                      {background.image.zoom.toFixed(2)}×
                    </span>
                  </div>
                  <RangeSlider
                    min={0.5}
                    max={3}
                    step={0.05}
                    value={background.image.zoom}
                    defaultValue={1}
                    onValueChange={(zoom) => onUpdateBgImageConfig({ zoom })}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-neutral-400">Pan X</span>
                    <span className="font-mono text-neutral-300">
                      {Math.round(background.image.panX)}px
                    </span>
                  </div>
                  <RangeSlider
                    min={-600}
                    max={600}
                    step={5}
                    value={background.image.panX}
                    defaultValue={0}
                    onValueChange={(panX) => onUpdateBgImageConfig({ panX })}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-neutral-400">Pan Y</span>
                    <span className="font-mono text-neutral-300">
                      {Math.round(background.image.panY)}px
                    </span>
                  </div>
                  <RangeSlider
                    min={-800}
                    max={800}
                    step={5}
                    value={background.image.panY}
                    defaultValue={0}
                    onValueChange={(panY) => onUpdateBgImageConfig({ panY })}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 lg:gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateBgImageConfig({ zoom: 1, panX: 0, panY: 0 })
                  }
                  aria-label="Reset view"
                  title="Reset view"
                  className="flex items-center justify-center py-2.5 lg:py-1.5 rounded-lg lg:rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onRemoveBgImage}
                  aria-label="Remove background image"
                  title="Remove background image"
                  className="flex items-center justify-center py-2.5 lg:py-1.5 rounded-lg lg:rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                </button>
              </div>

              {/* Background Image Gradient Overlay Controls */}
              <div className="flex flex-col gap-2.5 pt-3 border-t border-neutral-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-300">
                    Gradient Overlay
                  </span>
                  <button
                    id="bg-overlay-gradient-toggle"
                    type="button"
                    role="switch"
                    aria-checked={overlayGradient.enabled}
                    aria-label="Toggle Background Gradient Overlay"
                    onClick={() =>
                      updateOverlayGradient({ enabled: !overlayGradient.enabled })
                    }
                    className={cn(
                      'px-3 py-1.5 lg:px-2 lg:py-0.5 rounded-md lg:rounded text-xs lg:text-[11px] font-medium border transition-colors',
                      overlayGradient.enabled
                        ? 'bg-neutral-100 border-neutral-100 text-neutral-950'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    )}
                  >
                    {overlayGradient.enabled ? 'On' : 'Off'}
                  </button>
                </div>

                {overlayGradient.enabled && (
                  <div className="flex flex-col gap-2.5">
                    <div className="grid grid-cols-2 gap-1.5 lg:gap-1">
                      {OVERLAY_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => updateOverlayGradient(preset.patch)}
                          className="py-2 lg:py-1 px-2 rounded-md lg:rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs lg:text-[11px] font-medium text-neutral-300 transition-colors text-center"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-neutral-400">
                          Stops
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateOverlayGradient({
                              startColor: overlayGradient.endColor,
                              startAlpha: overlayGradient.endAlpha,
                              endColor: overlayGradient.startColor,
                              endAlpha: overlayGradient.startAlpha,
                            })
                          }
                          aria-label="Swap start and end stops"
                          title="Swap start and end stops"
                          className="p-2 lg:p-1 rounded-md lg:rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition-colors"
                        >
                          <ArrowUpDown className="w-3.5 h-3.5 lg:w-3 lg:h-3" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="p-2 rounded-md bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              aria-label="Overlay start color"
                              value={overlayGradient.startColor}
                              onChange={(e) =>
                                updateOverlayGradient({
                                  startColor: e.target.value,
                                })
                              }
                              className="w-5 h-5 rounded border border-neutral-700 bg-transparent cursor-pointer shrink-0"
                            />
                            <div className="min-w-0 flex-1 flex items-center justify-between">
                              <span className="text-[10px] text-neutral-400">
                                Start
                              </span>
                              <span className="text-[10px] font-mono text-neutral-300">
                                {overlayGradient.startAlpha}%
                              </span>
                            </div>
                          </div>
                          <RangeSlider
                            id="bg-overlay-start-alpha"
                            aria-label="Overlay start color alpha"
                            min={0}
                            max={100}
                            step={1}
                            value={overlayGradient.startAlpha}
                            defaultValue={DEFAULT_OVERLAY_GRADIENT.startAlpha}
                            onValueChange={(startAlpha) =>
                              updateOverlayGradient({ startAlpha })
                            }
                            className="w-full"
                          />
                        </div>

                        <div className="p-2 rounded-md bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              aria-label="Overlay end color"
                              value={overlayGradient.endColor}
                              onChange={(e) =>
                                updateOverlayGradient({ endColor: e.target.value })
                              }
                              className="w-5 h-5 rounded border border-neutral-700 bg-transparent cursor-pointer shrink-0"
                            />
                            <div className="min-w-0 flex-1 flex items-center justify-between">
                              <span className="text-[10px] text-neutral-400">
                                End
                              </span>
                              <span className="text-[10px] font-mono text-neutral-300">
                                {overlayGradient.endAlpha}%
                              </span>
                            </div>
                          </div>
                          <RangeSlider
                            id="bg-overlay-end-alpha"
                            aria-label="Overlay end color alpha"
                            min={0}
                            max={100}
                            step={1}
                            value={overlayGradient.endAlpha}
                            defaultValue={DEFAULT_OVERLAY_GRADIENT.endAlpha}
                            onValueChange={(endAlpha) =>
                              updateOverlayGradient({ endAlpha })
                            }
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <label
                          htmlFor="bg-overlay-opacity"
                          className="text-neutral-400"
                        >
                          Gradient Opacity
                        </label>
                        <span className="font-mono text-neutral-300">
                          {overlayGradient.opacity}%
                        </span>
                      </div>
                      <RangeSlider
                        id="bg-overlay-opacity"
                        aria-label="Background Gradient Opacity"
                        min={0}
                        max={100}
                        step={1}
                        value={overlayGradient.opacity}
                        defaultValue={DEFAULT_OVERLAY_GRADIENT.opacity}
                        onValueChange={(opacity) =>
                          updateOverlayGradient({ opacity })
                        }
                        className="w-full"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <label
                          htmlFor="bg-overlay-angle"
                          className="text-neutral-400"
                        >
                          Gradient Angle
                        </label>
                        <span className="font-mono text-neutral-300">
                          {overlayGradient.angle}°
                        </span>
                      </div>
                      <RangeSlider
                        id="bg-overlay-angle"
                        aria-label="Background Gradient Angle"
                        min={0}
                        max={360}
                        step={1}
                        value={overlayGradient.angle}
                        defaultValue={DEFAULT_OVERLAY_GRADIENT.angle}
                        onValueChange={(angle) =>
                          updateOverlayGradient({ angle })
                        }
                        className="w-full"
                      />
                      <div className="grid grid-cols-4 gap-1 mt-1">
                        {OVERLAY_ANGLE_PRESETS.map((preset) => (
                          <button
                            key={preset.angle}
                            type="button"
                            onClick={() =>
                              updateOverlayGradient({ angle: preset.angle })
                            }
                            className={cn(
                              'py-1 rounded text-[10px] font-medium border transition-colors',
                              overlayGradient.angle === preset.angle
                                ? 'bg-neutral-800 border-neutral-600 text-neutral-100'
                                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                            )}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <label
                          htmlFor="bg-overlay-coverage"
                          className="text-neutral-400"
                        >
                          Gradient Height
                        </label>
                        <span className="font-mono text-neutral-300">
                          {overlayGradient.coverage}%
                        </span>
                      </div>
                      <RangeSlider
                        id="bg-overlay-coverage"
                        aria-label="Background Gradient Height"
                        min={10}
                        max={100}
                        step={1}
                        value={overlayGradient.coverage}
                        defaultValue={DEFAULT_OVERLAY_GRADIENT.coverage}
                        onValueChange={(coverage) =>
                          updateOverlayGradient({ coverage })
                        }
                        className="w-full"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <label
                          htmlFor="bg-overlay-midpoint"
                          className="text-neutral-400"
                        >
                          Start / Midpoint
                        </label>
                        <span className="font-mono text-neutral-300">
                          {overlayGradient.midpoint}%
                        </span>
                      </div>
                      <RangeSlider
                        id="bg-overlay-midpoint"
                        aria-label="Background Gradient Midpoint"
                        min={5}
                        max={95}
                        step={1}
                        value={overlayGradient.midpoint}
                        defaultValue={DEFAULT_OVERLAY_GRADIENT.midpoint}
                        onValueChange={(midpoint) =>
                          updateOverlayGradient({ midpoint })
                        }
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="bg-overlay-blend-mode"
                        className="block text-xs text-neutral-400 mb-1"
                      >
                        Blend Mode
                      </label>
                      <select
                        id="bg-overlay-blend-mode"
                        value={overlayGradient.blendMode}
                        onChange={(e) =>
                          updateOverlayGradient({
                            blendMode: e.target.value as GradientBlendMode,
                          })
                        }
                        className="w-full px-3 py-2.5 lg:px-2.5 lg:py-1.5 rounded-lg lg:rounded-md bg-neutral-800/80 border border-neutral-700 text-sm lg:text-xs text-neutral-100 focus:outline-none focus:border-neutral-500"
                      >
                        {BLEND_MODES.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Background Image Tone Adjustments */}
              <div className="flex flex-col gap-2.5 pt-3 border-t border-neutral-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-300">
                    Adjustments
                  </span>
                  <button
                    id="bg-adjust-reset"
                    type="button"
                    disabled={!hasCustomAdjustments}
                    onClick={() =>
                      onUpdateBgImageConfig({
                        adjustments: { ...DEFAULT_BG_ADJUSTMENTS },
                      })
                    }
                    className="px-2 py-0.5 rounded text-[11px] font-medium border border-neutral-800 text-neutral-300 hover:bg-neutral-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    Reset
                  </button>
                </div>

                {ADJUSTMENT_CONTROLS.map((ctrl) => {
                  const val = adjustments[ctrl.key];
                  return (
                    <div key={ctrl.key}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <label htmlFor={ctrl.id} className="text-neutral-400">
                          {ctrl.label}
                        </label>
                        <span className="font-mono text-neutral-300">
                          {val > 0 ? `+${val}` : val}
                        </span>
                      </div>
                      <RangeSlider
                        id={ctrl.id}
                        aria-label={`Background ${ctrl.label}`}
                        min={-100}
                        max={100}
                        step={1}
                        value={val}
                        defaultValue={0}
                        onValueChange={(next) =>
                          updateAdjustment(ctrl.key, next)
                        }
                        className="w-full"
                      />
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-xs text-neutral-500 text-center py-4 px-2 rounded-md bg-neutral-900/50 border border-neutral-800/80">
              Upload an image to use as the canvas background.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
