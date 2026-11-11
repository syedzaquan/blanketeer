import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
  type RefObject,
} from 'react';
import { ImagePlus, Minus, Plus, RotateCcw, Scan } from 'lucide-react';
import { useWindowSize } from '../hooks/useWindowSize';
import { cn } from '../utils/cn';
import { MobileFontSizeSlider } from './MobileFontSizeSlider';

interface CanvasViewportProps {
  canvasElRef: RefObject<HTMLCanvasElement | null>;
  canvasWidth: number;
  canvasHeight: number;
  showSafeArea: boolean;
  selectedTextFontSize?: number | null;
  onChangeTextFontSize?: (size: number) => void;
  onToggleSafeArea: () => void;
  onDeselectAll: () => void;
  onDropImageFile: (file: File) => void;
  onRecalculateOffset: () => void;
  onCancelPointerAction?: () => void;
  onBeginObjectPinch?: (
    touch1: { x: number; y: number },
    touch2: { x: number; y: number }
  ) => boolean;
  onUpdateObjectPinch?: (
    touch1: { x: number; y: number },
    touch2: { x: number; y: number }
  ) => void;
  onEndObjectPinch?: () => void;
}

const MIN_ZOOM_FACTOR = 0.4;
const MAX_ZOOM_FACTOR = 4;
const ZOOM_BUTTON_STEP = 0.25;

const clampZoomFactor = (value: number): number =>
  Math.min(MAX_ZOOM_FACTOR, Math.max(MIN_ZOOM_FACTOR, Number(value.toFixed(3))));

const calculateFitScale = (
  containerWidth: number,
  containerHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  isDesktop: boolean
): number => {
  const paddingX = isDesktop ? 64 : 24;
  const paddingY = isDesktop ? 104 : 28;
  const availableWidth = Math.max(containerWidth - paddingX, 120);
  const availableHeight = Math.max(containerHeight - paddingY, 120);
  return Math.min(availableWidth / canvasWidth, availableHeight / canvasHeight, 1);
};

function clampPan(
  panX: number,
  panY: number,
  zoomFactor: number,
  scaledWidth: number,
  scaledHeight: number,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number } {
  if (zoomFactor <= 1) {
    return { x: 0, y: 0 };
  }
  const maxX = Math.max(60, (scaledWidth - containerWidth) / 2 + 96);
  const maxY = Math.max(60, (scaledHeight - containerHeight) / 2 + 96);
  return {
    x: Math.min(maxX, Math.max(-maxX, panX)),
    y: Math.min(maxY, Math.max(-maxY, panY)),
  };
}

export function CanvasViewport({
  canvasElRef,
  canvasWidth,
  canvasHeight,
  showSafeArea,
  selectedTextFontSize = null,
  onChangeTextFontSize,
  onToggleSafeArea,
  onDeselectAll,
  onDropImageFile,
  onRecalculateOffset,
  onCancelPointerAction,
  onBeginObjectPinch,
  onUpdateObjectPinch,
  onEndObjectPinch,
}: CanvasViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameBoxRef = useRef<HTMLDivElement | null>(null);
  const windowSize = useWindowSize();
  const [containerSize, setContainerSize] = useState({ width: 720, height: 760 });
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const aspectKey = `${canvasWidth}x${canvasHeight}`;
  const [viewState, setViewState] = useState({
    aspectKey,
    zoom: 1,
    panX: 0,
    panY: 0,
  });

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const zoomFactor = viewState.aspectKey === aspectKey ? viewState.zoom : 1;
  const rawPanX = viewState.aspectKey === aspectKey ? viewState.panX : 0;
  const rawPanY = viewState.aspectKey === aspectKey ? viewState.panY : 0;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [windowSize.width, windowSize.height]);

  const isDesktop = windowSize.width >= 1024;
  const fitScale = calculateFitScale(
    containerSize.width,
    containerSize.height,
    canvasWidth,
    canvasHeight,
    isDesktop
  );
  const effectiveScale = fitScale * zoomFactor;
  const scaledWidth = Math.round(canvasWidth * effectiveScale);
  const scaledHeight = Math.round(canvasHeight * effectiveScale);
  const pan = clampPan(
    rawPanX,
    rawPanY,
    zoomFactor,
    scaledWidth,
    scaledHeight,
    containerSize.width,
    containerSize.height
  );

  // Sync latest layout/zoom values into a ref for native wheel, touch pinch, and key listeners
  const liveRef = useRef({
    aspectKey,
    zoomFactor,
    pan,
    fitScale,
    effectiveScale,
    canvasWidth,
    canvasHeight,
    containerSize,
    isSpacePressed,
    onDeselectAll,
    onCancelPointerAction,
    onBeginObjectPinch,
    onUpdateObjectPinch,
    onEndObjectPinch,
  });
  useEffect(() => {
    liveRef.current = {
      aspectKey,
      zoomFactor,
      pan,
      fitScale,
      effectiveScale,
      canvasWidth,
      canvasHeight,
      containerSize,
      isSpacePressed,
      onDeselectAll,
      onCancelPointerAction,
      onBeginObjectPinch,
      onUpdateObjectPinch,
      onEndObjectPinch,
    };
  });

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      onRecalculateOffset();
    });
    return () => window.cancelAnimationFrame(id);
  }, [effectiveScale, pan.x, pan.y, canvasWidth, canvasHeight, onRecalculateOffset]);

  const applyZoom = useCallback(
    (
      nextZoomOrUpdater: number | ((currentZoom: number) => number),
      focalClientPoint?: { x: number; y: number }
    ) => {
      const live = liveRef.current;
      setViewState((prev) => {
        const currentZoom =
          prev.aspectKey === live.aspectKey ? prev.zoom : 1;
        const currentPanX =
          prev.aspectKey === live.aspectKey ? prev.panX : 0;
        const currentPanY =
          prev.aspectKey === live.aspectKey ? prev.panY : 0;

        const targetZoomRaw =
          typeof nextZoomOrUpdater === 'function'
            ? nextZoomOrUpdater(currentZoom)
            : nextZoomOrUpdater;
        const nextZoom = clampZoomFactor(targetZoomRaw);
        const prevScale = live.fitScale * currentZoom;
        const nextScale = live.fitScale * nextZoom;
        const nextW = Math.round(live.canvasWidth * nextScale);
        const nextH = Math.round(live.canvasHeight * nextScale);

        let nextPanX = currentPanX;
        let nextPanY = currentPanY;

        if (focalClientPoint && frameBoxRef.current) {
          const frameRect = frameBoxRef.current.getBoundingClientRect();
          const unpannedCenterX =
            frameRect.left + frameRect.width / 2 - currentPanX;
          const unpannedCenterY =
            frameRect.top + frameRect.height / 2 - currentPanY;
          const dx = focalClientPoint.x - unpannedCenterX;
          const dy = focalClientPoint.y - unpannedCenterY;
          const ratio = prevScale > 0 ? nextScale / prevScale : 1;
          nextPanX = dx - (dx - currentPanX) * ratio;
          nextPanY = dy - (dy - currentPanY) * ratio;
        }

        const clamped = clampPan(
          nextPanX,
          nextPanY,
          nextZoom,
          nextW,
          nextH,
          live.containerSize.width,
          live.containerSize.height
        );

        return {
          aspectKey: live.aspectKey,
          zoom: nextZoom,
          panX: clamped.x,
          panY: clamped.y,
        };
      });
    },
    []
  );

  const resetZoom = useCallback(() => {
    setViewState({
      aspectKey: liveRef.current.aspectKey,
      zoom: 1,
      panX: 0,
      panY: 0,
    });
  }, []);

  const shiftPan = useCallback((deltaX: number, deltaY: number) => {
    const live = liveRef.current;
    setViewState((prev) => {
      const currentZoom = prev.aspectKey === live.aspectKey ? prev.zoom : 1;
      const currentPanX = prev.aspectKey === live.aspectKey ? prev.panX : 0;
      const currentPanY = prev.aspectKey === live.aspectKey ? prev.panY : 0;
      const scale = live.fitScale * currentZoom;
      const sw = Math.round(live.canvasWidth * scale);
      const sh = Math.round(live.canvasHeight * scale);
      const clamped = clampPan(
        currentPanX + deltaX,
        currentPanY + deltaY,
        currentZoom,
        sw,
        sh,
        live.containerSize.width,
        live.containerSize.height
      );
      return {
        aspectKey: live.aspectKey,
        zoom: currentZoom,
        panX: clamped.x,
        panY: clamped.y,
      };
    });
  }, []);

  // Trackpad pinch / Ctrl+wheel zoom and zoomed wheel panning
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      const live = liveRef.current;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = Math.min(1.35, Math.max(0.75, Math.exp(-e.deltaY * 0.0045)));
        applyZoom((z) => z * factor, { x: e.clientX, y: e.clientY });
        return;
      }

      if (live.zoomFactor > 1 && (Math.abs(e.deltaX) > 0 || Math.abs(e.deltaY) > 0)) {
        e.preventDefault();
        shiftPan(-e.deltaX, -e.deltaY);
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [applyZoom, shiftPan]);

  // Smart Option 1 two-finger pinch: resizes selected unlocked object when touching near it,
  // otherwise zooms and pans the canvas viewport (Safari iOS / Android Chrome).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let gestureMode: 'object-pinch' | 'viewport-pinch' | null = null;
    let awaitingAllFingersLift = false;
    const activeTouchPointers = new Set<number>();
    let pinchStart: {
      dist: number;
      midX: number;
      midY: number;
      zoom: number;
      panX: number;
      panY: number;
      fitScale: number;
    } | null = null;

    const readTouchPoints = (touches: TouchList) => {
      const a = touches[0];
      const b = touches[1];
      return {
        t1: { x: a.clientX, y: a.clientY },
        t2: { x: b.clientX, y: b.clientY },
        dist: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
        midX: (a.clientX + b.clientX) / 2,
        midY: (a.clientY + b.clientY) / 2,
      };
    };

    const onPointerDownCapture = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      activeTouchPointers.add(e.pointerId);
      if (activeTouchPointers.size >= 2 || gestureMode !== null || awaitingAllFingersLift) {
        e.stopPropagation();
      }
    };

    const onPointerMoveCapture = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      if (activeTouchPointers.size >= 2 || gestureMode !== null || awaitingAllFingersLift) {
        e.stopPropagation();
      }
    };

    const onPointerUpCapture = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      const shouldBlock =
        activeTouchPointers.size >= 2 || gestureMode !== null || awaitingAllFingersLift;
      activeTouchPointers.delete(e.pointerId);
      if (shouldBlock) {
        e.stopPropagation();
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        e.stopPropagation();
        awaitingAllFingersLift = false;
        const pair = readTouchPoints(e.touches);
        const live = liveRef.current;

        if (live.onBeginObjectPinch?.(pair.t1, pair.t2)) {
          gestureMode = 'object-pinch';
          pinchStart = null;
          return;
        }

        live.onCancelPointerAction?.();
        gestureMode = 'viewport-pinch';
        pinchStart = {
          dist: Math.max(pair.dist, 1),
          midX: pair.midX,
          midY: pair.midY,
          zoom: live.zoomFactor,
          panX: live.pan.x,
          panY: live.pan.y,
          fitScale: live.fitScale,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && gestureMode) {
        e.preventDefault();
        e.stopPropagation();
        const pair = readTouchPoints(e.touches);
        const live = liveRef.current;

        if (gestureMode === 'object-pinch') {
          live.onUpdateObjectPinch?.(pair.t1, pair.t2);
          return;
        }

        if (gestureMode === 'viewport-pinch' && pinchStart) {
          const scaleChange = pair.dist / pinchStart.dist;
          const nextZoom = clampZoomFactor(pinchStart.zoom * scaleChange);
          const ratio = pinchStart.zoom > 0 ? nextZoom / pinchStart.zoom : 1;

          let nextPanX = pinchStart.panX + (pair.midX - pinchStart.midX);
          let nextPanY = pinchStart.panY + (pair.midY - pinchStart.midY);

          if (frameBoxRef.current) {
            const rect = frameBoxRef.current.getBoundingClientRect();
            const unpannedCenterX = rect.left + rect.width / 2 - live.pan.x;
            const unpannedCenterY = rect.top + rect.height / 2 - live.pan.y;
            const startDx = pinchStart.midX - unpannedCenterX;
            const startDy = pinchStart.midY - unpannedCenterY;
            const currentDx = pair.midX - unpannedCenterX;
            const currentDy = pair.midY - unpannedCenterY;
            nextPanX = currentDx - (startDx - pinchStart.panX) * ratio;
            nextPanY = currentDy - (startDy - pinchStart.panY) * ratio;
          }

          const nextScale = pinchStart.fitScale * nextZoom;
          const clamped = clampPan(
            nextPanX,
            nextPanY,
            nextZoom,
            Math.round(live.canvasWidth * nextScale),
            Math.round(live.canvasHeight * nextScale),
            live.containerSize.width,
            live.containerSize.height
          );

          setViewState({
            aspectKey: live.aspectKey,
            zoom: nextZoom,
            panX: clamped.x,
            panY: clamped.y,
          });
        }
      } else if (awaitingAllFingersLift) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (gestureMode) {
        e.stopPropagation();
        if (e.touches.length < 2) {
          if (gestureMode === 'object-pinch') {
            liveRef.current.onEndObjectPinch?.();
          }
          gestureMode = null;
          pinchStart = null;
          awaitingAllFingersLift = e.touches.length > 0;
        }
      } else if (awaitingAllFingersLift) {
        e.stopPropagation();
        if (e.touches.length === 0) {
          awaitingAllFingersLift = false;
        }
      }
    };

    el.addEventListener('pointerdown', onPointerDownCapture, { capture: true });
    el.addEventListener('pointermove', onPointerMoveCapture, { capture: true });
    el.addEventListener('pointerup', onPointerUpCapture, { capture: true });
    el.addEventListener('pointercancel', onPointerUpCapture, { capture: true });
    el.addEventListener('touchstart', onTouchStart, {
      capture: true,
      passive: false,
    });
    el.addEventListener('touchmove', onTouchMove, {
      capture: true,
      passive: false,
    });
    el.addEventListener('touchend', onTouchEnd, { capture: true });
    el.addEventListener('touchcancel', onTouchEnd, { capture: true });

    return () => {
      if (gestureMode === 'object-pinch') {
        liveRef.current.onEndObjectPinch?.();
      }
      el.removeEventListener('pointerdown', onPointerDownCapture, { capture: true });
      el.removeEventListener('pointermove', onPointerMoveCapture, { capture: true });
      el.removeEventListener('pointerup', onPointerUpCapture, { capture: true });
      el.removeEventListener('pointercancel', onPointerUpCapture, { capture: true });
      el.removeEventListener('touchstart', onTouchStart, { capture: true });
      el.removeEventListener('touchmove', onTouchMove, { capture: true });
      el.removeEventListener('touchend', onTouchEnd, { capture: true });
      el.removeEventListener('touchcancel', onTouchEnd, { capture: true });
    };
  }, []);

  // Spacebar hold for hand-panning + Ctrl/Cmd +/-/0 zoom shortcuts
  useEffect(() => {
    const isInputFocused = (target: EventTarget | null) => {
      const node = target as HTMLElement | null;
      return Boolean(
        node &&
          (node.tagName === 'INPUT' ||
            node.tagName === 'TEXTAREA' ||
            node.tagName === 'SELECT' ||
            node.isContentEditable)
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused(e.target)) return;

      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }

      if (e.metaKey || e.ctrlKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          applyZoom((z) => z + ZOOM_BUTTON_STEP);
        } else if (e.key === '-') {
          e.preventDefault();
          applyZoom((z) => z - ZOOM_BUTTON_STEP);
        } else if (e.key === '0') {
          e.preventDefault();
          resetZoom();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    const handleBlur = () => {
      setIsSpacePressed(false);
      setIsPanning(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [applyZoom, resetZoom]);

  // Capture-phase mouse pan for Space+drag, middle-mouse drag, or zoomed backdrop drag
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let panDrag: {
      startX: number;
      startY: number;
      startPanX: number;
      startPanY: number;
      deselectOnClick: boolean;
      moved: boolean;
    } | null = null;

    const onMouseDownCapture = (e: globalThis.MouseEvent) => {
      const live = liveRef.current;
      const isMiddle = e.button === 1;
      const isSpaceDrag = e.button === 0 && live.isSpacePressed;
      const isBackdropDrag =
        e.button === 0 && e.target === el && live.zoomFactor > 1;

      if (!isMiddle && !isSpaceDrag && !isBackdropDrag) {
        return;
      }

      if (isMiddle || isSpaceDrag) {
        e.preventDefault();
        e.stopPropagation();
      }

      setIsPanning(true);
      panDrag = {
        startX: e.clientX,
        startY: e.clientY,
        startPanX: live.pan.x,
        startPanY: live.pan.y,
        deselectOnClick: isBackdropDrag,
        moved: false,
      };
    };

    const onWindowMouseMove = (e: globalThis.MouseEvent) => {
      if (!panDrag) return;
      const dx = e.clientX - panDrag.startX;
      const dy = e.clientY - panDrag.startY;
      if (Math.hypot(dx, dy) > 3) {
        panDrag.moved = true;
      }
      const live = liveRef.current;
      const sw = Math.round(live.canvasWidth * live.effectiveScale);
      const sh = Math.round(live.canvasHeight * live.effectiveScale);
      const clamped = clampPan(
        panDrag.startPanX + dx,
        panDrag.startPanY + dy,
        live.zoomFactor,
        sw,
        sh,
        live.containerSize.width,
        live.containerSize.height
      );
      setViewState({
        aspectKey: live.aspectKey,
        zoom: live.zoomFactor,
        panX: clamped.x,
        panY: clamped.y,
      });
    };

    const onWindowMouseUp = () => {
      if (!panDrag) return;
      if (panDrag.deselectOnClick && !panDrag.moved) {
        liveRef.current.onDeselectAll();
      }
      panDrag = null;
      setIsPanning(false);
    };

    el.addEventListener('mousedown', onMouseDownCapture, { capture: true });
    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);

    return () => {
      el.removeEventListener('mousedown', onMouseDownCapture, { capture: true });
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, []);

  const handleBackdropMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && zoomFactor <= 1 && !isSpacePressed) {
      onDeselectAll();
    }
  };

  const handleBackdropDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && zoomFactor !== 1) {
      resetZoom();
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingFile(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsDraggingFile(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onDropImageFile(file);
    }
  };

  const isZoomedOrPanned =
    Math.abs(zoomFactor - 1) > 0.005 ||
    Math.abs(pan.x) > 1 ||
    Math.abs(pan.y) > 1;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleBackdropMouseDown}
      onDoubleClick={handleBackdropDoubleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative flex-1 min-h-0 studio-grid-bg flex items-center justify-center lg:pb-10 overflow-hidden select-none',
        isPanning
          ? 'cursor-grabbing'
          : isSpacePressed
            ? 'cursor-grab'
            : undefined
      )}
    >
      {/* Scaled Canvas Frame */}
      <div
        ref={frameBoxRef}
        className="relative touch-none shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)] ring-1 ring-white/10 rounded-[4px] overflow-hidden checkerboard-bg shrink-0"
        style={{
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
        }}
      >
        <div
          style={{
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            transform: `scale(${effectiveScale})`,
            transformOrigin: 'top left',
          }}
        >
          <canvas ref={canvasElRef} />
        </div>
      </div>

      {/* Instagram-style Vertical Font Size Slider on Left Edge for Mobile */}
      {selectedTextFontSize !== null && onChangeTextFontSize && (
        <MobileFontSizeSlider
          fontSize={selectedTextFontSize}
          onChange={onChangeTextFontSize}
        />
      )}

      {/* Top-right Safe Zone Toggle */}
      <button
        type="button"
        onClick={onToggleSafeArea}
        title="Toggle Instagram Safe Area Guides"
        className={cn(
          'absolute top-2.5 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium backdrop-blur transition-colors',
          showSafeArea
            ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
            : 'bg-zinc-900/80 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
        )}
      >
        <Scan className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Safe Area</span>
      </button>

      {/* Interactive Viewport Zoom Controls */}
      <div
        data-testid="canvas-zoom-controls"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute bottom-2 left-2.5 sm:left-3 lg:bottom-4 lg:left-4 z-10 flex items-center gap-1 px-1.5 py-1 rounded-full bg-zinc-900/90 border border-zinc-800/90 text-[10px] sm:text-[11px] font-mono text-zinc-300 backdrop-blur shadow-lg"
      >
        <button
          type="button"
          onClick={() => applyZoom((z) => z - ZOOM_BUTTON_STEP)}
          disabled={zoomFactor <= MIN_ZOOM_FACTOR + 0.001}
          aria-label="Zoom out canvas"
          title="Zoom out (Cmd/Ctrl -)"
          className="p-1 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-35 disabled:pointer-events-none transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>

        <button
          type="button"
          onClick={resetZoom}
          aria-label="Reset canvas zoom"
          title={`Reset zoom to fit (${canvasWidth} × ${canvasHeight})`}
          className="px-1.5 py-0.5 rounded-full hover:bg-zinc-800 text-zinc-200 font-semibold min-w-[2.5rem] text-center transition-colors"
        >
          {Math.round(effectiveScale * 100)}%
        </button>

        <button
          type="button"
          onClick={() => applyZoom((z) => z + ZOOM_BUTTON_STEP)}
          disabled={zoomFactor >= MAX_ZOOM_FACTOR - 0.001}
          aria-label="Zoom in canvas"
          title="Zoom in (Cmd/Ctrl +)"
          className="p-1 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-35 disabled:pointer-events-none transition-colors"
        >
          <Plus className="w-3 h-3" />
        </button>

        {isZoomedOrPanned && (
          <button
            type="button"
            onClick={resetZoom}
            aria-label="Fit canvas to screen"
            title="Fit to screen"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-violet-600/25 hover:bg-violet-600/40 text-violet-200 text-[10px] font-sans font-medium transition-colors"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Fit</span>
          </button>
        )}
      </div>

      {/* Drag & Drop Image Overlay */}
      {isDraggingFile && (
        <div className="pointer-events-none absolute inset-4 rounded-2xl border-2 border-dashed border-violet-400 bg-violet-950/50 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
          <div className="w-14 h-14 rounded-2xl bg-violet-600/30 border border-violet-400/50 flex items-center justify-center text-violet-200">
            <ImagePlus className="w-7 h-7" />
          </div>
          <p className="text-sm font-semibold text-white">
            Drop image to add layer
          </p>
          <p className="text-xs text-violet-200/80">
            Inserted at full resolution on your story canvas
          </p>
        </div>
      )}
    </div>
  );
}
