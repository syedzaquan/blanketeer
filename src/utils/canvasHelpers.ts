import * as fabric from 'fabric';
import type {
  BackgroundImageConfig,
  GradientConfig,
  LayerItem,
  SelectedObjectState,
} from '../types/editor';
import type { ImageWithCutoutMeta } from './imageCutouts';
import { StoryTextbox } from './storyTextbox';

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
  'cutoutShape',
  'cutoutRadius',
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

  return new fabric.Gradient({
    type: 'linear',
    gradientUnits: 'pixels',
    coords: {
      x1: cx - dx,
      y1: cy - dy,
      x2: cx + dx,
      y2: cy + dy,
    },
    colorStops: [
      { offset: 0, color: config.startColor },
      { offset: 1, color: config.endColor },
    ],
  });
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
      fill: typeof story.fill === 'string' ? story.fill : '#ffffff',
      lineHeight: Number((story.lineHeight || 0.85).toFixed(2)),
      charSpacing: Math.round(story.charSpacing || 0),
      bgStyle: story.bgStyle || 'none',
      textBgColor: story.textBgColor || '#ffffff',
      pillRadius: Math.round(story.pillRadius ?? 20),
      pillPaddingX: Math.round(story.pillPaddingX ?? 24),
      pillPaddingY: Math.round(story.pillPaddingY ?? 8),
      opacity: Number((story.opacity ?? 1).toFixed(2)),
      angle: Math.round(story.angle || 0),
      flipX: Boolean(story.flipX),
      flipY: Boolean(story.flipY),
      locked: Boolean(meta.locked),
    };
  }

  if (obj instanceof fabric.FabricImage) {
    const imgMeta = obj as ImageWithCutoutMeta;
    return {
      kind: 'image',
      id: meta.editorId!,
      name: meta.editorName!,
      cutoutShape: imgMeta.cutoutShape || 'none',
      cutoutRadius: imgMeta.cutoutRadius ?? 16,
      naturalWidth: imgMeta.width || 0,
      naturalHeight: imgMeta.height || 0,
      opacity: Number((imgMeta.opacity ?? 1).toFixed(2)),
      angle: Math.round(imgMeta.angle || 0),
      scaleX: Number((imgMeta.scaleX ?? 1).toFixed(2)),
      scaleY: Number((imgMeta.scaleY ?? 1).toFixed(2)),
      flipX: Boolean(imgMeta.flipX),
      flipY: Boolean(imgMeta.flipY),
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

export function extractLayersList(canvas: fabric.Canvas): LayerItem[] {
  const objects = canvas.getObjects();
  const active = canvas.getActiveObject();
  const activeId = active ? ensureObjectMeta(active).editorId : null;

  return objects
    .map((obj, index): LayerItem => {
      const meta = ensureObjectMeta(obj);
      const isText = obj instanceof StoryTextbox || obj instanceof fabric.Textbox;
      const isImage = obj instanceof fabric.FabricImage;
      const kind = isText ? 'text' : isImage ? 'image' : 'other';

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

