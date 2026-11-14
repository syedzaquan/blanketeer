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
  const marginX = 44;
  const aspect = canvasHeight / Math.max(canvasWidth, 1);

  // Story (9:16) reserves taller top/bottom margins for Instagram UI overlays
  const marginY = aspect >= 1.5 ? 130 : aspect >= 1.15 ? 60 : 44;

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

interface GuideTarget {
  guide: number;
  kind: SnapGuideKind;
  spanStart?: number;
  spanEnd?: number;
}

function collectGuideTargets(
  obj: fabric.FabricObject,
  canvasWidth: number,
  canvasHeight: number,
  canvasObjects: fabric.FabricObject[]
): { xTargets: GuideTarget[]; yTargets: GuideTarget[] } {
  const safe = getSafeZoneBounds(canvasWidth, canvasHeight);
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  const xTargets: GuideTarget[] = [
    { guide: centerX, kind: 'center' },
    { guide: safe.left, kind: 'safe' },
    { guide: safe.right, kind: 'safe' },
    { guide: 0, kind: 'edge' },
    { guide: canvasWidth, kind: 'edge' },
  ];

  const yTargets: GuideTarget[] = [
    { guide: centerY, kind: 'center' },
    { guide: safe.top, kind: 'safe' },
    { guide: safe.bottom, kind: 'safe' },
    { guide: 0, kind: 'edge' },
    { guide: canvasHeight, kind: 'edge' },
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

    xTargets.push(
      { guide: oCenterX, kind: 'element', spanStart: oTop, spanEnd: oBottom },
      { guide: oLeft, kind: 'element', spanStart: oTop, spanEnd: oBottom },
      { guide: oRight, kind: 'element', spanStart: oTop, spanEnd: oBottom }
    );

    yTargets.push(
      { guide: oCenterY, kind: 'element', spanStart: oLeft, spanEnd: oRight },
      { guide: oTop, kind: 'element', spanStart: oLeft, spanEnd: oRight },
      { guide: oBottom, kind: 'element', spanStart: oLeft, spanEnd: oRight }
    );
  }

  return { xTargets, yTargets };
}

function buildElementSpan(
  best: SnapCandidate | null,
  targets: GuideTarget[],
  objStart: number,
  objEnd: number,
  maxCoord: number
): [number, number] | null {
  if (!best || best.kind !== 'element') return null;
  let minSpan = objStart;
  let maxSpan = objEnd;
  for (const t of targets) {
    if (
      t.kind === 'element' &&
      Math.abs(t.guide - best.guide) <= 0.5 &&
      t.spanStart !== undefined &&
      t.spanEnd !== undefined
    ) {
      minSpan = Math.min(minSpan, t.spanStart);
      maxSpan = Math.max(maxSpan, t.spanEnd);
    }
  }
  return [Math.max(0, minSpan - 16), Math.min(maxCoord, maxSpan + 16)];
}

export function snapObjectToGuides(
  obj: fabric.FabricObject,
  canvasWidth: number,
  canvasHeight: number,
  canvasObjects: fabric.FabricObject[] = []
): ActiveSnapGuides {
  obj.setCoords();
  const rect = obj.getBoundingRect();
  const { xTargets, yTargets } = collectGuideTargets(
    obj,
    canvasWidth,
    canvasHeight,
    canvasObjects
  );

  const objLeft = rect.left;
  const objRight = rect.left + rect.width;
  const objCenterX = rect.left + rect.width / 2;

  const objTop = rect.top;
  const objBottom = rect.top + rect.height;
  const objCenterY = rect.top + rect.height / 2;

  const xCandidates: SnapCandidate[] = [];
  for (const t of xTargets) {
    if (t.kind === 'center') {
      xCandidates.push({ delta: t.guide - objCenterX, ...t });
    } else if (t.kind === 'safe') {
      xCandidates.push(
        { delta: t.guide - objLeft, ...t },
        { delta: t.guide - objRight, ...t }
      );
    } else if (t.kind === 'edge') {
      xCandidates.push(
        { delta: t.guide - objLeft, ...t },
        { delta: t.guide - objRight, ...t }
      );
    } else {
      xCandidates.push(
        { delta: t.guide - objCenterX, ...t },
        { delta: t.guide - objLeft, ...t },
        { delta: t.guide - objRight, ...t }
      );
    }
  }

  const yCandidates: SnapCandidate[] = [];
  for (const t of yTargets) {
    if (t.kind === 'center') {
      yCandidates.push({ delta: t.guide - objCenterY, ...t });
    } else if (t.kind === 'safe' || t.kind === 'edge') {
      yCandidates.push(
        { delta: t.guide - objTop, ...t },
        { delta: t.guide - objBottom, ...t }
      );
    } else {
      yCandidates.push(
        { delta: t.guide - objCenterY, ...t },
        { delta: t.guide - objTop, ...t },
        { delta: t.guide - objBottom, ...t }
      );
    }
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

  return {
    x: bestX ? bestX.guide : null,
    xKind: bestX ? bestX.kind : null,
    xSpan: buildElementSpan(
      bestX,
      xTargets,
      finalRect.top,
      finalRect.top + finalRect.height,
      canvasHeight
    ),
    y: bestY ? bestY.guide : null,
    yKind: bestY ? bestY.kind : null,
    ySpan: buildElementSpan(
      bestY,
      yTargets,
      finalRect.left,
      finalRect.left + finalRect.width,
      canvasWidth
    ),
    isDragging: true,
  };
}

export interface ResizeSnapTransform {
  corner?: string;
  action?: string;
  original?: {
    scaleX?: number;
    scaleY?: number;
  };
}

export function snapObjectResizeToGuides(
  obj: fabric.FabricObject,
  transform: ResizeSnapTransform | undefined,
  canvasWidth: number,
  canvasHeight: number,
  canvasObjects: fabric.FabricObject[] = [],
  mode: 'scaling' | 'resizing' = 'scaling'
): ActiveSnapGuides {
  obj.setCoords();
  const rect = obj.getBoundingRect();
  const corner = transform?.corner || '';
  const movesLeft = corner.includes('l');
  const movesRight = corner.includes('r');
  const movesTop = corner.includes('t');
  const movesBottom = corner.includes('b');

  if (!movesLeft && !movesRight && !movesTop && !movesBottom) {
    return {
      x: null,
      xKind: null,
      y: null,
      yKind: null,
      isDragging: false,
    };
  }

  const { xTargets, yTargets } = collectGuideTargets(
    obj,
    canvasWidth,
    canvasHeight,
    canvasObjects
  );

  const objLeft = rect.left;
  const objRight = rect.left + rect.width;
  const objTop = rect.top;
  const objBottom = rect.top + rect.height;

  const xCandidates: SnapCandidate[] = [];
  if (movesLeft || movesRight) {
    const edgeX = movesRight ? objRight : objLeft;
    for (const t of xTargets) {
      xCandidates.push({ delta: t.guide - edgeX, ...t });
    }
  }

  const yCandidates: SnapCandidate[] = [];
  if (movesTop || movesBottom) {
    const edgeY = movesBottom ? objBottom : objTop;
    for (const t of yTargets) {
      yCandidates.push({ delta: t.guide - edgeY, ...t });
    }
  }

  let bestX = pickBestCandidate(xCandidates);
  let bestY = pickBestCandidate(yCandidates);

  if (mode === 'resizing') {
    if (bestX && (movesLeft || movesRight)) {
      const anchorX = movesRight ? objLeft : objRight;
      const sx = Math.max(0.01, Math.abs(obj.scaleX || 1));
      const widthDelta = movesRight ? bestX.delta : -bestX.delta;
      const nextWidth = Math.max(20, (obj.width || 20) + widthDelta / sx);
      obj.set({ width: nextWidth });
      obj.setCoords();
      const after = obj.getBoundingRect();
      const afterAnchorX = movesRight ? after.left : after.left + after.width;
      obj.set({ left: (obj.left ?? 0) + (anchorX - afterAnchorX) });
      obj.setCoords();
    }
  } else if (bestX || bestY) {
    const isCorner = (movesLeft || movesRight) && (movesTop || movesBottom);
    const origSX = Math.max(0.001, Math.abs(transform?.original?.scaleX ?? obj.scaleX ?? 1));
    const origSY = Math.max(0.001, Math.abs(transform?.original?.scaleY ?? obj.scaleY ?? 1));
    const ratioX = Math.abs(obj.scaleX || 1) / origSX;
    const ratioY = Math.abs(obj.scaleY || 1) / origSY;
    const isUniformScale =
      isCorner &&
      (obj instanceof fabric.Textbox || Math.abs(ratioX - ratioY) < 0.01);

    let factorX = bestX
      ? Math.max(0.05, (rect.width + (movesRight ? bestX.delta : -bestX.delta)) / Math.max(1, rect.width))
      : 1;
    let factorY = bestY
      ? Math.max(0.05, (rect.height + (movesBottom ? bestY.delta : -bestY.delta)) / Math.max(1, rect.height))
      : 1;

    if (isUniformScale) {
      if (bestX && bestY) {
        if (Math.abs(bestX.delta) <= Math.abs(bestY.delta)) {
          factorY = factorX;
          bestY = null;
        } else {
          factorX = factorY;
          bestX = null;
        }
      } else if (bestX) {
        factorY = factorX;
      } else if (bestY) {
        factorX = factorY;
      }
    }

    const anchorX = movesRight
      ? objLeft
      : movesLeft
        ? objRight
        : objLeft + rect.width / 2;
    const anchorY = movesBottom
      ? objTop
      : movesTop
        ? objBottom
        : objTop + rect.height / 2;

    obj.set({
      scaleX: (obj.scaleX || 1) * factorX,
      scaleY: (obj.scaleY || 1) * factorY,
    });
    obj.setCoords();

    const after = obj.getBoundingRect();
    const afterAnchorX = movesRight
      ? after.left
      : movesLeft
        ? after.left + after.width
        : after.left + after.width / 2;
    const afterAnchorY = movesBottom
      ? after.top
      : movesTop
        ? after.top + after.height
        : after.top + after.height / 2;

    obj.set({
      left: (obj.left ?? 0) + (anchorX - afterAnchorX),
      top: (obj.top ?? 0) + (anchorY - afterAnchorY),
    });
    obj.setCoords();
  }

  const finalRect = bestX || bestY ? obj.getBoundingRect() : rect;

  return {
    x: bestX ? bestX.guide : null,
    xKind: bestX ? bestX.kind : null,
    xSpan: buildElementSpan(
      bestX,
      xTargets,
      finalRect.top,
      finalRect.top + finalRect.height,
      canvasHeight
    ),
    y: bestY ? bestY.guide : null,
    yKind: bestY ? bestY.kind : null,
    ySpan: buildElementSpan(
      bestY,
      yTargets,
      finalRect.left,
      finalRect.left + finalRect.width,
      canvasWidth
    ),
    isDragging: Boolean(bestX || bestY),
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
