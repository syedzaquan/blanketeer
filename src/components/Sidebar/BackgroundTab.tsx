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
  buildGradientCssPreview,
} from '../../utils/canvasHelpers';
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
    name: 'Rosewood',
    gradient: {
      startColor: '#f6c5bd',
      endColor: '#200714',
      angle: 180,
      stops: [
        { offset: 0, color: '#f6c5bd' },
        { offset: 0.18, color: '#f19692' },
        { offset: 0.38, color: '#e2546e' },
        { offset: 0.54, color: '#b82654' },
        { offset: 0.72, color: '#6c1439' },
        { offset: 0.88, color: '#360c20' },
        { offset: 1, color: '#200714' },
      ],
      hotspot: {
        cx: 0.82,
        cy: 0.16,
        rx: 0.65,
        ry: 0.45,
        stops: [
          { offset: 0, color: 'rgba(255, 240, 235, 0.95)' },
          { offset: 0.35, color: 'rgba(253, 206, 196, 0.6)' },
          { offset: 0.7, color: 'rgba(240, 140, 148, 0)' },
        ],
      },
    },
  },
  {
    name: 'Amber Dusk',
    gradient: {
      startColor: '#fde2c4',
      endColor: '#1a0603',
      angle: 180,
      stops: [
        { offset: 0, color: '#fde2c4' },
        { offset: 0.18, color: '#f7b279' },
        { offset: 0.38, color: '#ea6a37' },
        { offset: 0.55, color: '#b8371b' },
        { offset: 0.73, color: '#69190b' },
        { offset: 0.88, color: '#330b05' },
        { offset: 1, color: '#1a0603' },
      ],
      hotspot: {
        cx: 0.8,
        cy: 0.15,
        rx: 0.65,
        ry: 0.45,
        stops: [
          { offset: 0, color: 'rgba(255, 248, 237, 0.95)' },
          { offset: 0.35, color: 'rgba(254, 215, 170, 0.58)' },
          { offset: 0.7, color: 'rgba(234, 106, 55, 0)' },
        ],
      },
    },
  },
  {
    name: 'Iris Glow',
    gradient: {
      startColor: '#dcd7fe',
      endColor: '#09051c',
      angle: 180,
      stops: [
        { offset: 0, color: '#dcd7fe' },
        { offset: 0.18, color: '#b19ffc' },
        { offset: 0.38, color: '#7c5dfa' },
        { offset: 0.55, color: '#4e2ec8' },
        { offset: 0.73, color: '#291575' },
        { offset: 0.88, color: '#140a3d' },
        { offset: 1, color: '#09051c' },
      ],
      hotspot: {
        cx: 0.82,
        cy: 0.16,
        rx: 0.65,
        ry: 0.45,
        stops: [
          { offset: 0, color: 'rgba(245, 243, 255, 0.95)' },
          { offset: 0.35, color: 'rgba(216, 180, 254, 0.55)' },
          { offset: 0.7, color: 'rgba(124, 93, 250, 0)' },
        ],
      },
    },
  },
  {
    name: 'Ocean Mist',
    gradient: {
      startColor: '#ccf2f4',
      endColor: '#03101c',
      angle: 180,
      stops: [
        { offset: 0, color: '#ccf2f4' },
        { offset: 0.18, color: '#7fd6e2' },
        { offset: 0.38, color: '#2ea1c4' },
        { offset: 0.55, color: '#15678f' },
        { offset: 0.73, color: '#0b3957' },
        { offset: 0.88, color: '#061f33' },
        { offset: 1, color: '#03101c' },
      ],
      hotspot: {
        cx: 0.82,
        cy: 0.16,
        rx: 0.65,
        ry: 0.45,
        stops: [
          { offset: 0, color: 'rgba(240, 253, 250, 0.95)' },
          { offset: 0.35, color: 'rgba(165, 243, 252, 0.58)' },
          { offset: 0.7, color: 'rgba(46, 161, 196, 0)' },
        ],
      },
    },
  },
  {
    name: 'Sage Bloom',
    gradient: {
      startColor: '#d3f5e3',
      endColor: '#03120b',
      angle: 180,
      stops: [
        { offset: 0, color: '#d3f5e3' },
        { offset: 0.18, color: '#8ce0b5' },
        { offset: 0.38, color: '#37a978' },
        { offset: 0.55, color: '#19734f' },
        { offset: 0.73, color: '#0c422c' },
        { offset: 0.88, color: '#062417' },
        { offset: 1, color: '#03120b' },
      ],
      hotspot: {
        cx: 0.82,
        cy: 0.16,
        rx: 0.65,
        ry: 0.45,
        stops: [
          { offset: 0, color: 'rgba(240, 253, 244, 0.95)' },
          { offset: 0.35, color: 'rgba(167, 243, 208, 0.55)' },
          { offset: 0.7, color: 'rgba(55, 169, 120, 0)' },
        ],
      },
    },
  },
  {
    name: 'Obsidian',
    gradient: {
      startColor: '#e5e5e5',
      endColor: '#08080a',
      angle: 180,
      stops: [
        { offset: 0, color: '#e5e5e5' },
        { offset: 0.18, color: '#b8b8be' },
        { offset: 0.38, color: '#75757e' },
        { offset: 0.54, color: '#45454d' },
        { offset: 0.72, color: '#26262b' },
        { offset: 0.88, color: '#131316' },
        { offset: 1, color: '#08080a' },
      ],
      hotspot: {
        cx: 0.82,
        cy: 0.16,
        rx: 0.65,
        ry: 0.45,
        stops: [
          { offset: 0, color: 'rgba(255, 255, 255, 0.92)' },
          { offset: 0.35, color: 'rgba(212, 212, 216, 0.5)' },
          { offset: 0.7, color: 'rgba(117, 117, 126, 0)' },
        ],
      },
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
        <div className="grid grid-cols-3 gap-0.5 p-0.5 rounded-md bg-neutral-900 border border-neutral-800">
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
                  'py-1.5 rounded-[5px] text-xs font-medium transition-colors',
                  active
                    ? 'bg-neutral-800 text-neutral-100'
                    : 'text-neutral-500 hover:text-neutral-200'
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
              className="w-7 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer shrink-0"
            />
            <input
              type="text"
              value={background.color}
              onChange={(e) => onColorChange(e.target.value)}
              className="flex-1 px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-200 focus:outline-none focus:border-neutral-600"
            />
          </div>

          <div>
            <p className="text-[11px] text-neutral-500 mb-1.5">
              Presets
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {SOLID_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => onColorChange(swatch)}
                  aria-label={`Set background ${swatch}`}
                  className={cn(
                    'w-full h-7 rounded border transition-colors',
                    background.color.toLowerCase() === swatch.toLowerCase()
                      ? 'border-white ring-1 ring-white/50'
                      : 'border-neutral-800 hover:border-neutral-600'
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
            <label className="flex items-center gap-2 p-2 rounded-md bg-neutral-900 border border-neutral-800 cursor-pointer">
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
                className="w-6 h-6 rounded border border-neutral-700 bg-transparent cursor-pointer shrink-0"
              />
              <div className="min-w-0">
                <span className="block text-[10px] text-neutral-500">Start</span>
                <span className="block text-xs font-mono text-neutral-200">
                  {background.gradient.startColor}
                </span>
              </div>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-md bg-neutral-900 border border-neutral-800 cursor-pointer">
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
                className="w-6 h-6 rounded border border-neutral-700 bg-transparent cursor-pointer shrink-0"
              />
              <div className="min-w-0">
                <span className="block text-[10px] text-neutral-500">End</span>
                <span className="block text-xs font-mono text-neutral-200">
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
              className="w-full"
            />
          </div>

          <div>
            <p className="text-[11px] text-neutral-500 mb-1.5">
              Curated Gradients
            </p>
            <div className="grid grid-cols-3 gap-2">
              {GRADIENT_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => onGradientChange(preset.gradient)}
                  className="group relative h-12 rounded-md border border-white/10 overflow-hidden transition-transform hover:scale-[1.02]"
                  style={{
                    backgroundColor: preset.gradient.endColor,
                    backgroundImage: buildGradientCssPreview(preset.gradient),
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
              <div className="grid grid-cols-2 gap-0.5 p-0.5 rounded-md bg-neutral-900 border border-neutral-800">
                {(['cover', 'contain'] as const).map((fitMode) => (
                  <button
                    key={fitMode}
                    type="button"
                    onClick={() => onUpdateBgImageConfig({ fitMode })}
                    className={cn(
                      'py-1 rounded-[5px] text-xs font-medium transition-colors',
                      background.image?.fitMode === fitMode
                        ? 'bg-neutral-800 text-neutral-100'
                        : 'text-neutral-500 hover:text-neutral-200'
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
                  <input
                    type="range"
                    min={0.5}
                    max={3}
                    step={0.05}
                    value={background.image.zoom}
                    onChange={(e) =>
                      onUpdateBgImageConfig({ zoom: Number(e.target.value) })
                    }
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
                  <input
                    type="range"
                    min={-600}
                    max={600}
                    step={5}
                    value={background.image.panX}
                    onChange={(e) =>
                      onUpdateBgImageConfig({ panX: Number(e.target.value) })
                    }
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
                  <input
                    type="range"
                    min={-800}
                    max={800}
                    step={5}
                    value={background.image.panY}
                    onChange={(e) =>
                      onUpdateBgImageConfig({ panY: Number(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateBgImageConfig({ zoom: 1, panX: 0, panY: 0 })
                  }
                  className="flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-300 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset View</span>
                </button>
                <button
                  type="button"
                  onClick={onRemoveBgImage}
                  className="flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
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
                      'px-2 py-0.5 rounded text-[11px] font-medium border transition-colors',
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
                    <div className="grid grid-cols-2 gap-1">
                      {OVERLAY_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => updateOverlayGradient(preset.patch)}
                          className="py-1 px-2 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[11px] font-medium text-neutral-300 transition-colors text-center"
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
                          title="Swap start and end stops"
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 transition-colors"
                        >
                          <ArrowUpDown className="w-2.5 h-2.5" />
                          <span>Swap</span>
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
                          <input
                            id="bg-overlay-start-alpha"
                            aria-label="Overlay start color alpha"
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={overlayGradient.startAlpha}
                            onChange={(e) =>
                              updateOverlayGradient({
                                startAlpha: Number(e.target.value),
                              })
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
                          <input
                            id="bg-overlay-end-alpha"
                            aria-label="Overlay end color alpha"
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={overlayGradient.endAlpha}
                            onChange={(e) =>
                              updateOverlayGradient({
                                endAlpha: Number(e.target.value),
                              })
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
                      <input
                        id="bg-overlay-opacity"
                        aria-label="Background Gradient Opacity"
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={overlayGradient.opacity}
                        onChange={(e) =>
                          updateOverlayGradient({
                            opacity: Number(e.target.value),
                          })
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
                      <input
                        id="bg-overlay-angle"
                        aria-label="Background Gradient Angle"
                        type="range"
                        min={0}
                        max={360}
                        step={1}
                        value={overlayGradient.angle}
                        onChange={(e) =>
                          updateOverlayGradient({ angle: Number(e.target.value) })
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
                      <input
                        id="bg-overlay-coverage"
                        aria-label="Background Gradient Height"
                        type="range"
                        min={10}
                        max={100}
                        step={1}
                        value={overlayGradient.coverage}
                        onChange={(e) =>
                          updateOverlayGradient({
                            coverage: Number(e.target.value),
                          })
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
                      <input
                        id="bg-overlay-midpoint"
                        aria-label="Background Gradient Midpoint"
                        type="range"
                        min={5}
                        max={95}
                        step={1}
                        value={overlayGradient.midpoint}
                        onChange={(e) =>
                          updateOverlayGradient({
                            midpoint: Number(e.target.value),
                          })
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
                        className="w-full px-2.5 py-1.5 rounded-md bg-neutral-900 border border-neutral-800 text-xs text-neutral-100 focus:outline-none focus:border-neutral-600"
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
                      <input
                        id={ctrl.id}
                        aria-label={`Background ${ctrl.label}`}
                        type="range"
                        min={-100}
                        max={100}
                        step={1}
                        value={val}
                        onChange={(e) =>
                          updateAdjustment(ctrl.key, Number(e.target.value))
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
