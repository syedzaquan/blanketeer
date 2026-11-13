import * as fabric from 'fabric';
import type {
  BackgroundImageConfig,
  BackgroundOverlayGradient,
  BasicShapeKind,
  GradientConfig,
  ImageFilterConfig,
  LayerItem,
  SelectedObjectState,
  TemplateSlotSummary,
} from '../types/editor';
import type { ImageWithCutoutMeta } from './imageCutouts';
import { normalizeImageFilterConfig } from './imageFilters';
import { StoryTextbox } from './storyTextbox';
import { TemplateSlotRect } from './templateSlot';

export const CUSTOM_SERIALIZED_PROPS = [
  'editorId',
  'editorName',
  'fontOpsz',
  'fontSoft',
  'fontWonk',
  'bgStyle',
  'textBgColor',
  'pillRadius',
  'pillPaddingX',
  'pillPaddingY',
  'placeholder',
  'cutoutShape',
  'cutoutRadius',
  'aspectLocked',
  'imageStrokeColor',
  'imageStrokeWidth',
  'imageStrokeStyle',
  'imageShadowEnabled',
  'imageShadowColor',
  'imageShadowOpacity',
  'imageShadowBlur',
  'imageShadowOffsetX',
  'imageShadowOffsetY',
  'imageFilter',
  'isTemplateSlot',
  'slotIndex',
  'slotCornerPercent',
  'shapeKind',
  'shapeCornerRadius',
  'locked',
];

export interface FabricObjectWithMeta extends fabric.FabricObject {
  editorId?: string;
  editorName?: string;
  locked?: boolean;
}

export function createEditorId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function ensureObjectMeta(obj: fabric.FabricObject): FabricObjectWithMeta {
  const meta = obj as FabricObjectWithMeta;
  if (!meta.editorId) {
    meta.editorId = createEditorId();
  }
  if (!meta.editorName) {
    if (obj instanceof StoryTextbox || obj instanceof fabric.Textbox) {
      meta.editorName = 'Text Layer';
    } else if (obj instanceof fabric.FabricImage) {
      meta.editorName = 'Image Layer';
    } else {
      meta.editorName = 'Layer';
    }
  }
  if (typeof meta.locked !== 'boolean') {
    meta.locked = false;
  }
  return meta;
}

export const PRESET_COLOR_SWATCHES = [
  '#FE5925',
  '#2A9F47',
  '#F02D3B',
  '#F6BE01',
  '#6DB4E2',
  '#F79A00',
  '#FC848B',
  '#FFFFFF',
  '#D5D5D5',
  '#000000',
] as const;

export const DEFAULT_OVERLAY_GRADIENT: BackgroundOverlayGradient = {
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
};

function parseHexRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '').trim();
  const full =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned;
  const parsed = parseInt(full, 16);
  if (!Number.isFinite(parsed) || full.length !== 6) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

function toRgba(r: number, g: number, b: number, alpha01: number): string {
  const a = Math.max(0, Math.min(1, alpha01));
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Number(a.toFixed(4))})`;
}

export function renderBackgroundOverlayGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  overlay: BackgroundOverlayGradient | undefined
): void {
  if (!overlay || !overlay.enabled) return;

  const overallOpacity = Math.max(0, Math.min(1, overlay.opacity / 100));
  if (overallOpacity <= 0) return;

  const rad = ((overlay.angle - 90) * Math.PI) / 180;
  const cx = width / 2;
  const cy = height / 2;
  const halfLen =
    (Math.abs(width * Math.cos(rad)) + Math.abs(height * Math.sin(rad))) / 2;
  const dx = Math.cos(rad) * halfLen;
  const dy = Math.sin(rad) * halfLen;

  const span = Math.max(0.1, Math.min(1, overlay.coverage / 100));
  const midRatio = Math.max(0.05, Math.min(0.95, overlay.midpoint / 100));
  const midStop = Math.min(span, Math.max(0, span * midRatio));

  const startRgb = parseHexRgb(overlay.startColor);
  const endRgb = parseHexRgb(overlay.endColor);
  const a0 = Math.max(0, Math.min(1, overlay.startAlpha / 100));
  const a1 = Math.max(0, Math.min(1, overlay.endAlpha / 100));

  const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  grad.addColorStop(0, toRgba(startRgb.r, startRgb.g, startRgb.b, a0));
  grad.addColorStop(
    midStop,
    toRgba(
      (startRgb.r + endRgb.r) / 2,
      (startRgb.g + endRgb.g) / 2,
      (startRgb.b + endRgb.b) / 2,
      (a0 + a1) / 2
    )
  );
  const endColorRgba = toRgba(endRgb.r, endRgb.g, endRgb.b, a1);
  grad.addColorStop(span, endColorRgba);
  if (span < 1) {
    grad.addColorStop(1, endColorRgba);
  }

  ctx.save();
  ctx.globalAlpha = overallOpacity;
  ctx.globalCompositeOperation = overlay.blendMode || 'source-over';
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export function createLinearGradient(
  width: number,
  height: number,
  config: GradientConfig
): fabric.Gradient<'linear'> {
  const rad = ((config.angle - 90) * Math.PI) / 180;
  const cx = width / 2;
  const cy = height / 2;
  const halfLen =
    (Math.abs(width * Math.cos(rad)) + Math.abs(height * Math.sin(rad))) / 2;

  const dx = Math.cos(rad) * halfLen;
  const dy = Math.sin(rad) * halfLen;

  const colorStops =
    config.stops && config.stops.length >= 2
      ? config.stops
      : [
          { offset: 0, color: config.startColor },
          { offset: 1, color: config.endColor },
        ];

  return new fabric.Gradient({
    type: 'linear',
    gradientUnits: 'pixels',
    coords: {
      x1: cx - dx,
      y1: cy - dy,
      x2: cx + dx,
      y2: cy + dy,
    },
    colorStops,
  });
}

export function buildGradientCssPreview(config: GradientConfig): string {
  const linearStops =
    config.stops && config.stops.length >= 2
      ? config.stops
          .map((s) => `${s.color} ${Math.round(s.offset * 100)}%`)
          .join(', ')
      : `${config.startColor} 0%, ${config.endColor} 100%`;

  return `linear-gradient(${config.angle}deg, ${linearStops})`;
}

export function positionBackgroundImage(
  bgImage: fabric.FabricImage,
  canvasWidth: number,
  canvasHeight: number,
  config: BackgroundImageConfig
): void {
  const imgW = bgImage.width || 1;
  const imgH = bgImage.height || 1;
  const baseScale =
    config.fitMode === 'cover'
      ? Math.max(canvasWidth / imgW, canvasHeight / imgH)
      : Math.min(canvasWidth / imgW, canvasHeight / imgH);

  const finalScale = baseScale * Math.max(0.1, config.zoom);

  bgImage.set({
    originX: 'center',
    originY: 'center',
    left: canvasWidth / 2 + config.panX,
    top: canvasHeight / 2 + config.panY,
    scaleX: finalScale,
    scaleY: finalScale,
    selectable: false,
    evented: false,
  });
  bgImage.setCoords();
}

export function extractSelectedState(
  obj: fabric.FabricObject | null | undefined
): SelectedObjectState | null {
  if (!obj) return null;
  const meta = ensureObjectMeta(obj);

  if (obj instanceof StoryTextbox || obj instanceof fabric.Textbox) {
    const story = obj as StoryTextbox;
    const rawWeight = story.fontWeight;
    const numericWeight =
      typeof rawWeight === 'number'
        ? rawWeight
        : rawWeight === 'bold'
          ? 700
          : rawWeight === 'normal'
            ? 400
            : parseInt(String(rawWeight), 10) || 400;

    return {
      kind: 'text',
      id: meta.editorId!,
      name: meta.editorName!,
      text: story.text || '',
      fontFamily: story.fontFamily || 'Fedro',
      fontSize: Math.round(story.fontSize || 64),
      fontWeight: numericWeight,
      fontStyle: story.fontStyle === 'italic' ? 'italic' : 'normal',
      fontOpsz: Math.round(story.fontOpsz ?? Math.min(144, Math.max(9, story.fontSize || 72))),
      fontSoft: Math.round(story.fontSoft ?? 100),
      fontWonk: Number((story.fontWonk ?? 0).toFixed(2)),
      underline: Boolean(story.underline),
      linethrough: Boolean(story.linethrough),
      textAlign:
        (story.textAlign as 'left' | 'center' | 'right' | 'justify') || 'center',
      fill: typeof story.fill === 'string' ? story.fill : '#000000',
      lineHeight: Number((story.lineHeight || 1.0).toFixed(2)),
      charSpacing: Math.round(story.charSpacing || 0),
      bgStyle: story.bgStyle || 'none',
      textBgColor: story.textBgColor || '#ffffff',
      pillRadius: Math.round(story.pillRadius ?? 20),
      pillPaddingX: Math.round(story.pillPaddingX ?? 24),
      pillPaddingY: Math.round(story.pillPaddingY ?? 8),
      textShadowEnabled: Boolean(story.shadow),
      opacity: Number((story.opacity ?? 1).toFixed(2)),
      angle: Math.round(story.angle || 0),
      flipX: Boolean(story.flipX),
      flipY: Boolean(story.flipY),
      locked: Boolean(meta.locked),
    };
  }

  if (obj instanceof fabric.FabricImage) {
    const imgMeta = obj as ImageWithCutoutMeta & {
      imageFilter?: Partial<ImageFilterConfig>;
    };
    const natW = imgMeta.width || 0;
    const natH = imgMeta.height || 0;
    const sx = Math.abs(imgMeta.scaleX ?? 1);
    const sy = Math.abs(imgMeta.scaleY ?? 1);
    return {
      kind: 'image',
      id: meta.editorId!,
      name: meta.editorName!,
      cutoutShape: imgMeta.cutoutShape || 'none',
      cutoutRadius: imgMeta.cutoutRadius ?? 16,
      naturalWidth: natW,
      naturalHeight: natH,
      width: Math.max(1, Math.round(natW * sx)),
      height: Math.max(1, Math.round(natH * sy)),
      aspectLocked: imgMeta.aspectLocked ?? true,
      strokeColor: imgMeta.imageStrokeColor || '#ffffff',
      strokeWidth: Math.round(imgMeta.imageStrokeWidth ?? 0),
      strokeStyle: imgMeta.imageStrokeStyle || 'solid',
      shadowEnabled: Boolean(imgMeta.imageShadowEnabled ?? imgMeta.shadow),
      shadowColor: imgMeta.imageShadowColor || '#000000',
      shadowOpacity: Math.round(imgMeta.imageShadowOpacity ?? 45),
      shadowBlur: Math.round(imgMeta.imageShadowBlur ?? 24),
      shadowOffsetX: Math.round(imgMeta.imageShadowOffsetX ?? 0),
      shadowOffsetY: Math.round(imgMeta.imageShadowOffsetY ?? 12),
      filter: normalizeImageFilterConfig(imgMeta.imageFilter),
      opacity: Number((imgMeta.opacity ?? 1).toFixed(2)),
      angle: Math.round(imgMeta.angle || 0),
      scaleX: Number((imgMeta.scaleX ?? 1).toFixed(2)),
      scaleY: Number((imgMeta.scaleY ?? 1).toFixed(2)),
      flipX: Boolean(imgMeta.flipX),
      flipY: Boolean(imgMeta.flipY),
      locked: Boolean(meta.locked),
    };
  }

  if (obj instanceof TemplateSlotRect) {
    return {
      kind: 'slot',
      id: meta.editorId!,
      name: meta.editorName!,
      slotIndex: obj.slotIndex ?? 1,
      width: Math.max(1, Math.round(obj.getScaledWidth())),
      height: Math.max(1, Math.round(obj.getScaledHeight())),
      cornerPercent: Math.round(obj.slotCornerPercent ?? 0),
      opacity: Number((obj.opacity ?? 1).toFixed(2)),
      angle: Math.round(obj.angle || 0),
      flipX: Boolean(obj.flipX),
      flipY: Boolean(obj.flipY),
      locked: Boolean(meta.locked),
    };
  }

  const shapeMeta = obj as fabric.FabricObject & {
    shapeKind?: BasicShapeKind;
    shapeCornerRadius?: number;
  };
  if (shapeMeta.shapeKind) {
    const rectRx =
      obj instanceof fabric.Rect ? Math.round(obj.rx ?? 0) : 0;
    return {
      kind: 'shape',
      id: meta.editorId!,
      name: meta.editorName!,
      shapeKind: shapeMeta.shapeKind,
      fill: typeof obj.fill === 'string' ? obj.fill : '',
      stroke: typeof obj.stroke === 'string' ? obj.stroke : '#000000',
      strokeWidth: Math.round(obj.strokeWidth ?? 0),
      cornerRadius: Math.round(shapeMeta.shapeCornerRadius ?? rectRx),
      opacity: Number((obj.opacity ?? 1).toFixed(2)),
      angle: Math.round(obj.angle || 0),
      flipX: Boolean(obj.flipX),
      flipY: Boolean(obj.flipY),
      locked: Boolean(meta.locked),
    };
  }

  return {
    kind: 'other',
    id: meta.editorId!,
    name: meta.editorName!,
    opacity: Number((obj.opacity ?? 1).toFixed(2)),
    angle: Math.round(obj.angle || 0),
    flipX: Boolean(obj.flipX),
    flipY: Boolean(obj.flipY),
    locked: Boolean(meta.locked),
  };
}

export function extractTemplateSlots(canvas: fabric.Canvas): TemplateSlotSummary[] {
  return canvas
    .getObjects()
    .filter((obj): obj is TemplateSlotRect => obj instanceof TemplateSlotRect)
    .map((slot) => {
      const meta = ensureObjectMeta(slot);
      return {
        id: meta.editorId!,
        label: meta.editorName || `Photo ${slot.slotIndex ?? 1}`,
        slotIndex: slot.slotIndex ?? 1,
        width: Math.max(1, Math.round(slot.getScaledWidth())),
        height: Math.max(1, Math.round(slot.getScaledHeight())),
        cornerPercent: Math.round(slot.slotCornerPercent ?? 0),
      };
    })
    .sort((a, b) => a.slotIndex - b.slotIndex);
}

export function extractLayersList(canvas: fabric.Canvas): LayerItem[] {
  const objects = canvas.getObjects();
  const active = canvas.getActiveObject();
  const activeId = active ? ensureObjectMeta(active).editorId : null;

  return objects
    .map((obj, index): LayerItem => {
      const meta = ensureObjectMeta(obj);
      const isText = obj instanceof StoryTextbox || obj instanceof fabric.Textbox;
      const isImage = obj instanceof fabric.FabricImage;
      const isSlot = obj instanceof TemplateSlotRect;
      const isShape = Boolean((obj as { shapeKind?: BasicShapeKind }).shapeKind);
      const kind = isText
        ? 'text'
        : isImage
          ? 'image'
          : isSlot
            ? 'slot'
            : isShape
              ? 'shape'
              : 'other';

      let label = meta.editorName || 'Layer';
      if (isText) {
        const txt = ((obj as fabric.Textbox).text || '').trim().replace(/\s+/g, ' ');
        label = txt ? txt.slice(0, 28) + (txt.length > 28 ? '…' : '') : 'Empty Text';
      }

      return {
        id: meta.editorId!,
        kind,
        label,
        visible: obj.visible !== false,
        locked: Boolean(meta.locked),
        index,
        isSelected: meta.editorId === activeId,
      };
    })
    .reverse(); // Topmost layer first in UI
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as Data URL'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('File read error'));
    reader.readAsDataURL(file);
  });
}

/**
 * Downscales oversized camera photos (e.g., 12–48 MP) on upload so they stay
 * within WebGL texture limits (<= 4096px), keep Undo snapshots lightweight,
 * and still exceed 2x the 1080px story export width.
 */
export async function prepareBackgroundImageDataURL(
  file: File,
  maxDimension = 2400
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to decode background image'));
      img.src = objectUrl;
    });

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const maxSide = Math.max(w, h);
    if (!maxSide || maxSide <= maxDimension) {
      return await readFileAsDataURL(file);
    }

    const scale = maxDimension / maxSide;
    const targetW = Math.max(1, Math.round(w * scale));
    const targetH = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return await readFileAsDataURL(file);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const preserveAlpha =
      file.type === 'image/png' || file.type === 'image/webp';
    const mime = preserveAlpha ? file.type : 'image/jpeg';
    return canvas.toDataURL(mime, preserveAlpha ? undefined : 0.92);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

