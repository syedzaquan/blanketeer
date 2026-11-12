import * as fabric from 'fabric';
import type { T2DPipelineState, TWebGLUniformLocationMap } from 'fabric';
import type { BackgroundImageAdjustments } from '../types/editor';

export const DEFAULT_BG_ADJUSTMENTS: BackgroundImageAdjustments = {
  brightness: 0,
  contrast: 0,
  shadows: 0,
  highlights: 0,
  dehaze: 0,
  blackPoint: 0,
};

type ToneFilterProps = BackgroundImageAdjustments & Record<string, unknown>;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

const FRAGMENT_SOURCE = `
  precision highp float;
  uniform sampler2D uTexture;
  uniform float uBrightness;
  uniform float uContrast;
  uniform float uShadows;
  uniform float uHighlights;
  uniform float uDehaze;
  uniform float uBlackPoint;
  varying vec2 vTexCoord;

  void main() {
    vec4 tex = texture2D(uTexture, vTexCoord);
    vec3 c = tex.rgb;

    // 1. Black Point
    if (uBlackPoint > 0.0) {
      float floorVal = uBlackPoint * 0.35;
      c = max(vec3(0.0), (c - floorVal) / max(0.05, 1.0 - floorVal));
    } else if (uBlackPoint < 0.0) {
      float lift = (-uBlackPoint) * 0.25;
      c = mix(vec3(lift), vec3(1.0), c);
    }

    // 2. Shadows & Highlights (Rec.709 luminance weighted)
    float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
    if (uShadows != 0.0) {
      float sMask = pow(clamp(1.0 - lum, 0.0, 1.0), 2.2);
      c += uShadows * 0.42 * sMask * (vec3(0.25) + 0.75 * (vec3(1.0) - c));
      c = clamp(c, 0.0, 1.0);
    }

    lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
    if (uHighlights != 0.0) {
      float hMask = pow(clamp(lum, 0.0, 1.0), 2.0);
      c += uHighlights * 0.42 * hMask * (vec3(0.25) + 0.75 * c);
      c = clamp(c, 0.0, 1.0);
    }

    // 3. Dehaze (atmospheric veil removal / dreamy haze addition)
    if (uDehaze > 0.0) {
      float minChan = min(c.r, min(c.g, c.b));
      float transmission = clamp(1.0 - (uDehaze * 0.65) * minChan * (1.0 - minChan * 0.35), 0.32, 1.0);
      c = clamp((c - vec3(0.88) * (1.0 - transmission)) / transmission, 0.0, 1.0);
      float dehazeLum = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = clamp(mix(vec3(dehazeLum), c, 1.0 + uDehaze * 0.28), 0.0, 1.0);
    } else if (uDehaze < 0.0) {
      float hLum = dot(c, vec3(0.2126, 0.7152, 0.0722));
      float fogAmt = (-uDehaze) * 0.45 * (1.0 - hLum * 0.3);
      c = mix(c, vec3(0.78), clamp(fogAmt, 0.0, 0.7));
    }

    // 4. Contrast
    if (uContrast != 0.0) {
      float factor = (1.0 + uContrast * 0.85) / max(0.15, 1.0 - uContrast * 0.65);
      c = clamp((c - 0.5) * factor + 0.5, 0.0, 1.0);
    }

    // 5. Brightness
    if (uBrightness != 0.0) {
      c = clamp(c + uBrightness * 0.45, 0.0, 1.0);
    }

    gl_FragColor = vec4(clamp(c, 0.0, 1.0), tex.a);
  }
`;

/**
 * Unified GPU (WebGL) + 2D Canvas post-process filter for background images:
 * Brightness, Contrast, Shadows, Highlights, Dehaze, and Black Point.
 */
export class BackgroundToneFilter extends fabric.filters.BaseFilter<
  'BackgroundTone',
  ToneFilterProps
> {
  static type = 'BackgroundTone';
  static defaults: Record<string, unknown> = { ...DEFAULT_BG_ADJUSTMENTS };
  static uniformLocations = [
    'uBrightness',
    'uContrast',
    'uShadows',
    'uHighlights',
    'uDehaze',
    'uBlackPoint',
  ];

  declare brightness: number;
  declare contrast: number;
  declare shadows: number;
  declare highlights: number;
  declare dehaze: number;
  declare blackPoint: number;

  protected getFragmentSource(): string {
    return FRAGMENT_SOURCE;
  }

  isNeutralState(): boolean {
    return (
      this.brightness === 0 &&
      this.contrast === 0 &&
      this.shadows === 0 &&
      this.highlights === 0 &&
      this.dehaze === 0 &&
      this.blackPoint === 0
    );
  }

  sendUniformData(
    gl: WebGLRenderingContext,
    uniformLocations: TWebGLUniformLocationMap
  ): void {
    gl.uniform1f(uniformLocations.uBrightness, this.brightness / 100);
    gl.uniform1f(uniformLocations.uContrast, this.contrast / 100);
    gl.uniform1f(uniformLocations.uShadows, this.shadows / 100);
    gl.uniform1f(uniformLocations.uHighlights, this.highlights / 100);
    gl.uniform1f(uniformLocations.uDehaze, this.dehaze / 100);
    gl.uniform1f(uniformLocations.uBlackPoint, this.blackPoint / 100);
  }

  applyTo2d({ imageData: { data } }: T2DPipelineState): void {
    if (this.isNeutralState()) return;

    const br = this.brightness / 100;
    const ct = this.contrast / 100;
    const sh = this.shadows / 100;
    const hi = this.highlights / 100;
    const dh = this.dehaze / 100;
    const bp = this.blackPoint / 100;

    const cFactor =
      ct !== 0 ? (1 + ct * 0.85) / Math.max(0.15, 1 - ct * 0.65) : 1;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i] / 255;
      let g = data[i + 1] / 255;
      let b = data[i + 2] / 255;

      // 1. Black Point
      if (bp > 0) {
        const floorVal = bp * 0.35;
        const denom = Math.max(0.05, 1 - floorVal);
        r = r > floorVal ? (r - floorVal) / denom : 0;
        g = g > floorVal ? (g - floorVal) / denom : 0;
        b = b > floorVal ? (b - floorVal) / denom : 0;
      } else if (bp < 0) {
        const lift = -bp * 0.25;
        r = lift + (1 - lift) * r;
        g = lift + (1 - lift) * g;
        b = lift + (1 - lift) * b;
      }

      // 2. Shadows & Highlights
      if (sh !== 0) {
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const sMask = Math.pow(clamp01(1 - lum), 2.2);
        const sGain = sh * 0.42 * sMask;
        r = clamp01(r + sGain * (0.25 + 0.75 * (1 - r)));
        g = clamp01(g + sGain * (0.25 + 0.75 * (1 - g)));
        b = clamp01(b + sGain * (0.25 + 0.75 * (1 - b)));
      }

      if (hi !== 0) {
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const hMask = Math.pow(clamp01(lum), 2.0);
        const hGain = hi * 0.42 * hMask;
        r = clamp01(r + hGain * (0.25 + 0.75 * r));
        g = clamp01(g + hGain * (0.25 + 0.75 * g));
        b = clamp01(b + hGain * (0.25 + 0.75 * b));
      }

      // 3. Dehaze
      if (dh > 0) {
        const minChan = Math.min(r, g, b);
        const transmission = Math.max(
          0.32,
          Math.min(1, 1 - dh * 0.65 * minChan * (1 - minChan * 0.35))
        );
        const air = 0.88 * (1 - transmission);
        r = clamp01((r - air) / transmission);
        g = clamp01((g - air) / transmission);
        b = clamp01((b - air) / transmission);
        const dLum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const satGain = 1 + dh * 0.28;
        r = clamp01(dLum + (r - dLum) * satGain);
        g = clamp01(dLum + (g - dLum) * satGain);
        b = clamp01(dLum + (b - dLum) * satGain);
      } else if (dh < 0) {
        const hLum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const fogAmt = Math.min(0.7, Math.max(0, -dh * 0.45 * (1 - hLum * 0.3)));
        r = r * (1 - fogAmt) + 0.78 * fogAmt;
        g = g * (1 - fogAmt) + 0.78 * fogAmt;
        b = b * (1 - fogAmt) + 0.78 * fogAmt;
      }

      // 4. Contrast
      if (ct !== 0) {
        r = clamp01((r - 0.5) * cFactor + 0.5);
        g = clamp01((g - 0.5) * cFactor + 0.5);
        b = clamp01((b - 0.5) * cFactor + 0.5);
      }

      // 5. Brightness
      if (br !== 0) {
        const offset = br * 0.45;
        r = clamp01(r + offset);
        g = clamp01(g + offset);
        b = clamp01(b + offset);
      }

      data[i] = Math.round(r * 255);
      data[i + 1] = Math.round(g * 255);
      data[i + 2] = Math.round(b * 255);
    }
  }
}

fabric.classRegistry.setClass(BackgroundToneFilter);

export type AdjustmentQuality = 'preview' | 'full';

interface FabricImageInternal {
  _element: CanvasImageSource;
  _originalElement: CanvasImageSource;
  _filteredEl?: HTMLCanvasElement;
  _filterScalingX: number;
  _filterScalingY: number;
  cacheKey?: string;
}

interface AppliedToneState {
  key: string;
  quality: AdjustmentQuality;
  origEl: CanvasImageSource;
}

interface PreviewProxyCache {
  origEl: CanvasImageSource;
  origW: number;
  origH: number;
  pw: number;
  ph: number;
  srcCanvas: HTMLCanvasElement;
  filteredCanvas: HTMLCanvasElement;
  previewKey: string;
}

const PREVIEW_MAX_SIDE = 900;
const appliedToneCache = new WeakMap<fabric.FabricImage, AppliedToneState>();
const previewProxyCache = new WeakMap<fabric.FabricImage, PreviewProxyCache>();

function getSourceDimensions(el: CanvasImageSource): { width: number; height: number } {
  if (el instanceof HTMLImageElement) {
    return {
      width: el.naturalWidth || el.width || 0,
      height: el.naturalHeight || el.height || 0,
    };
  }
  if (
    el instanceof HTMLCanvasElement ||
    (typeof OffscreenCanvas !== 'undefined' && el instanceof OffscreenCanvas)
  ) {
    return { width: el.width, height: el.height };
  }
  if (el instanceof ImageBitmap) {
    return { width: el.width, height: el.height };
  }
  return { width: 0, height: 0 };
}

const fullProxyCache = new WeakMap<fabric.FabricImage, PreviewProxyCache>();

function getOrCreateProxy(
  bgImage: fabric.FabricImage,
  internal: FabricImageInternal,
  targetMaxSide: number,
  cacheMap: WeakMap<fabric.FabricImage, PreviewProxyCache>,
  smoothingQuality: ImageSmoothingQuality = 'medium'
): PreviewProxyCache | null {
  const origEl = internal._originalElement;
  const cached = cacheMap.get(bgImage);
  if (cached && cached.origEl === origEl) {
    return cached;
  }

  const { width: origW, height: origH } = getSourceDimensions(origEl);
  const maxSide = Math.max(origW, origH);
  if (maxSide <= targetMaxSide || origW <= 0 || origH <= 0) {
    return null;
  }

  const scale = targetMaxSide / maxSide;
  const pw = Math.max(1, Math.round(origW * scale));
  const ph = Math.max(1, Math.round(origH * scale));

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = pw;
  srcCanvas.height = ph;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) return null;
  srcCtx.imageSmoothingEnabled = true;
  srcCtx.imageSmoothingQuality = smoothingQuality;
  srcCtx.drawImage(origEl, 0, 0, pw, ph);

  const filteredCanvas = document.createElement('canvas');
  filteredCanvas.width = pw;
  filteredCanvas.height = ph;

  const entry: PreviewProxyCache = {
    origEl,
    origW,
    origH,
    pw,
    ph,
    srcCanvas,
    filteredCanvas,
    previewKey: `${internal.cacheKey || 'bg'}_proxy_${pw}x${ph}`,
  };
  cacheMap.set(bgImage, entry);
  return entry;
}

export function isNeutralAdjustments(
  adjustments?: BackgroundImageAdjustments
): boolean {
  if (!adjustments) return true;
  return (
    adjustments.brightness === 0 &&
    adjustments.contrast === 0 &&
    adjustments.shadows === 0 &&
    adjustments.highlights === 0 &&
    adjustments.dehaze === 0 &&
    adjustments.blackPoint === 0
  );
}

export function applyFilterListWithQuality(
  image: fabric.FabricImage,
  filters: fabric.filters.BaseFilter<string, Record<string, unknown>, Record<string, unknown>>[],
  cacheKey: string,
  quality: AdjustmentQuality = 'full'
): void {
  const internal = image as unknown as FabricImageInternal;
  const prev = appliedToneCache.get(image);

  if (
    prev &&
    prev.origEl === internal._originalElement &&
    prev.key === cacheKey &&
    (prev.quality === quality || prev.quality === 'full')
  ) {
    return;
  }

  if (filters.length === 0) {
    if (
      internal._element !== internal._originalElement &&
      internal._element !== internal._filteredEl
    ) {
      internal._element = internal._originalElement;
      internal._filterScalingX = 1;
      internal._filterScalingY = 1;
    }
    if (
      (image.filters && image.filters.length > 0) ||
      internal._element !== internal._originalElement
    ) {
      image.filters = [];
      image.applyFilters();
    }
    appliedToneCache.set(image, {
      key: cacheKey,
      quality: 'full',
      origEl: internal._originalElement,
    });
    return;
  }

  image.filters = filters;

  if (quality === 'preview') {
    const proxy = getOrCreateProxy(
      image,
      internal,
      PREVIEW_MAX_SIDE,
      previewProxyCache,
      'medium'
    );
    if (proxy) {
      fabric
        .getFilterBackend()
        .applyFilters(
          filters,
          proxy.srcCanvas,
          proxy.pw,
          proxy.ph,
          proxy.filteredCanvas,
          proxy.previewKey
        );
      internal._element = proxy.filteredCanvas;
      internal._filterScalingX = proxy.pw / proxy.origW;
      internal._filterScalingY = proxy.ph / proxy.origH;
      image.set('dirty', true);
      appliedToneCache.set(image, {
        key: cacheKey,
        quality: 'preview',
        origEl: internal._originalElement,
      });
      return;
    }
  }

  // Cap full-res filtering to WebGL textureSize so large photos aren't cropped to a square tile
  const maxTextureSide = Math.max(512, fabric.config.textureSize || 2048);
  const fullProxy = getOrCreateProxy(
    image,
    internal,
    maxTextureSide,
    fullProxyCache,
    'high'
  );
  if (fullProxy) {
    fabric
      .getFilterBackend()
      .applyFilters(
        filters,
        fullProxy.srcCanvas,
        fullProxy.pw,
        fullProxy.ph,
        fullProxy.filteredCanvas,
        fullProxy.previewKey
      );
    internal._element = fullProxy.filteredCanvas;
    internal._filterScalingX = fullProxy.pw / fullProxy.origW;
    internal._filterScalingY = fullProxy.ph / fullProxy.origH;
    image.set('dirty', true);
    appliedToneCache.set(image, {
      key: cacheKey,
      quality: 'full',
      origEl: internal._originalElement,
    });
    return;
  }

  if (
    internal._element !== internal._originalElement &&
    internal._element !== internal._filteredEl
  ) {
    internal._element = internal._filteredEl ?? internal._originalElement;
    internal._filterScalingX = 1;
    internal._filterScalingY = 1;
  }

  image.applyFilters();
  appliedToneCache.set(image, {
    key: cacheKey,
    quality: 'full',
    origEl: internal._originalElement,
  });
}

export function applyBackgroundImageAdjustments(
  bgImage: fabric.FabricImage,
  adjustments?: BackgroundImageAdjustments,
  quality: AdjustmentQuality = 'full'
): void {
  const merged: BackgroundImageAdjustments = {
    ...DEFAULT_BG_ADJUSTMENTS,
    ...adjustments,
  };

  const internal = bgImage as unknown as FabricImageInternal;
  const key = `${merged.brightness}|${merged.contrast}|${merged.shadows}|${merged.highlights}|${merged.dehaze}|${merged.blackPoint}`;
  const prev = appliedToneCache.get(bgImage);

  if (
    prev &&
    prev.origEl === internal._originalElement &&
    prev.key === key &&
    (prev.quality === quality || prev.quality === 'full')
  ) {
    return;
  }

  if (isNeutralAdjustments(merged)) {
    if (
      internal._element !== internal._originalElement &&
      internal._element !== internal._filteredEl
    ) {
      internal._element = internal._originalElement;
      internal._filterScalingX = 1;
      internal._filterScalingY = 1;
    }
    if (
      (bgImage.filters && bgImage.filters.length > 0) ||
      internal._element !== internal._originalElement
    ) {
      bgImage.filters = [];
      bgImage.applyFilters();
    }
    appliedToneCache.set(bgImage, {
      key,
      quality: 'full',
      origEl: internal._originalElement,
    });
    return;
  }

  let toneFilter = bgImage.filters?.find(
    (f): f is BackgroundToneFilter => f instanceof BackgroundToneFilter
  );

  if (toneFilter) {
    toneFilter.brightness = merged.brightness;
    toneFilter.contrast = merged.contrast;
    toneFilter.shadows = merged.shadows;
    toneFilter.highlights = merged.highlights;
    toneFilter.dehaze = merged.dehaze;
    toneFilter.blackPoint = merged.blackPoint;
  } else {
    toneFilter = new BackgroundToneFilter({
      brightness: merged.brightness,
      contrast: merged.contrast,
      shadows: merged.shadows,
      highlights: merged.highlights,
      dehaze: merged.dehaze,
      blackPoint: merged.blackPoint,
    });
    bgImage.filters = [toneFilter];
  }

  if (quality === 'preview') {
    const proxy = getOrCreateProxy(
      bgImage,
      internal,
      PREVIEW_MAX_SIDE,
      previewProxyCache,
      'medium'
    );
    if (proxy) {
      fabric
        .getFilterBackend()
        .applyFilters(
          [toneFilter],
          proxy.srcCanvas,
          proxy.pw,
          proxy.ph,
          proxy.filteredCanvas,
          proxy.previewKey
        );
      internal._element = proxy.filteredCanvas;
      internal._filterScalingX = proxy.pw / proxy.origW;
      internal._filterScalingY = proxy.ph / proxy.origH;
      bgImage.set('dirty', true);
      appliedToneCache.set(bgImage, {
        key,
        quality: 'preview',
        origEl: internal._originalElement,
      });
      return;
    }
  }

  if (
    internal._element !== internal._originalElement &&
    internal._element !== internal._filteredEl
  ) {
    internal._element = internal._filteredEl ?? internal._originalElement;
    internal._filterScalingX = 1;
    internal._filterScalingY = 1;
  }

  bgImage.applyFilters();
  appliedToneCache.set(bgImage, {
    key,
    quality: 'full',
    origEl: internal._originalElement,
  });
}
