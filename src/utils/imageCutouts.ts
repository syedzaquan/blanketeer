import * as fabric from 'fabric';
import type { CutoutShape } from '../types/editor';

export interface ImageWithCutoutMeta extends fabric.FabricImage {
  editorId?: string;
  editorName?: string;
  cutoutShape?: CutoutShape;
  cutoutRadius?: number;
  locked?: boolean;
}

export const applyCircleMask = (image: fabric.FabricImage): void => {
  const radius = Math.min(image.width, image.height) / 2;
  const circle = new fabric.Circle({
    radius,
    left: 0,
    top: 0,
    originX: 'center',
    originY: 'center',
  });
  image.clipPath = circle;
  image.dirty = true;
};

export const applySquareMask = (image: fabric.FabricImage): void => {
  const side = Math.min(image.width, image.height);
  const rect = new fabric.Rect({
    width: side,
    height: side,
    left: 0,
    top: 0,
    originX: 'center',
    originY: 'center',
  });
  image.clipPath = rect;
  image.dirty = true;
};

export const applyRoundedRectMask = (
  image: fabric.FabricImage,
  cornerPercent = 16
): void => {
  const minDim = Math.min(image.width, image.height);
  const radius = Math.min((minDim * cornerPercent) / 100, minDim / 2);
  const rect = new fabric.Rect({
    width: image.width,
    height: image.height,
    rx: radius,
    ry: radius,
    left: 0,
    top: 0,
    originX: 'center',
    originY: 'center',
  });
  image.clipPath = rect;
  image.dirty = true;
};

export const applyStarMask = (image: fabric.FabricImage): void => {
  const minDim = Math.min(image.width, image.height);
  const outerRadius = minDim * 0.48;
  const innerRadius = outerRadius * 0.42;
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
    });
  }

  const star = new fabric.Polygon(points, {
    left: 0,
    top: 0,
    originX: 'center',
    originY: 'center',
  });
  image.clipPath = star;
  image.dirty = true;
};

export const applyHeartMask = (image: fabric.FabricImage): void => {
  const minDim = Math.min(image.width, image.height);
  // Crisp symmetric SVG heart in a 100x100 viewBox
  const heartPathData =
    'M 50 88 C 50 88 8 62 8 31 C 8 15 21 5 34 5 C 43 5 48 10 50 15 C 52 10 57 5 66 5 C 79 5 92 15 92 31 C 92 62 50 88 50 88 Z';
  const heart = new fabric.Path(heartPathData, {
    left: 0,
    top: 0,
    originX: 'center',
    originY: 'center',
  });

  const maxSpan = Math.max(heart.width || 100, heart.height || 100);
  const scale = (minDim * 0.94) / maxSpan;
  heart.scale(scale);

  image.clipPath = heart;
  image.dirty = true;
};

export const applyCutoutMask = (
  image: fabric.FabricImage,
  shape: CutoutShape,
  cornerPercent = 16
): void => {
  const metaImage = image as ImageWithCutoutMeta;
  metaImage.cutoutShape = shape;
  metaImage.cutoutRadius = cornerPercent;

  switch (shape) {
    case 'none':
      image.clipPath = undefined;
      image.dirty = true;
      break;
    case 'circle':
      applyCircleMask(image);
      break;
    case 'square':
      applySquareMask(image);
      break;
    case 'rounded':
      applyRoundedRectMask(image, cornerPercent);
      break;
    case 'star':
      applyStarMask(image);
      break;
    case 'heart':
      applyHeartMask(image);
      break;
  }

  image.setCoords();
};

