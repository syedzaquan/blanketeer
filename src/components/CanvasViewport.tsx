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

const DEFAULT_CANVAS_SCALE = 0.26;
const MIN_CANVAS_SCALE = 0.1;
const MAX_CANVAS_SCALE = 2.5;
const SCALE_BUTTON_STEP = 0.1;

const clampCanvasScale = (value: number): number =>
  Math.min(MAX_CANVAS_SCALE, Math.max(MIN_CANVAS_SCALE, Number(value.toFixed(3))));

function clampPan(
  panX: number,
  panY: number,
  scaledWidth: number,
  scaledHeight: number,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number } {
  const maxX = Math.max(
    48,
    Math.min(
      (containerWidth + scaledWidth) / 2 - 48,
      Math.abs(scaledWidth - containerWidth) / 2 + 80
    )
  );
  const maxY = Math.max(
    48,
    Math.min(
      (containerHeight + scaledHeight) / 2 - 48,
      Math.abs(scaledHeight - containerHeight) / 2 + 80
    )
  );
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
    scale: DEFAULT_CANVAS_SCALE,
    panX: 0,
    panY: 0,
  });

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const canvasScale =
    viewState.aspectKey === aspectKey ? viewState.scale : DEFAULT_CANVAS_SCALE;
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

  const scaledWidth = Math.round(canvasWidth * canvasScale);
  const scaledHeight = Math.round(canvasHeight * canvasScale);
  const pan = clampPan(
    rawPanX,
    rawPanY,
    scaledWidth,
    scaledHeight,
    containerSize.width,
    containerSize.height
  );

  // Sync latest layout/zoom values into a ref for native wheel, touch pinch, and key listeners
  const liveRef = useRef({
    aspectKey,
    canvasScale,
    pan,
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
      canvasScale,
      pan,
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
  }, [canvasScale, pan.x, pan.y, canvasWidth, canvasHeight, onRecalculateOffset]);

  const applyZoom = useCallback(
    (
      nextScaleOrUpdater: number | ((currentScale: number) => number),
      focalClientPoint?: { x: number; y: number }
    ) => {
      const live = liveRef.current;
      setViewState((prev) => {
        const currentScale =
          prev.aspectKey === live.aspectKey ? prev.scale : DEFAULT_CANVAS_SCALE;
        const currentPanX =
          prev.aspectKey === live.aspectKey ? prev.panX : 0;
        const currentPanY =
          prev.aspectKey === live.aspectKey ? prev.panY : 0;

        const targetScaleRaw =
          typeof nextScaleOrUpdater === 'function'
            ? nextScaleOrUpdater(currentScale)
            : nextScaleOrUpdater;
        const nextScale = clampCanvasScale(targetScaleRaw);
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
          const ratio = currentScale > 0 ? nextScale / currentScale : 1;
          nextPanX = dx - (dx - currentPanX) * ratio;
          nextPanY = dy - (dy - currentPanY) * ratio;
        }

        const clamped = clampPan(
          nextPanX,
          nextPanY,
          nextW,
          nextH,
          live.containerSize.width,
          live.containerSize.height
        );

        return {
          aspectKey: live.aspectKey,
          scale: nextScale,
          panX: clamped.x,
          panY: clamped.y,
        };
      });
    },
    []
  );

  const resetViewport = useCallback(() => {
    setViewState({
      aspectKey: liveRef.current.aspectKey,
      scale: DEFAULT_CANVAS_SCALE,
      panX: 0,
      panY: 0,
    });
  }, []);

  const shiftPan = useCallback((deltaX: number, deltaY: number) => {
    const live = liveRef.current;
    setViewState((prev) => {
      const currentScale =
        prev.aspectKey === live.aspectKey ? prev.scale : DEFAULT_CANVAS_SCALE;
      const currentPanX = prev.aspectKey === live.aspectKey ? prev.panX : 0;
      const currentPanY = prev.aspectKey === live.aspectKey ? prev.panY : 0;
      const sw = Math.round(live.canvasWidth * currentScale);
      const sh = Math.round(live.canvasHeight * currentScale);
      const clamped = clampPan(
        currentPanX + deltaX,
        currentPanY + deltaY,
        sw,
        sh,
        live.containerSize.width,
        live.containerSize.height
      );
      return {
        aspectKey: live.aspectKey,
        scale: currentScale,
        panX: clamped.x,
        panY: clamped.y,
      };
    });
  }, []);

  // Trackpad pinch / Ctrl+wheel zoom and free wheel panning at any zoom rate
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = Math.min(1.35, Math.max(0.75, Math.exp(-e.deltaY * 0.0045)));
        applyZoom((s) => s * factor, { x: e.clientX, y: e.clientY });
        return;
      }

      if (Math.abs(e.deltaX) > 0 || Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        shiftPan(-e.deltaX, -e.deltaY);
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [applyZoom, shiftPan]);

  // Smart Option 1 two-finger pinch (object resize/move vs viewport zoom/pan)
  // plus single-finger touch panning on empty studio backdrop at any zoom level.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let gestureMode:
      | 'object-pinch'
      | 'viewport-pinch'
      | 'backdrop-touch-pan'
      | null = null;
    let awaitingAllFingersLift = false;
    const activeTouchPointers = new Set<number>();
    let backdropTouchStart: {
      x: number;
      y: number;
      panX: number;
      panY: number;
      moved: boolean;
    } | null = null;
    let pinchStart: {
      dist: number;
      midX: number;
      midY: number;
      scale: number;
      panX: number;
      panY: number;
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
      if (
        activeTouchPointers.size >= 2 ||
        gestureMode === 'object-pinch' ||
        gestureMode === 'viewport-pinch' ||
        awaitingAllFingersLift
      ) {
        e.stopPropagation();
      }
    };

    const onPointerMoveCapture = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      if (
        activeTouchPointers.size >= 2 ||
        gestureMode === 'object-pinch' ||
        gestureMode === 'viewport-pinch' ||
        awaitingAllFingersLift
      ) {
        e.stopPropagation();
      }
    };

    const onPointerUpCapture = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      const shouldBlock =
        activeTouchPointers.size >= 2 ||
        gestureMode === 'object-pinch' ||
        gestureMode === 'viewport-pinch' ||
        awaitingAllFingersLift;
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
        backdropTouchStart = null;
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
          scale: live.canvasScale,
          panX: live.pan.x,
          panY: live.pan.y,
        };
      } else if (e.touches.length === 1 && e.target === el && !awaitingAllFingersLift) {
        const live = liveRef.current;
        gestureMode = 'backdrop-touch-pan';
        backdropTouchStart = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          panX: live.pan.x,
          panY: live.pan.y,
          moved: false,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (
        e.touches.length === 2 &&
        (gestureMode === 'object-pinch' || gestureMode === 'viewport-pinch')
      ) {
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
          const nextScale = clampCanvasScale(pinchStart.scale * scaleChange);
          const ratio = pinchStart.scale > 0 ? nextScale / pinchStart.scale : 1;

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

          const clamped = clampPan(
            nextPanX,
            nextPanY,
            Math.round(live.canvasWidth * nextScale),
            Math.round(live.canvasHeight * nextScale),
            live.containerSize.width,
            live.containerSize.height
          );

          setViewState({
            aspectKey: live.aspectKey,
            scale: nextScale,
            panX: clamped.x,
            panY: clamped.y,
          });
        }
      } else if (
        e.touches.length === 1 &&
        gestureMode === 'backdrop-touch-pan' &&
        backdropTouchStart
      ) {
        e.preventDefault();
        const dx = e.touches[0].clientX - backdropTouchStart.x;
        const dy = e.touches[0].clientY - backdropTouchStart.y;
        if (Math.hypot(dx, dy) > 4) {
          backdropTouchStart.moved = true;
        }
        const live = liveRef.current;
        const clamped = clampPan(
          backdropTouchStart.panX + dx,
          backdropTouchStart.panY + dy,
          Math.round(live.canvasWidth * live.canvasScale),
          Math.round(live.canvasHeight * live.canvasScale),
          live.containerSize.width,
          live.containerSize.height
        );
        setViewState({
          aspectKey: live.aspectKey,
          scale: live.canvasScale,
          panX: clamped.x,
          panY: clamped.y,
        });
      } else if (awaitingAllFingersLift) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (gestureMode === 'backdrop-touch-pan') {
        if (backdropTouchStart && !backdropTouchStart.moved && e.touches.length === 0) {
          liveRef.current.onDeselectAll();
        }
        backdropTouchStart = null;
        gestureMode = null;
        return;
      }

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
          applyZoom((s) => s + SCALE_BUTTON_STEP);
        } else if (e.key === '-') {
          e.preventDefault();
          applyZoom((s) => s - SCALE_BUTTON_STEP);
        } else if (e.key === '0') {
          e.preventDefault();
          resetViewport();
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
  }, [applyZoom, resetViewport]);

  // Capture-phase mouse pan for Space+drag, middle-mouse drag, or backdrop drag at any zoom rate
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
      const isBackdropDrag = e.button === 0 && e.target === el;

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
      const sw = Math.round(live.canvasWidth * live.canvasScale);
      const sh = Math.round(live.canvasHeight * live.canvasScale);
      const clamped = clampPan(
        panDrag.startPanX + dx,
        panDrag.startPanY + dy,
        sw,
        sh,
        live.containerSize.width,
        live.containerSize.height
      );
      setViewState({
        aspectKey: live.aspectKey,
        scale: live.canvasScale,
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

  const handleBackdropDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && isZoomedOrPanned) {
      resetViewport();
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
    Math.abs(canvasScale - DEFAULT_CANVAS_SCALE) > 0.005 ||
    Math.abs(pan.x) > 1 ||
    Math.abs(pan.y) > 1;

  return (
    <div
      ref={containerRef}
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
            transform: `scale(${canvasScale})`,
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
          onClick={() => applyZoom((s) => s - SCALE_BUTTON_STEP)}
          disabled={canvasScale <= MIN_CANVAS_SCALE + 0.001}
          aria-label="Zoom out canvas"
          title="Zoom out (Cmd/Ctrl -)"
          className="p-1 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-35 disabled:pointer-events-none transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>

        <button
          type="button"
          onClick={resetViewport}
          aria-label="Reset canvas zoom"
          title={`Reset to 26% & center (${canvasWidth} × ${canvasHeight})`}
          className="px-1.5 py-0.5 rounded-full hover:bg-zinc-800 text-zinc-200 font-semibold min-w-[2.5rem] text-center transition-colors"
        >
          {Math.round(canvasScale * 100)}%
        </button>

        <button
          type="button"
          onClick={() => applyZoom((s) => s + SCALE_BUTTON_STEP)}
          disabled={canvasScale >= MAX_CANVAS_SCALE - 0.001}
          aria-label="Zoom in canvas"
          title="Zoom in (Cmd/Ctrl +)"
          className="p-1 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-35 disabled:pointer-events-none transition-colors"
        >
          <Plus className="w-3 h-3" />
        </button>

        <button
          type="button"
          onClick={resetViewport}
          aria-label="Reset canvas position and zoom"
          title="Reset to default position & 26% zoom (Cmd/Ctrl 0)"
          className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-sans font-medium transition-colors',
            isZoomedOrPanned
              ? 'bg-violet-600/25 hover:bg-violet-600/40 text-violet-200'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
          )}
        >
          <RotateCcw className="w-2.5 h-2.5" />
          <span>Reset</span>
        </button>
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
