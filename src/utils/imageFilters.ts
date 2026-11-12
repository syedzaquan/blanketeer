import * as fabric from 'fabric';
import type { ImageFilterConfig, ImageFilterPreset } from '../types/editor';
import {
  BackgroundToneFilter,
  applyFilterListWithQuality,
  type AdjustmentQuality,
} from './backgroundFilters';

export const DEFAULT_IMAGE_FILTER: ImageFilterConfig = {
  preset: 'none',
  intensity: 100,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  blur: 0,
  shadows: 0,
  highlights: 0,
  dehaze: 0,
  blackPoint: 0,
};

interface PresetDefinition {
  id: ImageFilterPreset;
  label: string;
  swatchStyle: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  warmth?: number;
  shadows?: number;
  highlights?: number;
  dehaze?: number;
  blackPoint?: number;
  sepiaAmount?: number;
}

export const IMAGE_FILTER_PRESETS: PresetDefinition[] = [
  {
    id: 'none',
    label: 'Original',
    swatchStyle: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 50%, #6366f1 100%)',
  },
  {
    id: 'bw',
    label: 'B&W',
    swatchStyle: 'linear-gradient(135deg, #f5f5f5 0%, #737373 50%, #171717 100%)',
    saturation: -1,
    contrast: 0.14,
    shadows: 0.06,
  },
  {
    id: 'noir',
    label: 'Noir',
    swatchStyle: 'linear-gradient(135deg, #e5e5e5 0%, #262626 55%, #050505 100%)',
    saturation: -1,
    contrast: 0.36,
    blackPoint: 0.25,
    highlights: 0.1,
    shadows: -0.14,
  },
  {
    id: 'vivid',
    label: 'Vivid',
    swatchStyle: 'linear-gradient(135deg, #fb7185 0%, #f59e0b 50%, #10b981 100%)',
    saturation: 0.35,
    contrast: 0.16,
    dehaze: 0.15,
  },
  {
    id: 'warm',
    label: 'Warm',
    swatchStyle: 'linear-gradient(135deg, #fde68a 0%, #f97316 55%, #b45309 100%)',
    warmth: 0.38,
    saturation: 0.12,
    highlights: 0.08,
    brightness: 0.04,
  },
  {
    id: 'cool',
    label: 'Cool',
    swatchStyle: 'linear-gradient(135deg, #bae6fd 0%, #38bdf8 55%, #1d4ed8 100%)',
    warmth: -0.38,
    contrast: 0.08,
    highlights: 0.05,
  },
  {
    id: 'fade',
    label: 'Film',
    swatchStyle: 'linear-gradient(135deg, #e7e5e4 0%, #a8a29e 55%, #57534e 100%)',
    blackPoint: -0.35,
    contrast: -0.1,
    saturation: -0.18,
    warmth: 0.12,
  },
  {
    id: 'sepia',
    label: 'Sepia',
    swatchStyle: 'linear-gradient(135deg, #fef3c7 0%, #b45309 55%, #451a03 100%)',
    sepiaAmount: 0.85,
    contrast: 0.1,
    blackPoint: -0.08,
  },
];

const clampRange = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

export function normalizeImageFilterConfig(
  config?: Partial<ImageFilterConfig>
): ImageFilterConfig {
  return {
    ...DEFAULT_IMAGE_FILTER,
    ...config,
    intensity: clampRange(config?.intensity ?? DEFAULT_IMAGE_FILTER.intensity, 0, 100),
    brightness: clampRange(config?.brightness ?? 0, -1, 1),
    contrast: clampRange(config?.contrast ?? 0, -1, 1),
    saturation: clampRange(config?.saturation ?? 0, -1, 1),
    warmth: clampRange(config?.warmth ?? 0, -1, 1),
    blur: clampRange(config?.blur ?? 0, 0, 1),
    shadows: clampRange(config?.shadows ?? 0, -1, 1),
    highlights: clampRange(config?.highlights ?? 0, -1, 1),
    dehaze: clampRange(config?.dehaze ?? 0, -1, 1),
    blackPoint: clampRange(config?.blackPoint ?? 0, -1, 1),
  };
}

export function isNeutralImageFilter(config?: Partial<ImageFilterConfig>): boolean {
  const c = normalizeImageFilterConfig(config);
  return (
    (c.preset === 'none' || c.intensity === 0) &&
    c.brightness === 0 &&
    c.contrast === 0 &&
    c.saturation === 0 &&
    c.warmth === 0 &&
    c.blur === 0 &&
    c.shadows === 0 &&
    c.highlights === 0 &&
    c.dehaze === 0 &&
    c.blackPoint === 0
  );
}

function createWarmthColorMatrix(warmth: number): number[] {
  const w = clampRange(warmth, -1, 1);
  // Warm shifts R up & B down slightly; Cool shifts B up & R down.
  const rBoost = w > 0 ? 1 + w * 0.24 : 1 + w * 0.14;
  const gBoost = w > 0 ? 1 + w * 0.05 : 1 - w * 0.02;
  const bBoost = w > 0 ? 1 - w * 0.2 : 1 - w * 0.24;
  return [
    rBoost, 0, 0, 0, w * 0.04,
    0, gBoost, 0, 0, 0,
    0, 0, bBoost, 0, -w * 0.04,
    0, 0, 0, 1, 0,
  ];
}

function createSepiaBlendMatrix(amount: number): number[] {
  const t = clampRange(amount, 0, 1);
  const inv = 1 - t;
  return [
    inv + t * 0.393, t * 0.769, t * 0.189, 0, 0,
    t * 0.349, inv + t * 0.686, t * 0.168, 0, 0,
    t * 0.272, t * 0.534, inv + t * 0.131, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

type AnyBaseFilter = fabric.filters.BaseFilter<
  string,
  Record<string, unknown>,
  Record<string, unknown>
>;

export function applyStoryImageFilters(
  image: fabric.FabricImage,
  config?: Partial<ImageFilterConfig>,
  quality: AdjustmentQuality = 'full'
): void {
  const merged = normalizeImageFilterConfig(config);
  const presetDef =
    IMAGE_FILTER_PRESETS.find((p) => p.id === merged.preset) ??
    IMAGE_FILTER_PRESETS[0];
  const strength = merged.preset === 'none' ? 0 : merged.intensity / 100;

  const brightness = clampRange(
    merged.brightness + (presetDef.brightness ?? 0) * strength,
    -1,
    1
  );
  const contrast = clampRange(
    merged.contrast + (presetDef.contrast ?? 0) * strength,
    -1,
    1
  );
  const saturation = clampRange(
    merged.saturation + (presetDef.saturation ?? 0) * strength,
    -1,
    1
  );
  const warmth = clampRange(
    merged.warmth + (presetDef.warmth ?? 0) * strength,
    -1,
    1
  );
  const shadows = clampRange(
    merged.shadows + (presetDef.shadows ?? 0) * strength,
    -1,
    1
  );
  const highlights = clampRange(
    merged.highlights + (presetDef.highlights ?? 0) * strength,
    -1,
    1
  );
  const dehaze = clampRange(
    merged.dehaze + (presetDef.dehaze ?? 0) * strength,
    -1,
    1
  );
  const blackPoint = clampRange(
    merged.blackPoint + (presetDef.blackPoint ?? 0) * strength,
    -1,
    1
  );
  const sepiaAmount = clampRange((presetDef.sepiaAmount ?? 0) * strength, 0, 1);
  const blur = clampRange(merged.blur, 0, 1);

  const cacheKey = [
    merged.preset,
    merged.intensity,
    brightness.toFixed(3),
    contrast.toFixed(3),
    saturation.toFixed(3),
    warmth.toFixed(3),
    blur.toFixed(3),
    shadows.toFixed(3),
    highlights.toFixed(3),
    dehaze.toFixed(3),
    blackPoint.toFixed(3),
    sepiaAmount.toFixed(3),
  ].join('|');

  const filters: AnyBaseFilter[] = [];

  if (
    Math.abs(brightness) > 0.004 ||
    Math.abs(contrast) > 0.004 ||
    Math.abs(shadows) > 0.004 ||
    Math.abs(highlights) > 0.004 ||
    Math.abs(dehaze) > 0.004 ||
    Math.abs(blackPoint) > 0.004
  ) {
    filters.push(
      new BackgroundToneFilter({
        brightness: brightness * 100,
        contrast: contrast * 100,
        shadows: shadows * 100,
        highlights: highlights * 100,
        dehaze: dehaze * 100,
        blackPoint: blackPoint * 100,
      }) as unknown as AnyBaseFilter
    );
  }

  if (Math.abs(saturation) > 0.004) {
    filters.push(
      new fabric.filters.Saturation({ saturation }) as unknown as AnyBaseFilter
    );
  }

  if (Math.abs(warmth) > 0.004) {
    filters.push(
      new fabric.filters.ColorMatrix({
        matrix: createWarmthColorMatrix(warmth),
      }) as unknown as AnyBaseFilter
    );
  }

  if (sepiaAmount > 0.004) {
    filters.push(
      new fabric.filters.ColorMatrix({
        matrix: createSepiaBlendMatrix(sepiaAmount),
      }) as unknown as AnyBaseFilter
    );
  }

  if (blur > 0.004) {
    filters.push(
      new fabric.filters.Blur({ blur: blur * 0.45 }) as unknown as AnyBaseFilter
    );
  }

  applyFilterListWithQuality(image, filters, cacheKey, quality);
}

