import * as fabric from 'fabric';

export interface SafeZoneBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface ActiveSnapGuides {
  x: number | null;
  xKind: 'center' | 'safe' | null;
  y: number | null;
  yKind: 'center' | 'safe' | null;
  isDragging: boolean;
}

export interface ActiveRotationSnap {
  isRotating: boolean;
  angle: number;
  snapped: boolean;
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

export function snapObjectToGuides(
  obj: fabric.FabricObject,
  canvasWidth: number,
  canvasHeight: number
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

  const xCandidates: { delta: number; guide: number; kind: 'center' | 'safe' }[] = [
    { delta: centerX - objCenterX, guide: centerX, kind: 'center' },
    { delta: safe.left - objLeft, guide: safe.left, kind: 'safe' },
    { delta: safe.right - objRight, guide: safe.right, kind: 'safe' },
  ];

  const yCandidates: { delta: number; guide: number; kind: 'center' | 'safe' }[] = [
    { delta: centerY - objCenterY, guide: centerY, kind: 'center' },
    { delta: safe.top - objTop, guide: safe.top, kind: 'safe' },
    { delta: safe.bottom - objBottom, guide: safe.bottom, kind: 'safe' },
  ];

  let bestX: (typeof xCandidates)[number] | null = null;
  for (const c of xCandidates) {
    if (
      Math.abs(c.delta) <= SNAP_THRESHOLD &&
      (!bestX || Math.abs(c.delta) < Math.abs(bestX.delta))
    ) {
      bestX = c;
    }
  }

  let bestY: (typeof yCandidates)[number] | null = null;
  for (const c of yCandidates) {
    if (
      Math.abs(c.delta) <= SNAP_THRESHOLD &&
      (!bestY || Math.abs(c.delta) < Math.abs(bestY.delta))
    ) {
      bestY = c;
    }
  }

  if (bestX) {
    obj.set({ left: (obj.left ?? 0) + bestX.delta });
  }
  if (bestY) {
    obj.set({ top: (obj.top ?? 0) + bestY.delta });
  }

  if (bestX || bestY) {
    obj.setCoords();
  }

  return {
    x: bestX ? bestX.guide : null,
    xKind: bestX ? bestX.kind : null,
    y: bestY ? bestY.guide : null,
    yKind: bestY ? bestY.kind : null,
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
    topCtx.strokeStyle = guides.isDragging
      ? 'rgba(56, 189, 248, 0.42)'
      : 'rgba(255, 255, 255, 0.24)';
    topCtx.lineWidth = 2;
    topCtx.setLineDash([12, 10]);
    topCtx.strokeRect(safe.left, safe.top, safe.width, safe.height);

    if (showSafeAreaOverlay && !guides.isDragging) {
      topCtx.setLineDash([]);
      topCtx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      topCtx.font = '600 18px Inter, system-ui, sans-serif';
      topCtx.fillText('SAFE AREA', safe.left + 12, safe.top - 12);
    }
  }

  // Active magnetic snap lines
  topCtx.setLineDash([]);
  topCtx.lineWidth = 2.5;

  if (guides.x !== null) {
    topCtx.strokeStyle =
      guides.xKind === 'center' ? '#f472b6' : '#38bdf8';
    topCtx.beginPath();
    topCtx.moveTo(guides.x, 0);
    topCtx.lineTo(guides.x, height);
    topCtx.stroke();
  }

  if (guides.y !== null) {
    topCtx.strokeStyle =
      guides.yKind === 'center' ? '#f472b6' : '#38bdf8';
    topCtx.beginPath();
    topCtx.moveTo(0, guides.y);
    topCtx.lineTo(width, guides.y);
    topCtx.stroke();
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

