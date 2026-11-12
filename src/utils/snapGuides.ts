import * as fabric from 'fabric';

export interface SafeZoneBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export type SnapGuideKind = 'center' | 'safe' | 'edge' | 'element';

export interface ActiveSnapGuides {
  x: number | null;
  xKind: SnapGuideKind | null;
  xSpan?: [number, number] | null;
  y: number | null;
  yKind: SnapGuideKind | null;
  ySpan?: [number, number] | null;
  isDragging: boolean;
}

export interface ActiveRotationSnap {
  isRotating: boolean;
  angle: number;
  snapped: boolean;
}

interface SnapCandidate {
  delta: number;
  guide: number;
  kind: SnapGuideKind;
  spanStart?: number;
  spanEnd?: number;
}

const SNAP_THRESHOLD = 18;
const ROTATION_SNAP_ANGLES = [0, 45, 90, 180, 270, 360] as const;
const ROTATION_SNAP_THRESHOLD = 6;

export function getSafeZoneBounds(
  canvasWidth: number,
  canvasHeight: number
): SafeZoneBounds {
  const marginX = 64;
  const aspect = canvasHeight / Math.max(canvasWidth, 1);

  // Story (9:16) reserves taller top/bottom margins for Instagram UI overlays
  const marginY = aspect >= 1.5 ? 180 : aspect >= 1.15 ? 84 : 64;

  return {
    left: marginX,
    top: marginY,
    right: canvasWidth - marginX,
    bottom: canvasHeight - marginY,
    width: canvasWidth - marginX * 2,
    height: canvasHeight - marginY * 2,
  };
}

function pickBestCandidate(candidates: SnapCandidate[]): SnapCandidate | null {
  let best: SnapCandidate | null = null;
  for (const c of candidates) {
    if (
      Math.abs(c.delta) <= SNAP_THRESHOLD &&
      (!best || Math.abs(c.delta) < Math.abs(best.delta))
    ) {
      best = c;
    }
  }
  return best;
}

export function snapObjectToGuides(
  obj: fabric.FabricObject,
  canvasWidth: number,
  canvasHeight: number,
  canvasObjects: fabric.FabricObject[] = []
): ActiveSnapGuides {
  obj.setCoords();
  const rect = obj.getBoundingRect();
  const safe = getSafeZoneBounds(canvasWidth, canvasHeight);
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  const objLeft = rect.left;
  const objRight = rect.left + rect.width;
  const objCenterX = rect.left + rect.width / 2;

  const objTop = rect.top;
  const objBottom = rect.top + rect.height;
  const objCenterY = rect.top + rect.height / 2;

  const xCandidates: SnapCandidate[] = [
    { delta: centerX - objCenterX, guide: centerX, kind: 'center' },
    { delta: safe.left - objLeft, guide: safe.left, kind: 'safe' },
    { delta: safe.right - objRight, guide: safe.right, kind: 'safe' },
    { delta: 0 - objLeft, guide: 0, kind: 'edge' },
    { delta: canvasWidth - objRight, guide: canvasWidth, kind: 'edge' },
  ];

  const yCandidates: SnapCandidate[] = [
    { delta: centerY - objCenterY, guide: centerY, kind: 'center' },
    { delta: safe.top - objTop, guide: safe.top, kind: 'safe' },
    { delta: safe.bottom - objBottom, guide: safe.bottom, kind: 'safe' },
    { delta: 0 - objTop, guide: 0, kind: 'edge' },
    { delta: canvasHeight - objBottom, guide: canvasHeight, kind: 'edge' },
  ];

  const selectedChildren =
    obj instanceof fabric.ActiveSelection ? new Set(obj.getObjects()) : null;

  for (const other of canvasObjects) {
    if (
      other === obj ||
      other.visible === false ||
      (selectedChildren && selectedChildren.has(other))
    ) {
      continue;
    }
    other.setCoords();
    const oRect = other.getBoundingRect();
    if (oRect.width <= 0 || oRect.height <= 0) continue;

    const oLeft = oRect.left;
    const oRight = oRect.left + oRect.width;
    const oCenterX = oLeft + oRect.width / 2;
    const oTop = oRect.top;
    const oBottom = oRect.top + oRect.height;
    const oCenterY = oTop + oRect.height / 2;

    xCandidates.push(
      { delta: oCenterX - objCenterX, guide: oCenterX, kind: 'element', spanStart: oTop, spanEnd: oBottom },
      { delta: oLeft - objLeft, guide: oLeft, kind: 'element', spanStart: oTop, spanEnd: oBottom },
      { delta: oRight - objRight, guide: oRight, kind: 'element', spanStart: oTop, spanEnd: oBottom },
      { delta: oRight - objLeft, guide: oRight, kind: 'element', spanStart: oTop, spanEnd: oBottom },
      { delta: oLeft - objRight, guide: oLeft, kind: 'element', spanStart: oTop, spanEnd: oBottom }
    );

    yCandidates.push(
      { delta: oCenterY - objCenterY, guide: oCenterY, kind: 'element', spanStart: oLeft, spanEnd: oRight },
      { delta: oTop - objTop, guide: oTop, kind: 'element', spanStart: oLeft, spanEnd: oRight },
      { delta: oBottom - objBottom, guide: oBottom, kind: 'element', spanStart: oLeft, spanEnd: oRight },
      { delta: oBottom - objTop, guide: oBottom, kind: 'element', spanStart: oLeft, spanEnd: oRight },
      { delta: oTop - objBottom, guide: oTop, kind: 'element', spanStart: oLeft, spanEnd: oRight }
    );
  }

  const bestX = pickBestCandidate(xCandidates);
  const bestY = pickBestCandidate(yCandidates);

  if (bestX) {
    obj.set({ left: (obj.left ?? 0) + bestX.delta });
  }
  if (bestY) {
    obj.set({ top: (obj.top ?? 0) + bestY.delta });
  }

  if (bestX || bestY) {
    obj.setCoords();
  }

  const finalRect = bestX || bestY ? obj.getBoundingRect() : rect;
  const finalTop = finalRect.top;
  const finalBottom = finalRect.top + finalRect.height;
  const finalLeft = finalRect.left;
  const finalRight = finalRect.left + finalRect.width;

  let xSpan: [number, number] | null = null;
  if (bestX && bestX.kind === 'element') {
    let minY = finalTop;
    let maxY = finalBottom;
    for (const c of xCandidates) {
      if (
        c.kind === 'element' &&
        Math.abs(c.guide - bestX.guide) <= 0.5 &&
        c.spanStart !== undefined &&
        c.spanEnd !== undefined
      ) {
        minY = Math.min(minY, c.spanStart);
        maxY = Math.max(maxY, c.spanEnd);
      }
    }
    xSpan = [Math.max(0, minY - 16), Math.min(canvasHeight, maxY + 16)];
  }

  let ySpan: [number, number] | null = null;
  if (bestY && bestY.kind === 'element') {
    let minX = finalLeft;
    let maxX = finalRight;
    for (const c of yCandidates) {
      if (
        c.kind === 'element' &&
        Math.abs(c.guide - bestY.guide) <= 0.5 &&
        c.spanStart !== undefined &&
        c.spanEnd !== undefined
      ) {
        minX = Math.min(minX, c.spanStart);
        maxX = Math.max(maxX, c.spanEnd);
      }
    }
    ySpan = [Math.max(0, minX - 16), Math.min(canvasWidth, maxX + 16)];
  }

  return {
    x: bestX ? bestX.guide : null,
    xKind: bestX ? bestX.kind : null,
    xSpan,
    y: bestY ? bestY.guide : null,
    yKind: bestY ? bestY.kind : null,
    ySpan,
    isDragging: true,
  };
}

export function snapRotationAngle(obj: fabric.FabricObject): ActiveRotationSnap {
  const raw = (((obj.angle ?? 0) % 360) + 360) % 360;
  let closestTarget: number | null = null;
  let minDiff = Infinity;

  for (const target of ROTATION_SNAP_ANGLES) {
    const diff = Math.abs(raw - target);
    if (diff <= ROTATION_SNAP_THRESHOLD && diff < minDiff) {
      minDiff = diff;
      closestTarget = target;
    }
  }

  if (closestTarget !== null) {
    const canonicalAngle = closestTarget === 360 ? 0 : closestTarget;
    if (obj.angle !== canonicalAngle) {
      obj.rotate(canonicalAngle);
      obj.setCoords();
    }
    return {
      isRotating: true,
      angle: closestTarget,
      snapped: true,
    };
  }

  return {
    isRotating: true,
    angle: Math.round(raw),
    snapped: false,
  };
}

export function renderGuidesOnTopContext(
  canvas: fabric.Canvas,
  guides: ActiveSnapGuides,
  showSafeAreaOverlay: boolean,
  rotationSnap?: ActiveRotationSnap
): void {
  const topCtx = canvas.contextTop;
  if (!topCtx) return;

  // Never wipe active marquee selection box if user is box-selecting
  const hasGroupSelector = Boolean(
    (canvas as unknown as { _groupSelector?: unknown })._groupSelector
  );
  if (!canvas.isDrawingMode && !hasGroupSelector) {
    canvas.clearContext(topCtx);
  }

  const isRotating = Boolean(rotationSnap?.isRotating);
  if (!guides.isDragging && !showSafeAreaOverlay && !isRotating) {
    return;
  }

  const width = canvas.width || 1080;
  const height = canvas.height || 1920;
  const safe = getSafeZoneBounds(width, height);

  topCtx.save();

  // Safe area boundary box (faint dashed outline)
  if (showSafeAreaOverlay || guides.isDragging) {
    topCtx.save();
    topCtx.strokeStyle = guides.isDragging
      ? 'rgba(125, 211, 252, 0.55)'
      : 'rgba(255, 255, 255, 0.24)';
    topCtx.lineWidth = guides.isDragging ? 3 : 2;
    topCtx.setLineDash([12, 10]);
    if (guides.isDragging) {
      topCtx.shadowColor = 'rgba(0, 0, 0, 0.28)';
      topCtx.shadowBlur = 4;
      topCtx.shadowOffsetX = 0;
      topCtx.shadowOffsetY = 1;
    }
    topCtx.strokeRect(safe.left, safe.top, safe.width, safe.height);
    topCtx.restore();

    if (showSafeAreaOverlay && !guides.isDragging) {
      topCtx.setLineDash([]);
      topCtx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      topCtx.font = '600 18px Inter, system-ui, sans-serif';
      topCtx.fillText('SAFE AREA', safe.left + 12, safe.top - 12);
    }
  }

  // Active magnetic snap lines
  if (guides.x !== null || guides.y !== null) {
    topCtx.save();
    topCtx.setLineDash([]);
    topCtx.lineWidth = 3.5;
    topCtx.shadowColor = 'rgba(0, 0, 0, 0.42)';
    topCtx.shadowBlur = 6;
    topCtx.shadowOffsetX = 0;
    topCtx.shadowOffsetY = 2;

    if (guides.x !== null) {
      const isElementGuide = guides.xKind === 'element';
      topCtx.strokeStyle = isElementGuide ? '#f472b6' : '#7dd3fc';
      const drawX =
        guides.xKind === 'edge'
          ? guides.x === 0
            ? 2
            : guides.x === width
              ? width - 2
              : guides.x
          : guides.x;
      const [yStart, yEnd] =
        isElementGuide && guides.xSpan ? guides.xSpan : [0, height];

      topCtx.beginPath();
      topCtx.moveTo(drawX, yStart);
      topCtx.lineTo(drawX, yEnd);
      topCtx.stroke();
    }

    if (guides.y !== null) {
      const isElementGuide = guides.yKind === 'element';
      topCtx.strokeStyle = isElementGuide ? '#f472b6' : '#7dd3fc';
      const drawY =
        guides.yKind === 'edge'
          ? guides.y === 0
            ? 2
            : guides.y === height
              ? height - 2
              : guides.y
          : guides.y;
      const [xStart, xEnd] =
        isElementGuide && guides.ySpan ? guides.ySpan : [0, width];

      topCtx.beginPath();
      topCtx.moveTo(xStart, drawY);
      topCtx.lineTo(xEnd, drawY);
      topCtx.stroke();
    }
    topCtx.restore();
  }

  // Rotation angle badge HUD on contextTop when rotating
  if (rotationSnap?.isRotating) {
    const label = `${rotationSnap.angle}°`;
    const boxW = 92;
    const boxH = 42;
    const boxX = width / 2 - boxW / 2;
    const boxY = 36;

    topCtx.fillStyle = rotationSnap.snapped
      ? 'rgba(14, 116, 144, 0.9)'
      : 'rgba(24, 24, 27, 0.88)';
    topCtx.strokeStyle = rotationSnap.snapped
      ? '#38bdf8'
      : 'rgba(161, 161, 170, 0.45)';
    topCtx.lineWidth = 2;
    topCtx.beginPath();
    topCtx.roundRect(boxX, boxY, boxW, boxH, 14);
    topCtx.fill();
    topCtx.stroke();

    topCtx.fillStyle = '#ffffff';
    topCtx.font = '700 22px Inter, system-ui, sans-serif';
    topCtx.textAlign = 'center';
    topCtx.textBaseline = 'middle';
    topCtx.fillText(label, width / 2, boxY + boxH / 2 + 1);
  }

  topCtx.restore();
}
