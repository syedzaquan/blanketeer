import * as fabric from 'fabric';
import type { RectProps, SerializedRectProps, TOptions } from 'fabric';

export interface TemplateSlotExtraProps {
  editorId?: string;
  editorName?: string;
  isTemplateSlot?: boolean;
  slotIndex?: number;
  slotCornerPercent?: number;
  locked?: boolean;
}

export type TemplateSlotOptions = TOptions<RectProps> & TemplateSlotExtraProps;

export class TemplateSlotRect extends fabric.Rect {
  static type = 'TemplateSlotRect';

  declare editorId?: string;
  declare editorName?: string;
  declare isTemplateSlot: boolean;
  declare slotIndex: number;
  declare slotCornerPercent: number;
  declare locked?: boolean;

  constructor(options: TemplateSlotOptions = {}) {
    const w = options.width ?? 516;
    const h = options.height ?? 675;
    const cornerPercent = options.slotCornerPercent ?? 0;
    const radius =
      cornerPercent <= 0
        ? 0
        : Math.min((Math.min(w, h) * cornerPercent) / 100, Math.min(w, h) / 2);

    super({
      fill: 'rgba(255, 255, 255, 0.12)',
      stroke: 'rgba(255, 255, 255, 0.55)',
      strokeWidth: 3,
      strokeDashArray: [14, 10],
      strokeUniform: true,
      rx: radius,
      ry: radius,
      ...options,
    });

    this.editorId = options.editorId;
    this.editorName = options.editorName;
    this.isTemplateSlot = options.isTemplateSlot ?? true;
    this.slotIndex = options.slotIndex ?? 1;
    this.slotCornerPercent = cornerPercent;
    this.locked = options.locked ?? false;
  }

  _render(ctx: CanvasRenderingContext2D): void {
    super._render(ctx);

    const sx = Math.abs(this.scaleX ?? 1) || 1;
    const sy = Math.abs(this.scaleY ?? 1) || 1;
    const invAvg = 1 / Math.sqrt(sx * sy);
    const badgeRadius = 32 * invAvg;

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -16 * invAvg, badgeRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.fill();
    ctx.lineWidth = 2.5 * invAvg;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.stroke();

    const plusArm = 13 * invAvg;
    ctx.beginPath();
    ctx.moveTo(-plusArm, -16 * invAvg);
    ctx.lineTo(plusArm, -16 * invAvg);
    ctx.moveTo(0, -16 * invAvg - plusArm);
    ctx.lineTo(0, -16 * invAvg + plusArm);
    ctx.lineWidth = 3 * invAvg;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.stroke();

    const label = this.editorName || `Photo ${this.slotIndex}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.font = `600 ${Math.round(24 * invAvg)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, 0, 28 * invAvg);
    ctx.restore();
  }

  toObject<
    T extends Omit<
      TOptions<RectProps> & fabric.TClassProperties<this>,
      keyof SerializedRectProps
    >,
    K extends keyof T = never,
  >(propertiesToInclude: K[] = []): Pick<T, K> & SerializedRectProps {
    const extraKeys = [
      'editorId',
      'editorName',
      'isTemplateSlot',
      'slotIndex',
      'slotCornerPercent',
      'locked',
      ...propertiesToInclude,
    ] as unknown as K[];
    return super.toObject(extraKeys) as Pick<T, K> & SerializedRectProps;
  }
}

fabric.classRegistry.setClass(TemplateSlotRect, 'TemplateSlotRect');
fabric.classRegistry.setClass(TemplateSlotRect, 'template-slot');

export function updateTemplateSlotCornerRadius(
  slot: TemplateSlotRect,
  cornerPercent: number
): void {
  const clamped = Math.max(0, Math.min(50, Math.round(cornerPercent)));
  const w = slot.getScaledWidth();
  const h = slot.getScaledHeight();
  const minDim = Math.min(w, h);
  const visualRadius =
    clamped <= 0 ? 0 : Math.min((minDim * clamped) / 100, minDim / 2);
  const sx = Math.abs(slot.scaleX ?? 1) || 1;
  const sy = Math.abs(slot.scaleY ?? 1) || 1;

  slot.slotCornerPercent = clamped;
  slot.set({
    rx: visualRadius / sx,
    ry: visualRadius / sy,
    dirty: true,
  });
  slot.setCoords();
}

export async function coverCropFileToDataURL(
  file: File,
  srcDataUrl: string,
  targetWidth: number,
  targetHeight: number
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Failed to load image'));
    el.src = srcDataUrl;
  });

  const natW = Math.max(1, img.naturalWidth || 1);
  const natH = Math.max(1, img.naturalHeight || 1);
  const density = Math.min(
    1.5,
    Math.max(1, Math.min(natW / targetWidth, natH / targetHeight))
  );
  const outW = Math.max(1, Math.round(targetWidth * density));
  const outH = Math.max(1, Math.round(targetHeight * density));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return srcDataUrl;

  const scale = Math.max(outW / natW, outH / natH);
  const drawW = natW * scale;
  const drawH = natH * scale;
  const dx = (outW - drawW) / 2;
  const dy = (outH - drawH) / 2;

  ctx.drawImage(img, dx, dy, drawW, drawH);

  const keepAlpha =
    file.type === 'image/png' ||
    file.type === 'image/webp' ||
    file.type === 'image/svg+xml';

  return keepAlpha
    ? canvas.toDataURL('image/png')
    : canvas.toDataURL('image/jpeg', 0.92);
}

