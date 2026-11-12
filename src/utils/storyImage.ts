import * as fabric from 'fabric';
import type { ImageProps, SerializedImageProps, TOptions } from 'fabric';
import type {
  CutoutShape,
  ImageFilterConfig,
  ImageStrokeStyle,
} from '../types/editor';

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
  imageFilter?: ImageFilterConfig;
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
  ry: number,
  beginNewPath = true
): void {
  const rX = Math.max(0, Math.min(rx, width / 2));
  const rY = Math.max(0, Math.min(ry, height / 2));
  if (beginNewPath) {
    ctx.beginPath();
  }
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

function computeStampEdgeLayout(
  edgeLength: number,
  notchRadius: number,
  cornerMargin: number
): { count: number; startOffset: number; step: number } {
  const gap = notchRadius * 0.85;
  const step = notchRadius * 2 + gap;
  const available = edgeLength - 2 * cornerMargin;
  if (available < notchRadius * 2 || step <= 0) {
    return { count: 0, startOffset: 0, step: 0 };
  }
  const count = Math.max(1, Math.floor((available + gap) / step));
  const totalSpan = count * notchRadius * 2 + (count - 1) * gap;
  const startOffset = (edgeLength - totalSpan) / 2;
  return { count, startOffset, step };
}

function traceStampOuterRectPath(
  ctx: CanvasRenderingContext2D,
  halfW: number,
  halfH: number,
  frameW: number
): void {
  const notchR = Math.max(2.5, Math.min(frameW * 0.4, 22));
  const cornerMargin = Math.max(notchR * 0.75, frameW * 0.35);
  const topBottom = computeStampEdgeLayout(halfW * 2, notchR, cornerMargin);
  const leftRight = computeStampEdgeLayout(halfH * 2, notchR, cornerMargin);

  ctx.beginPath();
  ctx.moveTo(-halfW, -halfH);

  // Top edge (left -> right)
  for (let i = 0; i < topBottom.count; i++) {
    const cx = -halfW + topBottom.startOffset + notchR + i * topBottom.step;
    ctx.arc(cx, -halfH, notchR, Math.PI, 0, true);
  }
  ctx.lineTo(halfW, -halfH);

  // Right edge (top -> bottom)
  for (let i = 0; i < leftRight.count; i++) {
    const cy = -halfH + leftRight.startOffset + notchR + i * leftRight.step;
    ctx.arc(halfW, cy, notchR, -Math.PI / 2, Math.PI / 2, true);
  }
  ctx.lineTo(halfW, halfH);

  // Bottom edge (right -> left)
  for (let i = 0; i < topBottom.count; i++) {
    const cx = halfW - topBottom.startOffset - notchR - i * topBottom.step;
    ctx.arc(cx, halfH, notchR, 0, Math.PI, true);
  }
  ctx.lineTo(-halfW, halfH);

  // Left edge (bottom -> top)
  for (let i = 0; i < leftRight.count; i++) {
    const cy = halfH - leftRight.startOffset - notchR - i * leftRight.step;
    ctx.arc(-halfW, cy, notchR, Math.PI / 2, -Math.PI / 2, true);
  }
  ctx.closePath();
}

function traceStampOuterEllipsePath(
  ctx: CanvasRenderingContext2D,
  rx: number,
  ry: number,
  frameW: number
): void {
  const notchR = Math.max(2.5, Math.min(frameW * 0.4, 22));
  const perimeter =
    Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  const count = Math.max(8, Math.round(perimeter / (notchR * 2.85)));

  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const theta = (i / count) * Math.PI * 2;
    const px = rx * Math.cos(theta);
    const py = ry * Math.sin(theta);
    const tangent = Math.atan2(ry * Math.cos(theta), -rx * Math.sin(theta));
    ctx.arc(px, py, notchR, tangent + Math.PI, tangent, true);
  }
  ctx.closePath();
}

function traceWavyOuterRectPath(
  ctx: CanvasRenderingContext2D,
  halfW: number,
  halfH: number,
  frameW: number
): void {
  const amp = Math.max(2, Math.min(frameW * 0.34, 18));
  const bhw = Math.max(2, halfW - amp);
  const bhh = Math.max(2, halfH - amp);
  const idealPeriod = Math.max(28, frameW * 2.4);
  const lobesX = Math.max(2, Math.round((bhw * 2) / idealPeriod));
  const lobesY = Math.max(2, Math.round((bhh * 2) / idealPeriod));
  const stepsX = lobesX * 14;
  const stepsY = lobesY * 14;
  const k = 0.5522847498;

  ctx.beginPath();
  ctx.moveTo(-bhw, -bhh - amp);

  // Top edge (left -> right)
  for (let i = 1; i <= stepsX; i++) {
    const t = i / stepsX;
    const x = -bhw + t * (bhw * 2);
    const y = -bhh - amp * Math.cos(Math.PI * 2 * lobesX * t);
    ctx.lineTo(x, y);
  }
  // Top-right corner
  ctx.bezierCurveTo(
    bhw + k * amp,
    -bhh - amp,
    bhw + amp,
    -bhh - k * amp,
    bhw + amp,
    -bhh
  );

  // Right edge (top -> bottom)
  for (let i = 1; i <= stepsY; i++) {
    const t = i / stepsY;
    const x = bhw + amp * Math.cos(Math.PI * 2 * lobesY * t);
    const y = -bhh + t * (bhh * 2);
    ctx.lineTo(x, y);
  }
  // Bottom-right corner
  ctx.bezierCurveTo(
    bhw + amp,
    bhh + k * amp,
    bhw + k * amp,
    bhh + amp,
    bhw,
    bhh + amp
  );

  // Bottom edge (right -> left)
  for (let i = 1; i <= stepsX; i++) {
    const t = i / stepsX;
    const x = bhw - t * (bhw * 2);
    const y = bhh + amp * Math.cos(Math.PI * 2 * lobesX * t);
    ctx.lineTo(x, y);
  }
  // Bottom-left corner
  ctx.bezierCurveTo(
    -bhw - k * amp,
    bhh + amp,
    -bhw - amp,
    bhh + k * amp,
    -bhw - amp,
    bhh
  );

  // Left edge (bottom -> top)
  for (let i = 1; i <= stepsY; i++) {
    const t = i / stepsY;
    const x = -bhw - amp * Math.cos(Math.PI * 2 * lobesY * t);
    const y = bhh - t * (bhh * 2);
    ctx.lineTo(x, y);
  }
  // Top-left corner
  ctx.bezierCurveTo(
    -bhw - amp,
    -bhh - k * amp,
    -bhw - k * amp,
    -bhh - amp,
    -bhw,
    -bhh - amp
  );

  ctx.closePath();
}

function traceWavyOuterEllipsePath(
  ctx: CanvasRenderingContext2D,
  rx: number,
  ry: number,
  frameW: number
): void {
  const amp = Math.max(2, Math.min(frameW * 0.34, 18));
  const brx = Math.max(2, rx - amp);
  const bry = Math.max(2, ry - amp);
  const perimeter =
    Math.PI * (3 * (brx + bry) - Math.sqrt((3 * brx + bry) * (brx + 3 * bry)));
  const idealPeriod = Math.max(28, frameW * 2.4);
  const lobes = Math.max(8, Math.round(perimeter / idealPeriod));
  const steps = lobes * 14;

  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const theta = t * Math.PI * 2;
    const wave = amp * Math.cos(theta * lobes);
    const px = (brx + wave) * Math.cos(theta);
    const py = (bry + wave) * Math.sin(theta);
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
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
  declare imageFilter?: ImageFilterConfig;
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
      const multiplier = this.imageStrokeStyle === 'polaroid' ? 6.5 : 2;
      const pad = Math.ceil(strokePx * multiplier * canvasZoom * retina + 16);
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
        cp.strokeLineCap =
          style === 'dotted' || style === 'stamp' || style === 'wavy'
            ? 'round'
            : 'butt';
        cp.strokeDashArray =
          style === 'dashed'
            ? [localWidth * 1.25, localWidth * 0.85]
            : style === 'dotted'
              ? [0.01, localWidth * 1.15]
              : style === 'stamp'
                ? [0.01, localWidth * 0.62]
                : style === 'wavy'
                  ? [localWidth * 0.45, localWidth * 0.45]
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
    const minLocalDim = Math.min(imgW, imgH);

    if (style === 'polaroid') {
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = this.imageStrokeColor;

      const innerW =
        shape === 'square' || shape === 'circle'
          ? minLocalDim * sx
          : scaledW;
      const innerH =
        shape === 'square' || shape === 'circle'
          ? minLocalDim * sy
          : scaledH;
      const sidePad = strokePx;
      const bottomPad = Math.round(strokePx * 3.2);
      const outerX = -innerW / 2 - sidePad;
      const outerY = -innerH / 2 - sidePad;
      const outerW = innerW + sidePad * 2;
      const outerH = innerH + sidePad + bottomPad;

      ctx.beginPath();
      ctx.rect(outerX, outerY, outerW, outerH);

      if (shape === 'circle') {
        const innerRx = Math.max(1, (minLocalDim / 2) * sx - 0.5);
        const innerRy = Math.max(1, (minLocalDim / 2) * sy - 0.5);
        ctx.moveTo(innerRx, 0);
        ctx.ellipse(0, 0, innerRx, innerRy, 0, 0, Math.PI * 2);
      } else if (shape === 'rounded') {
        const rawR = Math.min(
          (minLocalDim * (this.cutoutRadius ?? 16)) / 100,
          minLocalDim / 2
        );
        const holeW = Math.max(1, innerW - 1);
        const holeH = Math.max(1, innerH - 1);
        const rx = rawR > 0 ? Math.max(0, rawR * sx - 0.5) : 0;
        const ry = rawR > 0 ? Math.max(0, rawR * sy - 0.5) : 0;
        traceRoundedRectPath(ctx, -holeW / 2, -holeH / 2, holeW, holeH, rx, ry, false);
      } else {
        ctx.rect(
          -innerW / 2 + 0.5,
          -innerH / 2 + 0.5,
          Math.max(1, innerW - 1),
          Math.max(1, innerH - 1)
        );
      }

      ctx.fill('evenodd');
      ctx.restore();
      return;
    }

    if (style === 'stamp' || style === 'wavy') {
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = this.imageStrokeColor;

      if (shape === 'circle') {
        const innerRx = Math.max(1, (minLocalDim / 2) * sx - 0.5);
        const innerRy = Math.max(1, (minLocalDim / 2) * sy - 0.5);
        const outerRx = (minLocalDim / 2) * sx + strokePx;
        const outerRy = (minLocalDim / 2) * sy + strokePx;
        if (style === 'wavy') {
          traceWavyOuterEllipsePath(ctx, outerRx, outerRy, strokePx);
        } else {
          traceStampOuterEllipsePath(ctx, outerRx, outerRy, strokePx);
        }
        ctx.moveTo(innerRx, 0);
        ctx.ellipse(0, 0, innerRx, innerRy, 0, 0, Math.PI * 2);
        ctx.fill('evenodd');
        ctx.restore();
        return;
      }

      const innerW = shape === 'square' ? minLocalDim * sx : scaledW;
      const innerH = shape === 'square' ? minLocalDim * sy : scaledH;
      const outerHalfW = innerW / 2 + strokePx;
      const outerHalfH = innerH / 2 + strokePx;
      if (style === 'wavy') {
        traceWavyOuterRectPath(ctx, outerHalfW, outerHalfH, strokePx);
      } else {
        traceStampOuterRectPath(ctx, outerHalfW, outerHalfH, strokePx);
      }

      if (shape === 'rounded') {
        const rawR = Math.min(
          (minLocalDim * (this.cutoutRadius ?? 16)) / 100,
          minLocalDim / 2
        );
        const holeW = Math.max(1, innerW - 1);
        const holeH = Math.max(1, innerH - 1);
        const rx = rawR > 0 ? Math.max(0, rawR * sx - 0.5) : 0;
        const ry = rawR > 0 ? Math.max(0, rawR * sy - 0.5) : 0;
        traceRoundedRectPath(ctx, -holeW / 2, -holeH / 2, holeW, holeH, rx, ry, false);
      } else {
        ctx.rect(
          -innerW / 2 + 0.5,
          -innerH / 2 + 0.5,
          Math.max(1, innerW - 1),
          Math.max(1, innerH - 1)
        );
      }

      ctx.fill('evenodd');
      ctx.restore();
      return;
    }

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
      'imageFilter',
      'locked',
      ...propertiesToInclude,
    ] as unknown as K[];
    return super.toObject(extraKeys) as Pick<T, K> & SerializedImageProps;
  }
}

fabric.classRegistry.setClass(StoryImage, 'StoryImage');
fabric.classRegistry.setClass(StoryImage, 'story-image');
