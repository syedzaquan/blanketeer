import * as fabric from 'fabric';
import type { BasicShapeKind, ShapeImageFit } from '../types/editor';

export interface ShapeWithImageMeta extends fabric.FabricObject {
  shapeKind?: BasicShapeKind;
  shapeCornerRadius?: number;
  shapeFillColor?: string;
  shapeImageSrc?: string;
  shapeImageFit?: ShapeImageFit;
  shapeImageScale?: number;
  shapeImageOffsetX?: number;
  shapeImageOffsetY?: number;
  _shapeImageEl?: HTMLImageElement;
  _origRenderFill?: (ctx: CanvasRenderingContext2D) => void;
}

const imageCache = new Map<string, HTMLImageElement>();

const loadHTMLImage = (src: string): Promise<HTMLImageElement> => {
  const cached = imageCache.get(src);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return Promise.resolve(cached);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error('Failed to load shape image'));
    img.src = src;
  });
};

/**
 * Computes the draw rectangle (dx, dy, dw, dh) in the shape's local coordinate
 * space (centered at 0,0) so the image behaves like CSS `background-image`
 * with `background-size` (cover/contain/stretch + scale) and `background-position`
 * (offsetX / offsetY), compensating for any non-uniform scaling on the shape.
 */
export function computeShapeImageDrawRect(
  shape: fabric.FabricObject,
  imgWidth: number,
  imgHeight: number,
  options: {
    fit: ShapeImageFit;
    scale: number;
    offsetX: number;
    offsetY: number;
  }
): { x: number; y: number; width: number; height: number } {
  const localW = Math.max(1, shape.width || 1);
  const localH = Math.max(1, shape.height || 1);
  const sx = Math.abs(shape.scaleX ?? 1) || 1;
  const sy = Math.abs(shape.scaleY ?? 1) || 1;
  const visualW = localW * sx;
  const visualH = localH * sy;
  const natW = Math.max(1, imgWidth);
  const natH = Math.max(1, imgHeight);

  const zoom = Math.max(0.1, options.scale || 1);

  let visualScaleX: number;
  let visualScaleY: number;

  switch (options.fit) {
    case 'contain': {
      const base = Math.min(visualW / natW, visualH / natH);
      visualScaleX = base * zoom;
      visualScaleY = base * zoom;
      break;
    }
    case 'stretch': {
      visualScaleX = (visualW / natW) * zoom;
      visualScaleY = (visualH / natH) * zoom;
      break;
    }
    case 'cover':
    default: {
      const base = Math.max(visualW / natW, visualH / natH);
      visualScaleX = base * zoom;
      visualScaleY = base * zoom;
      break;
    }
  }

  const drawW = (natW * visualScaleX) / sx;
  const drawH = (natH * visualScaleY) / sy;
  const drawX = -drawW / 2 + (options.offsetX / 100) * (localW / 2);
  const drawY = -drawH / 2 + (options.offsetY / 100) * (localH / 2);

  return { x: drawX, y: drawY, width: drawW, height: drawH };
}

function attachShapeImageRenderer(shape: ShapeWithImageMeta): void {
  if (!shape._origRenderFill) {
    shape._origRenderFill = (
      shape as unknown as { _renderFill: (ctx: CanvasRenderingContext2D) => void }
    )._renderFill;
  }

  (
    shape as unknown as { _renderFill: (ctx: CanvasRenderingContext2D) => void }
  )._renderFill = function (this: ShapeWithImageMeta, ctx: CanvasRenderingContext2D) {
    const img = this._shapeImageEl;
    if (!this.shapeImageSrc || !img || !img.complete || img.naturalWidth === 0) {
      this._origRenderFill?.call(this, ctx);
      return;
    }

    ctx.save();
    if (this.fill) {
      this._origRenderFill?.call(this, ctx);
    }
    if (this.fillRule === 'evenodd') {
      ctx.clip('evenodd');
    } else {
      ctx.clip();
    }

    const rect = computeShapeImageDrawRect(
      this,
      img.naturalWidth || img.width,
      img.naturalHeight || img.height,
      {
        fit: this.shapeImageFit ?? 'cover',
        scale: this.shapeImageScale ?? 1,
        offsetX: this.shapeImageOffsetX ?? 0,
        offsetY: this.shapeImageOffsetY ?? 0,
      }
    );

    ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
  };
}

export async function applyShapeImageFill(
  shape: fabric.FabricObject,
  src: string,
  options: Partial<{
    fit: ShapeImageFit;
    scale: number;
    offsetX: number;
    offsetY: number;
  }> = {}
): Promise<void> {
  const meta = shape as ShapeWithImageMeta;
  const img = await loadHTMLImage(src);

  if (typeof shape.fill === 'string' && !meta.shapeImageSrc) {
    meta.shapeFillColor = shape.fill;
  }

  meta.shapeImageSrc = src;
  meta.shapeImageFit = options.fit ?? meta.shapeImageFit ?? 'cover';
  meta.shapeImageScale = options.scale ?? meta.shapeImageScale ?? 1;
  meta.shapeImageOffsetX = options.offsetX ?? meta.shapeImageOffsetX ?? 0;
  meta.shapeImageOffsetY = options.offsetY ?? meta.shapeImageOffsetY ?? 0;
  meta._shapeImageEl = img;

  attachShapeImageRenderer(meta);
  shape.set({ dirty: true });
  shape.setCoords();
}

export function refreshShapeImagePatternTransform(
  shape: fabric.FabricObject
): boolean {
  const meta = shape as ShapeWithImageMeta;
  if (!meta.shapeImageSrc) {
    return false;
  }
  attachShapeImageRenderer(meta);
  shape.dirty = true;
  return true;
}

export function clearShapeImageFill(shape: fabric.FabricObject): void {
  const meta = shape as ShapeWithImageMeta;
  const fallbackColor =
    typeof meta.shapeFillColor === 'string'
      ? meta.shapeFillColor
      : typeof shape.fill === 'string'
        ? shape.fill
        : '#ffffff';

  meta.shapeImageSrc = undefined;
  meta.shapeImageFit = undefined;
  meta.shapeImageScale = undefined;
  meta.shapeImageOffsetX = undefined;
  meta.shapeImageOffsetY = undefined;
  meta._shapeImageEl = undefined;

  if (meta._origRenderFill) {
    (
      shape as unknown as { _renderFill: (ctx: CanvasRenderingContext2D) => void }
    )._renderFill = meta._origRenderFill;
    meta._origRenderFill = undefined;
  }

  shape.set({
    fill: fallbackColor,
    dirty: true,
  });
  shape.setCoords();
}

export async function restoreShapeImageFills(
  canvas: fabric.StaticCanvas | fabric.Canvas
): Promise<void> {
  const shapes = canvas.getObjects().filter((obj) => {
    const meta = obj as ShapeWithImageMeta;
    return Boolean(meta.shapeKind && meta.shapeImageSrc);
  });
  if (shapes.length === 0) return;

  await Promise.all(
    shapes.map(async (obj) => {
      const meta = obj as ShapeWithImageMeta;
      if (!meta.shapeImageSrc) return;
      try {
        await applyShapeImageFill(obj, meta.shapeImageSrc, {
          fit: meta.shapeImageFit,
          scale: meta.shapeImageScale,
          offsetX: meta.shapeImageOffsetX,
          offsetY: meta.shapeImageOffsetY,
        });
      } catch {
        // Ignore broken image source during restore
      }
    })
  );
  canvas.requestRenderAll();
}
