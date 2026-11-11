import frauncesItalicUrl from '../assets/fonts/fraunces/Fraunces-Italic.ttf?url';
import frauncesRomanUrl from '../assets/fonts/fraunces/Fraunces-Roman.ttf?url';

export interface FrauncesAxisSettings {
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  fontOpsz: number;
  fontSoft: number;
  fontWonk: number;
}

export interface FrauncesCharBox {
  left: number;
  width: number;
  kernedWidth: number;
  deltaY?: number;
}

export interface FrauncesRenderLine {
  text: string;
  chars: string[];
  lineStartX: number;
  baselineY: number;
  charBounds?: FrauncesCharBox[];
  isJustified: boolean;
}

export interface FrauncesBitmapRequest {
  renderKey: string;
  svgWidth: number;
  svgHeight: number;
  renderScale: number;
  fill: string;
  fontSize: number;
  charSpacingPx: number;
  axes: FrauncesAxisSettings;
  lines: FrauncesRenderLine[];
  onReady: () => void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const XML_NS = 'http://www.w3.org/XML/1998/namespace';
const MEASURE_FONT_FAMILY = 'FrauncesSvgMeasure';
const EXPORT_FONT_FAMILY = 'ExportFraunces';
const DEFAULT_MEASURE_FONT_SIZE = 400;
const MAX_METRIC_STYLE_BUCKETS = 64;
const MAX_BITMAP_CACHE_ENTRIES = 32;

let romanBase64: string | null = null;
let italicBase64: string | null = null;
let fontDataLoadPromise: Promise<boolean> | null = null;
const fontReadyListeners = new Set<() => void>();

let measureSvgEl: SVGSVGElement | null = null;
let measureTextEl: SVGTextElement | null = null;

// Axis-keyed width cache so varying opsz/SOFT/WONK never collides with Fabric's default font cache.
const metricCache = new Map<string, Map<string, number>>();

interface BitmapCacheEntry {
  status: 'pending' | 'ready';
  img?: HTMLImageElement;
  callbacks: Set<() => void>;
}

const bitmapCache = new Map<string, BitmapCacheEntry>();
const pendingDecodePromises = new Set<Promise<void>>();

export function clampFrauncesAxes(input: Partial<FrauncesAxisSettings>): FrauncesAxisSettings {
  const fontWeight = Math.min(900, Math.max(100, Math.round(input.fontWeight ?? 600)));
  const fontStyle: 'normal' | 'italic' = input.fontStyle === 'italic' ? 'italic' : 'normal';
  const fontOpsz = Math.min(144, Math.max(9, Math.round(input.fontOpsz ?? 72)));
  const fontSoft = Math.min(100, Math.max(0, Math.round(input.fontSoft ?? 100)));
  const rawWonk = input.fontWonk ?? 0;
  const fontWonk = Math.min(1, Math.max(0, Number(rawWonk.toFixed(2))));
  return { fontWeight, fontStyle, fontOpsz, fontSoft, fontWonk };
}

export function buildFrauncesVariationSettings(axes: FrauncesAxisSettings): string {
  const normalized = clampFrauncesAxes(axes);
  return `'opsz' ${normalized.fontOpsz}, 'wght' ${normalized.fontWeight}, 'SOFT' ${normalized.fontSoft}, 'WONK' ${normalized.fontWonk}`;
}

export function isFrauncesFamily(fontFamily: string | undefined): boolean {
  if (!fontFamily) return false;
  return fontFamily.replace(/['"]/g, '').trim().toLowerCase() === 'fraunces';
}

export function isFrauncesFontDataReady(): boolean {
  return romanBase64 !== null && italicBase64 !== null;
}

export function onFrauncesFontDataReady(listener: () => void): () => void {
  if (isFrauncesFontDataReady()) {
    listener();
    return () => {};
  }
  fontReadyListeners.add(listener);
  return () => {
    fontReadyListeners.delete(listener);
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

async function registerMeasureFontFace(
  buffer: ArrayBuffer,
  style: 'normal' | 'italic'
): Promise<void> {
  if (typeof document === 'undefined' || typeof FontFace === 'undefined') return;
  try {
    const face = new FontFace(MEASURE_FONT_FAMILY, buffer, {
      weight: '100 900',
      style,
    });
    const loaded = await face.load();
    document.fonts.add(loaded);
  } catch {
    // Fallback to global 'Fraunces' CSS @font-face if local FontFace fails
  }
}

export function ensureFrauncesFontData(): Promise<boolean> {
  if (isFrauncesFontDataReady()) {
    return Promise.resolve(true);
  }
  if (fontDataLoadPromise) {
    return fontDataLoadPromise;
  }

  fontDataLoadPromise = (async () => {
    try {
      const [romanRes, italicRes] = await Promise.all([
        fetch(frauncesRomanUrl),
        fetch(frauncesItalicUrl),
      ]);
      if (!romanRes.ok || !italicRes.ok) {
        return false;
      }

      const [romanBuf, italicBuf] = await Promise.all([
        romanRes.arrayBuffer(),
        italicRes.arrayBuffer(),
      ]);

      // Register FontFace instances before flipping ready flags so DOM/SVG measurement immediately uses them.
      await Promise.all([
        registerMeasureFontFace(romanBuf.slice(0), 'normal'),
        registerMeasureFontFace(italicBuf.slice(0), 'italic'),
      ]);

      romanBase64 = arrayBufferToBase64(romanBuf);
      italicBase64 = arrayBufferToBase64(italicBuf);

      metricCache.clear();
      fontReadyListeners.forEach((cb) => cb());
      fontReadyListeners.clear();
      return true;
    } catch {
      fontDataLoadPromise = null;
      return false;
    }
  })();

  return fontDataLoadPromise;
}

function getOrCreateMeasureTextElement(): SVGTextElement | null {
  if (typeof document === 'undefined') return null;
  if (measureTextEl && measureSvgEl?.isConnected) {
    return measureTextEl;
  }

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute(
    'style',
    'position:fixed;left:-99999px;top:-99999px;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none;'
  );
  svg.setAttribute('aria-hidden', 'true');

  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttributeNS(XML_NS, 'space', 'preserve');
  text.setAttribute('x', '0');
  text.setAttribute('y', '0');
  text.setAttribute('font-size', String(DEFAULT_MEASURE_FONT_SIZE));
  text.style.fontOpticalSizing = 'none';

  svg.appendChild(text);
  (document.body || document.documentElement).appendChild(svg);

  measureSvgEl = svg;
  measureTextEl = text;
  return text;
}

function getMetricStyleBucket(
  axes: FrauncesAxisSettings,
  measureFontSize: number
): Map<string, number> {
  const ready = isFrauncesFontDataReady() ? '1' : '0';
  const key = `${ready}|${measureFontSize}|${axes.fontStyle}|${axes.fontWeight}|${axes.fontOpsz}|${axes.fontSoft}|${axes.fontWonk}`;
  const existing = metricCache.get(key);
  if (existing) {
    metricCache.delete(key);
    metricCache.set(key, existing);
    return existing;
  }
  const bucket = new Map<string, number>();
  metricCache.set(key, bucket);
  if (metricCache.size > MAX_METRIC_STYLE_BUCKETS) {
    const oldestKey = metricCache.keys().next().value;
    if (oldestKey !== undefined) {
      metricCache.delete(oldestKey);
    }
  }
  return bucket;
}

/**
 * Synchronously measures glyph/pair width in SVG space using exact 4-axis
 * font-variation-settings so Fabric's word wrap, caret placement, and IG pills align.
 */
export function measureFrauncesGlyphWidth(
  glyphText: string,
  axesInput: Partial<FrauncesAxisSettings>,
  measureFontSize: number = DEFAULT_MEASURE_FONT_SIZE
): number {
  if (!glyphText) return 0;
  const axes = clampFrauncesAxes(axesInput);
  const bucket = getMetricStyleBucket(axes, measureFontSize);
  const cached = bucket.get(glyphText);
  if (cached !== undefined) {
    return cached;
  }

  const textEl = getOrCreateMeasureTextElement();
  if (!textEl) {
    return glyphText.length * measureFontSize * 0.5;
  }

  textEl.setAttribute(
    'font-family',
    isFrauncesFontDataReady()
      ? `'${MEASURE_FONT_FAMILY}', 'Fraunces', serif`
      : "'Fraunces', serif"
  );
  textEl.setAttribute('font-size', String(measureFontSize));
  textEl.setAttribute('font-weight', String(axes.fontWeight));
  textEl.setAttribute('font-style', axes.fontStyle);
  textEl.style.fontOpticalSizing = 'none';
  textEl.style.fontVariationSettings = buildFrauncesVariationSettings(axes);
  textEl.textContent = glyphText;

  let width = textEl.getComputedTextLength();
  if (!Number.isFinite(width) || (width === 0 && glyphText.length > 0)) {
    width = glyphText.length * (measureFontSize * 0.25);
  }
  bucket.set(glyphText, width);
  return width;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeXmlAttr(value: string): string {
  return escapeXml(value).replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function buildJustifiedLineElements(
  line: FrauncesRenderLine,
  lineStyle: string,
  fillAttr: string
): string {
  const { chars, charBounds, lineStartX, baselineY } = line;
  if (!charBounds || chars.length === 0) {
    return `<text xml:space="preserve" x="${lineStartX.toFixed(2)}" y="${baselineY.toFixed(2)}" fill="${fillAttr}" style="${lineStyle}">${escapeXml(line.text)}</text>`;
  }

  // Group non-space characters into contiguous runs placed at Fabric's justified X offsets.
  const runs: string[] = [];
  let i = 0;
  while (i < chars.length) {
    if (chars[i].trim().length === 0) {
      i += 1;
      continue;
    }
    const startIdx = i;
    let word = '';
    while (i < chars.length && chars[i].trim().length > 0) {
      word += chars[i];
      i += 1;
    }
    const x = lineStartX + (charBounds[startIdx]?.left ?? 0);
    runs.push(
      `<text xml:space="preserve" x="${x.toFixed(2)}" y="${baselineY.toFixed(2)}" fill="${fillAttr}" style="${lineStyle}">${escapeXml(word)}</text>`
    );
  }
  return runs.join('');
}

function buildFrauncesSvgMarkup(req: FrauncesBitmapRequest): string | null {
  const axes = clampFrauncesAxes(req.axes);
  const b64 = axes.fontStyle === 'italic' ? italicBase64 : romanBase64;
  if (!b64) return null;

  const fontFace = `@font-face{font-family:${EXPORT_FONT_FAMILY};src:url(data:font/ttf;base64,${b64}) format('truetype');font-style:${axes.fontStyle};font-weight:100 900;}`;
  const variationCss = buildFrauncesVariationSettings(axes);
  const letterSpacingRule =
    Math.abs(req.charSpacingPx) > 0.001
      ? `letter-spacing:${req.charSpacingPx.toFixed(3)}px;`
      : '';
  const lineStyle = `font-family:'${EXPORT_FONT_FAMILY}',serif;font-size:${req.fontSize}px;font-weight:${axes.fontWeight};font-style:${axes.fontStyle};font-optical-sizing:none;font-variation-settings:${variationCss};${letterSpacingRule}`;
  const fillAttr = escapeXmlAttr(req.fill);

  const lineNodes = req.lines
    .map((line) => {
      if (!line.text) return '';
      if (line.isJustified) {
        return buildJustifiedLineElements(line, lineStyle, fillAttr);
      }
      return `<text xml:space="preserve" x="${line.lineStartX.toFixed(2)}" y="${line.baselineY.toFixed(2)}" fill="${fillAttr}" style="${lineStyle}">${escapeXml(line.text)}</text>`;
    })
    .join('');

  const outW = Math.max(1, Math.round(req.svgWidth * req.renderScale));
  const outH = Math.max(1, Math.round(req.svgHeight * req.renderScale));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}" viewBox="0 0 ${req.svgWidth.toFixed(2)} ${req.svgHeight.toFixed(2)}"><style>${fontFace} text { font-optical-sizing: none; }</style>${lineNodes}</svg>`;
}

function loadSvgImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      if (typeof img.decode === 'function') {
        try {
          await img.decode();
        } catch {
          // Some browsers throw on SVG decode() even after onload succeeds cleanly.
        }
      }
      resolve(img);
    };
    img.onerror = () => reject(new Error('Failed to load Fraunces SVG bitmap'));
    img.src = src;
  });
}

export function getOrRequestFrauncesBitmap(
  req: FrauncesBitmapRequest
): HTMLImageElement | null {
  const existing = bitmapCache.get(req.renderKey);
  if (existing) {
    bitmapCache.delete(req.renderKey);
    bitmapCache.set(req.renderKey, existing);
    if (existing.status === 'ready' && existing.img) {
      return existing.img;
    }
    existing.callbacks.add(req.onReady);
    return null;
  }

  if (!isFrauncesFontDataReady()) {
    void ensureFrauncesFontData();
    return null;
  }

  const svg = buildFrauncesSvgMarkup(req);
  if (!svg) return null;

  const entry: BitmapCacheEntry = {
    status: 'pending',
    callbacks: new Set([req.onReady]),
  };
  bitmapCache.set(req.renderKey, entry);

  if (bitmapCache.size > MAX_BITMAP_CACHE_ENTRIES) {
    const oldestKey = bitmapCache.keys().next().value;
    if (oldestKey !== undefined && oldestKey !== req.renderKey) {
      bitmapCache.delete(oldestKey);
    }
  }

  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  let trackedPromise: Promise<void> | null = null;
  const decodePromise = (async () => {
    try {
      const img = await loadSvgImage(svgDataUrl);
      entry.status = 'ready';
      entry.img = img;
      const cbs = Array.from(entry.callbacks);
      entry.callbacks.clear();
      cbs.forEach((cb) => cb());
    } catch {
      bitmapCache.delete(req.renderKey);
    } finally {
      if (trackedPromise) {
        pendingDecodePromises.delete(trackedPromise);
      }
    }
  })();

  trackedPromise = decodePromise;
  pendingDecodePromises.add(decodePromise);
  return null;
}

export function hasPendingFrauncesDecodes(): boolean {
  return pendingDecodePromises.size > 0;
}

export async function waitForPendingFrauncesDecodes(): Promise<void> {
  if (!isFrauncesFontDataReady()) {
    await ensureFrauncesFontData();
  }
  while (pendingDecodePromises.size > 0) {
    await Promise.allSettled(Array.from(pendingDecodePromises));
  }
}
