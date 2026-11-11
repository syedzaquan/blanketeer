import * as fabric from 'fabric';
import type { ImageProps, SerializedImageProps, TOptions } from 'fabric';
import type { CutoutShape, ImageStrokeStyle } from '../types/editor';

type DrawContext = Parameters<fabric.FabricImage['drawObject']>[2];

export interface StoryImageExtraProps {
  editorId?: string;
  editorName?: string;
  cutoutShape?: CutoutShape;
  cutoutRadius?: number;
  aspectLocked?: boolean;
  imageStrokeColor?: string;
  imageStrokeWidth?: number;
  imageStrokeStyle?: ImageStrokeStyle;
  imageShadowEnabled?: boolean;
  imageShadowColor?: string;
  imageShadowOpacity?: number;
  imageShadowBlur?: number;
  imageShadowOffsetX?: number;
  imageShadowOffsetY?: number;
  locked?: boolean;
}

export type StoryImageOptions = TOptions<ImageProps> & StoryImageExtraProps;

export function buildImageShadow(
  enabled: boolean,
  color: string,
  opacity: number,
  blur: number,
  offsetX: number,
  offsetY: number
): fabric.Shadow | null {
  if (!enabled) return null;
  const cleaned = color.replace('#', '').trim();
  const full =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned;
  const parsed = parseInt(full, 16);
  const r = Number.isFinite(parsed) && full.length === 6 ? (parsed >> 16) & 255 : 0;
  const g = Number.isFinite(parsed) && full.length === 6 ? (parsed >> 8) & 255 : 0;
  const b = Number.isFinite(parsed) && full.length === 6 ? parsed & 255 : 0;
  const alpha = Math.max(0, Math.min(1, opacity / 100));

  return new fabric.Shadow({
    color: `rgba(${r}, ${g}, ${b}, ${Number(alpha.toFixed(3))})`,
    blur: Math.max(0, blur),
    offsetX,
    offsetY,
    nonScaling: true,
  });
}

function traceRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  rx: number,
  ry: number
): void {
  const rX = Math.max(0, Math.min(rx, width / 2));
  const rY = Math.max(0, Math.min(ry, height / 2));
  ctx.beginPath();
  if (rX === 0 || rY === 0) {
    ctx.rect(x, y, width, height);
    ctx.closePath();
    return;
  }
  const k = 0.5522847498;
  ctx.moveTo(x + rX, y);
  ctx.lineTo(x + width - rX, y);
  ctx.bezierCurveTo(
    x + width - k * rX,
    y,
    x + width,
    y + k * rY,
    x + width,
    y + rY
  );
  ctx.lineTo(x + width, y + height - rY);
  ctx.bezierCurveTo(
    x + width,
    y + height - k * rY,
    x + width - k * rX,
    y + height,
    x + width - rX,
    y + height
  );
  ctx.lineTo(x + rX, y + height);
  ctx.bezierCurveTo(
    x + k * rX,
    y + height,
    x,
    y + height - k * rY,
    x,
    y + height - rY
  );
  ctx.lineTo(x, y + rY);
  ctx.bezierCurveTo(x, y + k * rY, x + k * rX, y, x + rX, y);
  ctx.closePath();
}

export class StoryImage extends fabric.FabricImage {
  static type = 'StoryImage';

  static cacheProperties = [
    ...fabric.FabricImage.cacheProperties,
    'cutoutShape',
    'cutoutRadius',
    'imageStrokeColor',
    'imageStrokeWidth',
    'imageStrokeStyle',
  ];

  declare editorId?: string;
  declare editorName?: string;
  declare cutoutShape: CutoutShape;
  declare cutoutRadius: number;
  declare aspectLocked: boolean;
  declare imageStrokeColor: string;
  declare imageStrokeWidth: number;
  declare imageStrokeStyle: ImageStrokeStyle;
  declare imageShadowEnabled: boolean;
  declare imageShadowColor: string;
  declare imageShadowOpacity: number;
  declare imageShadowBlur: number;
  declare imageShadowOffsetX: number;
  declare imageShadowOffsetY: number;
  declare locked?: boolean;

  constructor(
    element: ConstructorParameters<typeof fabric.FabricImage>[0],
    options: Partial<StoryImageOptions> = {}
  ) {
    super(element, options);
    this.cutoutShape = options.cutoutShape ?? 'none';
    this.cutoutRadius = options.cutoutRadius ?? 16;
    this.aspectLocked = options.aspectLocked ?? true;
    this.imageStrokeColor = options.imageStrokeColor ?? '#ffffff';
    this.imageStrokeWidth = options.imageStrokeWidth ?? 0;
    this.imageStrokeStyle = options.imageStrokeStyle ?? 'solid';
    this.imageShadowEnabled = options.imageShadowEnabled ?? false;
    this.imageShadowColor = options.imageShadowColor ?? '#000000';
    this.imageShadowOpacity = options.imageShadowOpacity ?? 45;
    this.imageShadowBlur = options.imageShadowBlur ?? 24;
    this.imageShadowOffsetX = options.imageShadowOffsetX ?? 0;
    this.imageShadowOffsetY = options.imageShadowOffsetY ?? 12;
  }

  needsItsOwnCache(): boolean {
    return super.needsItsOwnCache() || (this.imageStrokeWidth || 0) > 0;
  }

  _getCacheCanvasDimensions() {
    const dims = super._getCacheCanvasDimensions();
    const strokePx = Math.max(0, this.imageStrokeWidth || 0);
    if (strokePx > 0) {
      const canvasZoom = Math.max(1, this.canvas?.getZoom() ?? 1);
      const retina = Math.max(1, this.getCanvasRetinaScaling());
      const pad = Math.ceil(strokePx * 2 * canvasZoom * retina + 12);
      dims.width += pad;
      dims.height += pad;
      dims.x += pad;
      dims.y += pad;
    }
    return dims;
  }

  private _applyStrokeDash(
    ctx: CanvasRenderingContext2D,
    strokePx: number,
    style: ImageStrokeStyle
  ): void {
    if (style === 'dashed') {
      ctx.setLineDash([Math.max(4, strokePx * 2.1), Math.max(3, strokePx * 1.25)]);
      ctx.lineCap = 'butt';
    } else if (style === 'dotted') {
      ctx.setLineDash([0.01, Math.max(4, strokePx * 1.85)]);
      ctx.lineCap = 'round';
    } else {
      ctx.setLineDash([]);
      ctx.lineCap = 'butt';
    }
  }

  private _renderImageStroke(ctx: CanvasRenderingContext2D): void {
    const strokePx = Math.max(0, this.imageStrokeWidth || 0);
    if (strokePx <= 0 || !this.imageStrokeColor) return;

    const sx = Math.abs(this.scaleX || 1);
    const sy = Math.abs(this.scaleY || 1);
    const imgW = this.width || 0;
    const imgH = this.height || 0;
    const scaledW = imgW * sx;
    const scaledH = imgH * sy;
    if (scaledW <= 0 || scaledH <= 0) return;

    const shape: CutoutShape = this.clipPath ? this.cutoutShape || 'none' : 'none';
    const style: ImageStrokeStyle = this.imageStrokeStyle || 'solid';

    // Star & Heart: paint behind the clipped silhouette via destination-over
    // with 2x stroke width so the entire visible stroke sits strictly outside.
    if ((shape === 'star' || shape === 'heart') && this.clipPath) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      this.clipPath.transform(ctx);
      const cpScaleX = Math.abs(this.clipPath.scaleX || 1);
      const cpScaleY = Math.abs(this.clipPath.scaleY || 1);
      const avgScale = Math.max(
        0.01,
        ((sx + sy) / 2) * ((cpScaleX + cpScaleY) / 2)
      );
      const cp = this.clipPath as fabric.FabricObject & {
        _render: (c: CanvasRenderingContext2D) => void;
      };
      const prevFill = cp.fill;
      const prevStroke = cp.stroke;
      const prevStrokeWidth = cp.strokeWidth;
      const prevDash = cp.strokeDashArray;
      const prevJoin = cp.strokeLineJoin;
      const prevCap = cp.strokeLineCap;
      try {
        const localWidth = (strokePx * 2) / avgScale;
        cp.fill = '';
        cp.stroke = this.imageStrokeColor;
        cp.strokeWidth = localWidth;
        cp.strokeLineJoin = 'round';
        cp.strokeLineCap = style === 'dotted' ? 'round' : 'butt';
        cp.strokeDashArray =
          style === 'dashed'
            ? [localWidth * 1.25, localWidth * 0.85]
            : style === 'dotted'
              ? [0.01, localWidth * 1.15]
              : null;
        cp._render(ctx);
      } finally {
        cp.fill = prevFill;
        cp.stroke = prevStroke;
        cp.strokeWidth = prevStrokeWidth;
        cp.strokeDashArray = prevDash;
        cp.strokeLineJoin = prevJoin;
        cp.strokeLineCap = prevCap;
        ctx.restore();
      }
      return;
    }

    // Original / Circle / Square / Squircle: draw uniform-width OUTSIDE border
    ctx.save();
    ctx.scale(1 / sx, 1 / sy);
    ctx.strokeStyle = this.imageStrokeColor;
    this._applyStrokeDash(ctx, strokePx, style);

    const isSolid = style === 'solid';
    // Solid uses destination-over with 0.5px inward overlap so there is zero AA seam
    // while leaving 100% of the photo uncovered; dashed/dotted sit strictly outside.
    if (isSolid) {
      ctx.globalCompositeOperation = 'destination-over';
    }
    const outset = isSolid ? strokePx / 2 - 0.5 : strokePx / 2;
    const drawWidth = isSolid ? strokePx + 1 : strokePx;
    const minLocalDim = Math.min(imgW, imgH);

    if (shape === 'none') {
      ctx.lineJoin = 'miter';
      ctx.lineWidth = drawWidth;
      ctx.strokeRect(
        -scaledW / 2 - outset,
        -scaledH / 2 - outset,
        scaledW + outset * 2,
        scaledH + outset * 2
      );
      ctx.restore();
      return;
    }

    if (shape === 'circle') {
      const rx = Math.max(1, (minLocalDim / 2) * sx + outset);
      const ry = Math.max(1, (minLocalDim / 2) * sy + outset);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.closePath();
      ctx.lineWidth = drawWidth;
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (shape === 'square') {
      const sw = Math.max(1, minLocalDim * sx + outset * 2);
      const sh = Math.max(1, minLocalDim * sy + outset * 2);
      ctx.lineJoin = 'miter';
      ctx.lineWidth = drawWidth;
      ctx.strokeRect(-sw / 2, -sh / 2, sw, sh);
      ctx.restore();
      return;
    }

    // shape === 'rounded' (Squircle)
    const rawR = Math.min(
      (minLocalDim * (this.cutoutRadius ?? 16)) / 100,
      minLocalDim / 2
    );
    const rw = Math.max(1, scaledW + outset * 2);
    const rh = Math.max(1, scaledH + outset * 2);
    const rx = rawR > 0 ? rawR * sx + outset : 0;
    const ry = rawR > 0 ? rawR * sy + outset : 0;
    traceRoundedRectPath(ctx, -rw / 2, -rh / 2, rw, rh, rx, ry);
    ctx.lineJoin = 'round';
    ctx.lineWidth = drawWidth;
    ctx.stroke();
    ctx.restore();
  }

  drawObject(
    ctx: CanvasRenderingContext2D,
    forClipping: boolean | undefined,
    context: DrawContext
  ): void {
    const originalFill = this.fill;
    const originalStroke = this.stroke;
    if (forClipping) {
      this.fill = 'black';
      this.stroke = '';
      this._setClippingProperties(ctx);
    } else {
      this._renderBackground(ctx);
    }
    this._render(ctx);
    this._drawClipPath(ctx, this.clipPath, context);
    if (!forClipping && this.imageStrokeWidth > 0 && this.imageStrokeColor) {
      this._renderImageStroke(ctx);
    }
    this.fill = originalFill;
    this.stroke = originalStroke;
  }

  toObject<
    T extends Omit<
      TOptions<ImageProps> & fabric.TClassProperties<this>,
      keyof SerializedImageProps
    >,
    K extends keyof T = never,
  >(propertiesToInclude: K[] = []): Pick<T, K> & SerializedImageProps {
    const extraKeys = [
      'editorId',
      'editorName',
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
      'locked',
      ...propertiesToInclude,
    ] as unknown as K[];
    return super.toObject(extraKeys) as Pick<T, K> & SerializedImageProps;
  }
}

fabric.classRegistry.setClass(StoryImage, 'StoryImage');
fabric.classRegistry.setClass(StoryImage, 'story-image');
