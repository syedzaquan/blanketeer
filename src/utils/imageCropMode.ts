import * as fabric from 'fabric';
import type { CropAspectRatio, CutoutShape } from '../types/editor';
import { applyCutoutMask, type ImageWithCutoutMeta } from './imageCutouts';

export interface ActiveCropSession {
  target: fabric.FabricImage;
  ghost: fabric.FabricImage;
  cropRect: fabric.Rect;
  fullCenter: { x: number; y: number };
  fullVisualW: number;
  fullVisualH: number;
  natW: number;
  natH: number;
  sx: number;
  sy: number;
  angle: number;
  aspectRatio: CropAspectRatio;
  snapshot: {
    cropX: number;
    cropY: number;
    width: number;
    height: number;
    left: number;
    top: number;
    originX: fabric.TOriginX;
    originY: fabric.TOriginY;
    cutoutShape?: CutoutShape;
    cutoutRadius?: number;
  };
}

function rotateVec(x: number, y: number, deg: number): { x: number; y: number } {
  if (!deg) return { x, y };
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function getCropRatioValue(ratio: CropAspectRatio): number | null {
  switch (ratio) {
    case '1:1':
      return 1;
    case '4:5':
      return 4 / 5;
    case '5:4':
      return 5 / 4;
    case '9:16':
      return 9 / 16;
    case '16:9':
      return 16 / 9;
    case 'free':
    default:
      return null;
  }
}

export function beginImageCropSession(
  canvas: fabric.Canvas,
  target: fabric.FabricImage
): ActiveCropSession {
  const orig = target.getOriginalSize();
  const natW = Math.max(1, orig.width || target.width || 1);
  const natH = Math.max(1, orig.height || target.height || 1);
  const cropX = target.cropX ?? 0;
  const cropY = target.cropY ?? 0;
  const cropW = Math.max(1, target.width || natW);
  const cropH = Math.max(1, target.height || natH);
  const sx = Math.abs(target.scaleX ?? 1) || 1;
  const sy = Math.abs(target.scaleY ?? 1) || 1;
  const angle = target.angle || 0;
  const meta = target as ImageWithCutoutMeta;

  const cropCenter = target.getCenterPoint();
  const offsetLocalX =
    (cropX + cropW / 2 - natW / 2) * sx * (target.flipX ? -1 : 1);
  const offsetLocalY =
    (cropY + cropH / 2 - natH / 2) * sy * (target.flipY ? -1 : 1);
  const rotatedOffset = rotateVec(offsetLocalX, offsetLocalY, angle);
  const fullCenter = {
    x: cropCenter.x - rotatedOffset.x,
    y: cropCenter.y - rotatedOffset.y,
  };

  const fullVisualW = natW * sx;
  const fullVisualH = natH * sy;

  const ghost = new fabric.FabricImage(target.getElement(), {
    left: fullCenter.x,
    top: fullCenter.y,
    originX: 'center',
    originY: 'center',
    cropX: 0,
    cropY: 0,
    width: natW,
    height: natH,
    scaleX: target.scaleX,
    scaleY: target.scaleY,
    angle,
    flipX: Boolean(target.flipX),
    flipY: Boolean(target.flipY),
    opacity: 0.35,
    selectable: false,
    evented: false,
    excludeFromExport: true,
  });
  (ghost as unknown as { isCropOverlay?: boolean }).isCropOverlay = true;

  const cropRect = new fabric.Rect({
    left: cropCenter.x,
    top: cropCenter.y,
    originX: 'center',
    originY: 'center',
    width: cropW * sx,
    height: cropH * sy,
    scaleX: 1,
    scaleY: 1,
    angle,
    fill: 'rgba(255, 255, 255, 0.001)',
    stroke: '#38bdf8',
    strokeWidth: 3,
    strokeUniform: true,
    borderColor: '#38bdf8',
    cornerColor: '#ffffff',
    cornerStrokeColor: '#0284c7',
    cornerStyle: 'circle',
    cornerSize: 14,
    transparentCorners: false,
    hasRotatingPoint: false,
    lockRotation: true,
    lockScalingFlip: true,
    excludeFromExport: true,
  });
  cropRect.setControlVisible('mtr', false);
  (cropRect as unknown as { isCropOverlay?: boolean }).isCropOverlay = true;

  const snapshot = {
    cropX,
    cropY,
    width: cropW,
    height: cropH,
    left: target.left ?? cropCenter.x,
    top: target.top ?? cropCenter.y,
    originX: target.originX,
    originY: target.originY,
    cutoutShape: meta.cutoutShape,
    cutoutRadius: meta.cutoutRadius,
  };

  target.set({ selectable: false, evented: false });

  const targetIdx = canvas.getObjects().indexOf(target);
  canvas.insertAt(Math.max(0, targetIdx), ghost);
  canvas.add(cropRect);
  canvas.setActiveObject(cropRect);
  canvas.requestRenderAll();

  return {
    target,
    ghost,
    cropRect,
    fullCenter,
    fullVisualW,
    fullVisualH,
    natW,
    natH,
    sx,
    sy,
    angle,
    aspectRatio: 'free',
    snapshot,
  };
}

export function syncCropSessionFromRect(session: ActiveCropSession): void {
  const {
    target,
    cropRect,
    fullCenter,
    fullVisualW,
    fullVisualH,
    natW,
    natH,
    sx,
    sy,
    angle,
    aspectRatio,
    snapshot,
  } = session;

  const minDim = 24;
  let rectW = Math.max(minDim, (cropRect.width || minDim) * (cropRect.scaleX || 1));
  let rectH = Math.max(minDim, (cropRect.height || minDim) * (cropRect.scaleY || 1));

  const lockedRatio = getCropRatioValue(aspectRatio);
  if (lockedRatio) {
    if (rectW / rectH > lockedRatio) {
      rectW = rectH * lockedRatio;
    } else {
      rectH = rectW / lockedRatio;
    }
    if (rectW > fullVisualW) {
      rectW = fullVisualW;
      rectH = rectW / lockedRatio;
    }
    if (rectH > fullVisualH) {
      rectH = fullVisualH;
      rectW = rectH * lockedRatio;
    }
  } else {
    rectW = Math.min(rectW, fullVisualW);
    rectH = Math.min(rectH, fullVisualH);
  }

  const center = cropRect.getCenterPoint();
  const rel = rotateVec(
    center.x - fullCenter.x,
    center.y - fullCenter.y,
    -angle
  );
  const maxDX = Math.max(0, (fullVisualW - rectW) / 2);
  const maxDY = Math.max(0, (fullVisualH - rectH) / 2);
  const clampedRelX = clamp(rel.x, -maxDX, maxDX);
  const clampedRelY = clamp(rel.y, -maxDY, maxDY);
  const rotatedBack = rotateVec(clampedRelX, clampedRelY, angle);
  const clampedCenter = {
    x: fullCenter.x + rotatedBack.x,
    y: fullCenter.y + rotatedBack.y,
  };

  cropRect.set({
    width: rectW,
    height: rectH,
    scaleX: 1,
    scaleY: 1,
    left: clampedCenter.x,
    top: clampedCenter.y,
    originX: 'center',
    originY: 'center',
  });
  cropRect.setCoords();

  const visLeftInFull = clampedRelX - rectW / 2 + fullVisualW / 2;
  const visTopInFull = clampedRelY - rectH / 2 + fullVisualH / 2;
  const cropW = clamp(rectW / sx, 1, natW);
  const cropH = clamp(rectH / sy, 1, natH);
  const rawCropX = clamp(visLeftInFull / sx, 0, Math.max(0, natW - cropW));
  const rawCropY = clamp(visTopInFull / sy, 0, Math.max(0, natH - cropH));

  const cropX = target.flipX
    ? Math.max(0, natW - rawCropX - cropW)
    : rawCropX;
  const cropY = target.flipY
    ? Math.max(0, natH - rawCropY - cropH)
    : rawCropY;

  target.set({
    cropX,
    cropY,
    width: cropW,
    height: cropH,
    left: clampedCenter.x,
    top: clampedCenter.y,
    originX: 'center',
    originY: 'center',
    dirty: true,
  });
  if (snapshot.cutoutShape && snapshot.cutoutShape !== 'none') {
    applyCutoutMask(target, snapshot.cutoutShape, snapshot.cutoutRadius ?? 16);
  }
  target.setCoords();
}

export function applyCropAspectRatio(
  session: ActiveCropSession,
  ratio: CropAspectRatio
): void {
  session.aspectRatio = ratio;
  const { cropRect, fullVisualW, fullVisualH } = session;
  const ratioVal = getCropRatioValue(ratio);

  const isFree = ratioVal === null;
  cropRect.set({
    lockUniScaling: !isFree,
  });
  cropRect.setControlVisible('ml', isFree);
  cropRect.setControlVisible('mr', isFree);
  cropRect.setControlVisible('mt', isFree);
  cropRect.setControlVisible('mb', isFree);

  if (ratioVal !== null) {
    const currentW = cropRect.width || fullVisualW;
    const currentH = cropRect.height || fullVisualH;
    const area = currentW * currentH;
    let nextW = Math.sqrt(area * ratioVal);
    let nextH = nextW / ratioVal;

    if (nextW > fullVisualW) {
      nextW = fullVisualW;
      nextH = nextW / ratioVal;
    }
    if (nextH > fullVisualH) {
      nextH = fullVisualH;
      nextW = nextH * ratioVal;
    }
    cropRect.set({
      width: Math.max(24, nextW),
      height: Math.max(24, nextH),
      scaleX: 1,
      scaleY: 1,
    });
  }

  syncCropSessionFromRect(session);
}

export function endImageCropSession(
  canvas: fabric.Canvas,
  session: ActiveCropSession,
  commit: boolean
): void {
  const { target, ghost, cropRect, snapshot } = session;
  if (!commit) {
    target.set({
      cropX: snapshot.cropX,
      cropY: snapshot.cropY,
      width: snapshot.width,
      height: snapshot.height,
      left: snapshot.left,
      top: snapshot.top,
      originX: snapshot.originX,
      originY: snapshot.originY,
      dirty: true,
    });
    if (snapshot.cutoutShape && snapshot.cutoutShape !== 'none') {
      applyCutoutMask(target, snapshot.cutoutShape, snapshot.cutoutRadius ?? 16);
    }
    target.setCoords();
  }

  canvas.remove(cropRect);
  canvas.remove(ghost);
  target.set({ selectable: true, evented: true });
  canvas.setActiveObject(target);
  canvas.requestRenderAll();
}

