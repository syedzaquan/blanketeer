import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import {
  ClipboardPaste,
  ImagePlus,
  Lock,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  Type,
  Unlock,
} from 'lucide-react';
import { useWindowSize } from '../hooks/useWindowSize';
import type {
  OverflowControlKey,
  SelectionBoxSnapshot,
  TextEditingSelectionState,
} from '../types/editor';
import {
  canReadClipboard,
  hasClipboardImageSilently,
  readImageFileFromClipboard,
} from '../utils/clipboardImage';
import { cn } from '../utils/cn';
import { MobileFontSizeSlider } from './MobileFontSizeSlider';
import { TextEditingPopover } from './TextEditingPopover';

interface CanvasViewportProps {
  canvasElRef: RefObject<HTMLCanvasElement | null>;
  canvasWidth: number;
  canvasHeight: number;
  showSafeArea?: boolean;
  selectedTextFontSize?: number | null;
  onChangeTextFontSize?: (size: number) => void;
  onToggleSafeArea?: () => void;
  onOpenPreview?: () => void;
  onDeselectAll: () => void;
  onDropImageFile: (file: File) => void;
  onAddText?: () => void;
  onTriggerImageUpload?: () => void;
  onRecalculateOffset: () => void;
  onCanPanCanvasAt?: (e: globalThis.MouseEvent | globalThis.TouchEvent) => boolean;
  onGetTouchHitKind?: (
    e: globalThis.MouseEvent | globalThis.TouchEvent | globalThis.PointerEvent
  ) => 'selected' | 'unselected' | 'empty';
  onSelectObjectAtClientPoint?: (clientX: number, clientY: number) => void;
  onCancelPointerAction?: () => void;
  onGetActiveObjectId?: () => string | null;
  onRestoreSelectionById?: (id: string | null) => void;
  onBeginObjectPinch?: (
    touch1: { x: number; y: number },
    touch2: { x: number; y: number },
    allowedObjectId?: string | null
  ) => boolean;
  onUpdateObjectPinch?: (
    touch1: { x: number; y: number },
    touch2: { x: number; y: number }
  ) => void;
  onEndObjectPinch?: () => void;
  selectionBox?: SelectionBoxSnapshot | null;
  onBeginOverflowControlDrag?: (
    corner: OverflowControlKey,
    sceneX: number,
    sceneY: number
  ) => boolean;
  onUpdateOverflowControlDrag?: (
    sceneX: number,
    sceneY: number,
    shiftKey?: boolean
  ) => void;
  onEndOverflowControlDrag?: () => void;
  textEditingState?: TextEditingSelectionState | null;
  onApplyEditingStyle?: (
    patch: Partial<{
      bold: boolean;
      italic: boolean;
      underline: boolean;
      fill: string;
      textBackgroundColor: string;
    }>
  ) => void;
  onSelectAllEditingText?: () => void;
  onExitTextEditing?: () => void;
  selectedObjectLocked?: boolean | null;
  onToggleLock?: () => void;
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
  selectedTextFontSize = null,
  onChangeTextFontSize,
  onOpenPreview,
  onDeselectAll,
  onDropImageFile,
  onAddText,
  onTriggerImageUpload,
  onRecalculateOffset,
  onCanPanCanvasAt,
  onGetTouchHitKind,
  onSelectObjectAtClientPoint,
  onCancelPointerAction,
  onGetActiveObjectId,
  onRestoreSelectionById,
  onBeginObjectPinch,
  onUpdateObjectPinch,
  onEndObjectPinch,
  selectionBox = null,
  onBeginOverflowControlDrag,
  onUpdateOverflowControlDrag,
  onEndOverflowControlDrag,
  textEditingState,
  onApplyEditingStyle,
  onSelectAllEditingText,
  onExitTextEditing,
  selectedObjectLocked = null,
  onToggleLock,
}: CanvasViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameWrapperRef = useRef<HTMLDivElement | null>(null);
  const frameBoxRef = useRef<HTMLDivElement | null>(null);
  const pendingPanRef = useRef<{ x: number; y: number } | null>(null);
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
  const [canvasTapPopover, setCanvasTapPopover] = useState<{
    x: number;
    y: number;
    showPaste: boolean;
  } | null>(null);
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null);
  const clipboardNoticeTimerRef = useRef<number | null>(null);

  const showClipboardNotice = useCallback((msg: string) => {
    setClipboardNotice(msg);
    if (clipboardNoticeTimerRef.current !== null) {
      window.clearTimeout(clipboardNoticeTimerRef.current);
    }
    clipboardNoticeTimerRef.current = window.setTimeout(() => {
      setClipboardNotice(null);
      clipboardNoticeTimerRef.current = null;
    }, 2000);
  }, []);

  const openCanvasTapPopover = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = Math.max(
        110,
        Math.min(rect.width - 110, clientX - rect.left)
      );
      const y = Math.max(
        56,
        Math.min(rect.height - 56, clientY - rect.top)
      );

      setCanvasTapPopover({
        x,
        y,
        showPaste: true,
      });

      void hasClipboardImageSilently().then((hasImg) => {
        if (hasImg === false) {
          setCanvasTapPopover((prev) =>
            prev ? { ...prev, showPaste: false } : null
          );
        }
      });
    },
    []
  );

  const handleDirectPaste = useCallback(async () => {
    setCanvasTapPopover(null);
    if (!canReadClipboard()) {
      showClipboardNotice('Clipboard paste requires HTTPS');
      return;
    }

    try {
      const file = await readImageFileFromClipboard();
      if (file) {
        onDropImageFile(file);
      } else {
        showClipboardNotice('No image in clipboard');
      }
    } catch {
      showClipboardNotice('Clipboard access blocked');
    }
  }, [onDropImageFile, showClipboardNotice]);

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
    onCanPanCanvasAt,
    onGetTouchHitKind,
    onSelectObjectAtClientPoint,
    onCancelPointerAction,
    onGetActiveObjectId,
    onRestoreSelectionById,
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
      onCanPanCanvasAt,
      onGetTouchHitKind,
      onSelectObjectAtClientPoint,
      onCancelPointerAction,
      onGetActiveObjectId,
      onRestoreSelectionById,
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
  }, [canvasScale, canvasWidth, canvasHeight, onRecalculateOffset]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onRecalculateOffset();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [pan.x, pan.y, onRecalculateOffset]);

  const applyPanTransformOnly = useCallback((x: number, y: number) => {
    pendingPanRef.current = { x, y };
    if (frameWrapperRef.current) {
      frameWrapperRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
  }, []);

  const commitPendingPan = useCallback(() => {
    const pending = pendingPanRef.current;
    pendingPanRef.current = null;
    if (!pending) return;
    const live = liveRef.current;
    setViewState({
      aspectKey: live.aspectKey,
      scale: live.canvasScale,
      panX: pending.x,
      panY: pending.y,
    });
  }, []);

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
    let suppressFabricSingleTouch = false;
    let preTouchActiveId: string | null | undefined = undefined;
    const activeTouchPointers = new Set<number>();
    let backdropTouchStart: {
      x: number;
      y: number;
      panX: number;
      panY: number;
      moved: boolean;
      hitKind: 'selected' | 'unselected' | 'empty';
      isInFrame: boolean;
      longPressReady: boolean;
    } | null = null;
    let longPressTimer: number | null = null;
    const clearLongPressTimer = () => {
      if (longPressTimer !== null) {
        window.clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };
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
      if ((e.target as HTMLElement | null)?.closest('[data-canvas-tap-popover="true"]')) {
        return;
      }
      const isFirstTouch = activeTouchPointers.size === 0;
      if (isFirstTouch && preTouchActiveId === undefined) {
        preTouchActiveId = liveRef.current.onGetActiveObjectId?.() ?? null;
      }
      if (isFirstTouch && !awaitingAllFingersLift) {
        const isBackdrop = e.target === el;
        const isInFrame = Boolean(frameBoxRef.current?.contains(e.target as Node));
        if (isBackdrop) {
          suppressFabricSingleTouch = true;
        } else if (isInFrame) {
          const hitKind = liveRef.current.onGetTouchHitKind?.(e) ?? 'empty';
          suppressFabricSingleTouch = hitKind !== 'selected';
        } else {
          suppressFabricSingleTouch = false;
        }
      }
      activeTouchPointers.add(e.pointerId);
      if (
        suppressFabricSingleTouch ||
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
        suppressFabricSingleTouch ||
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
        suppressFabricSingleTouch ||
        activeTouchPointers.size >= 2 ||
        gestureMode === 'object-pinch' ||
        gestureMode === 'viewport-pinch' ||
        awaitingAllFingersLift;
      activeTouchPointers.delete(e.pointerId);
      if (activeTouchPointers.size === 0) {
        suppressFabricSingleTouch = false;
      }
      if (activeTouchPointers.size === 0 && gestureMode === null && !awaitingAllFingersLift) {
        preTouchActiveId = undefined;
      }
      if (shouldBlock) {
        e.stopPropagation();
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement | null)?.closest('[data-canvas-tap-popover="true"]')) {
        return;
      }
      setCanvasTapPopover(null);
      if (e.touches.length === 1 && preTouchActiveId === undefined) {
        preTouchActiveId = liveRef.current.onGetActiveObjectId?.() ?? null;
      }
      if (e.touches.length === 2) {
        clearLongPressTimer();
        e.preventDefault();
        e.stopPropagation();
        awaitingAllFingersLift = false;
        backdropTouchStart = null;
        if (preTouchActiveId === undefined) {
          preTouchActiveId = liveRef.current.onGetActiveObjectId?.() ?? null;
        }
        const pair = readTouchPoints(e.touches);
        const live = liveRef.current;

        if (live.onBeginObjectPinch?.(pair.t1, pair.t2, preTouchActiveId)) {
          gestureMode = 'object-pinch';
          pinchStart = null;
          return;
        }

        live.onCancelPointerAction?.();
        live.onRestoreSelectionById?.(preTouchActiveId);
        gestureMode = 'viewport-pinch';
        pinchStart = {
          dist: Math.max(pair.dist, 1),
          midX: pair.midX,
          midY: pair.midY,
          scale: live.canvasScale,
          panX: live.pan.x,
          panY: live.pan.y,
        };
      } else if (e.touches.length === 1 && !awaitingAllFingersLift) {
        const isBackdrop = e.target === el;
        const isInFrame = Boolean(frameBoxRef.current?.contains(e.target as Node));
        if (!isBackdrop && !isInFrame) return;

        const hitKind = isBackdrop
          ? 'empty'
          : (liveRef.current.onGetTouchHitKind?.(e) ?? 'empty');
        if (hitKind === 'selected') return;

        e.stopPropagation();
        suppressFabricSingleTouch = true;
        const live = liveRef.current;
        gestureMode = 'backdrop-touch-pan';
        backdropTouchStart = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          panX: live.pan.x,
          panY: live.pan.y,
          moved: false,
          hitKind,
          isInFrame,
          longPressReady: false,
        };
        clearLongPressTimer();
        longPressTimer = window.setTimeout(() => {
          longPressTimer = null;
          if (backdropTouchStart && !backdropTouchStart.moved) {
            backdropTouchStart.longPressReady = true;
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              try {
                navigator.vibrate(12);
              } catch {
                // Ignore vibration restrictions
              }
            }
            showClipboardNotice('Release to paste');
          }
        }, 450);
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
        e.stopPropagation();
        const dx = e.touches[0].clientX - backdropTouchStart.x;
        const dy = e.touches[0].clientY - backdropTouchStart.y;
        if (Math.hypot(dx, dy) > 4) {
          backdropTouchStart.moved = true;
          clearLongPressTimer();
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
        applyPanTransformOnly(clamped.x, clamped.y);
      } else if (awaitingAllFingersLift) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (gestureMode === 'backdrop-touch-pan') {
        clearLongPressTimer();
        e.preventDefault();
        e.stopPropagation();
        commitPendingPan();
        if (backdropTouchStart && !backdropTouchStart.moved && e.touches.length === 0) {
          if (backdropTouchStart.longPressReady) {
            void handleDirectPaste();
          } else if (backdropTouchStart.hitKind === 'unselected') {
            liveRef.current.onSelectObjectAtClientPoint?.(
              backdropTouchStart.x,
              backdropTouchStart.y
            );
          } else if (backdropTouchStart.isInFrame && !preTouchActiveId) {
            openCanvasTapPopover(backdropTouchStart.x, backdropTouchStart.y);
          } else {
            liveRef.current.onDeselectAll();
          }
        }
        backdropTouchStart = null;
        gestureMode = null;
        if (e.touches.length === 0) {
          suppressFabricSingleTouch = false;
          preTouchActiveId = undefined;
        }
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
          if (e.touches.length === 0) {
            suppressFabricSingleTouch = false;
            preTouchActiveId = undefined;
          }
        }
      } else if (awaitingAllFingersLift) {
        e.stopPropagation();
        if (e.touches.length === 0) {
          awaitingAllFingersLift = false;
          suppressFabricSingleTouch = false;
          preTouchActiveId = undefined;
        }
      } else if (e.touches.length === 0) {
        suppressFabricSingleTouch = false;
        preTouchActiveId = undefined;
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
      clearLongPressTimer();
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
  }, [
    applyPanTransformOnly,
    commitPendingPan,
    handleDirectPaste,
    openCanvasTapPopover,
    showClipboardNotice,
  ]);

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
      if (e.key === 'Escape') {
        setCanvasTapPopover(null);
      }
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
      isInFrame: boolean;
      hadActiveObject: boolean;
      moved: boolean;
    } | null = null;

    const onMouseDownCapture = (e: globalThis.MouseEvent) => {
      if ((e.target as HTMLElement | null)?.closest('[data-canvas-tap-popover="true"]')) {
        return;
      }
      setCanvasTapPopover(null);
      const live = liveRef.current;
      const isMiddle = e.button === 1;
      const isSpaceDrag = e.button === 0 && live.isSpacePressed;
      const isBackdropDrag = e.button === 0 && e.target === el;
      const isEmptyCanvasDrag =
        e.button === 0 &&
        !isBackdropDrag &&
        Boolean(
          frameBoxRef.current?.contains(e.target as Node) &&
            live.onCanPanCanvasAt?.(e)
        );

      if (!isMiddle && !isSpaceDrag && !isBackdropDrag && !isEmptyCanvasDrag) {
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
        deselectOnClick: isBackdropDrag || isEmptyCanvasDrag,
        isInFrame: isEmptyCanvasDrag,
        hadActiveObject: Boolean(live.onGetActiveObjectId?.()),
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
      applyPanTransformOnly(clamped.x, clamped.y);
    };

    const onWindowMouseUp = (e: globalThis.MouseEvent) => {
      if (!panDrag) return;
      commitPendingPan();
      if (panDrag.deselectOnClick && !panDrag.moved) {
        if (panDrag.isInFrame && !panDrag.hadActiveObject) {
          openCanvasTapPopover(e.clientX, e.clientY);
        } else {
          liveRef.current.onDeselectAll();
        }
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
  }, [applyPanTransformOnly, commitPendingPan, openCanvasTapPopover]);

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

  const handleOverflowControlPointerDown = useCallback(
    (corner: OverflowControlKey, e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const frame = frameBoxRef.current;
      if (!frame) return;
      const toScene = (clientX: number, clientY: number) => {
        const rect = frame.getBoundingClientRect();
        return {
          x: ((clientX - rect.left) / Math.max(rect.width, 1)) * canvasWidth,
          y: ((clientY - rect.top) / Math.max(rect.height, 1)) * canvasHeight,
        };
      };

      const start = toScene(e.clientX, e.clientY);
      const started = liveRef.current
        ? onBeginOverflowControlDrag?.(corner, start.x, start.y)
        : false;
      if (!started) return;

      const pointerId = e.pointerId;
      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const pt = toScene(ev.clientX, ev.clientY);
        onUpdateOverflowControlDrag?.(pt.x, pt.y, ev.shiftKey);
      };
      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        onEndOverflowControlDrag?.();
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [
      canvasHeight,
      canvasWidth,
      onBeginOverflowControlDrag,
      onEndOverflowControlDrag,
      onUpdateOverflowControlDrag,
    ]
  );

  const isZoomedOrPanned =
    Math.abs(canvasScale - DEFAULT_CANVAS_SCALE) > 0.005 ||
    Math.abs(pan.x) > 1 ||
    Math.abs(pan.y) > 1;

  const isNearOrOutsideCanvas = (pt: { x: number; y: number }) =>
    pt.x < 12 || pt.x > canvasWidth - 12 || pt.y < 12 || pt.y > canvasHeight - 12;

  const isStrictlyOutsideCanvas = (pt: { x: number; y: number }) =>
    pt.x < 0 || pt.x > canvasWidth || pt.y < 0 || pt.y > canvasHeight;

  const hasOverflowSelection = Boolean(
    selectionBox &&
      (isNearOrOutsideCanvas(selectionBox.corners.tl) ||
        isNearOrOutsideCanvas(selectionBox.corners.tr) ||
        isNearOrOutsideCanvas(selectionBox.corners.br) ||
        isNearOrOutsideCanvas(selectionBox.corners.bl) ||
        Object.values(selectionBox.controls).some(
          (pt) => pt && isNearOrOutsideCanvas(pt)
        ))
  );

  const getOverflowControlCursor = (key: OverflowControlKey): string => {
    if (key === 'mtr') return 'grab';
    if (key === 'tl' || key === 'br') return 'nwse-resize';
    if (key === 'tr' || key === 'bl') return 'nesw-resize';
    if (key === 'ml' || key === 'mr') return 'ew-resize';
    return 'ns-resize';
  };

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
          ? 'cursor-grabbing [&_*]:!cursor-grabbing'
          : isSpacePressed
            ? 'cursor-grab'
            : undefined
      )}
    >
      {/* Scaled Canvas Frame + Unclipped Selection Overflow Overlay */}
      <div
        ref={frameWrapperRef}
        className="relative shrink-0"
        style={{
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
          willChange: 'transform',
        }}
      >
        <div
          ref={frameBoxRef}
          className="relative w-full h-full touch-none shadow-[0_12px_40px_rgba(0,0,0,0.65)] ring-1 ring-neutral-800 overflow-hidden checkerboard-bg"
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

        {hasOverflowSelection && selectionBox && (
          <div
            aria-hidden="true"
            className="absolute inset-0 overflow-visible pointer-events-none z-[15]"
          >
            <svg
              viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
              className="w-full h-full overflow-visible pointer-events-none"
            >
              <polygon
                points={`${selectionBox.corners.tl.x},${selectionBox.corners.tl.y} ${selectionBox.corners.tr.x},${selectionBox.corners.tr.y} ${selectionBox.corners.br.x},${selectionBox.corners.br.y} ${selectionBox.corners.bl.x},${selectionBox.corners.bl.y}`}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth={2 / Math.max(canvasScale, 0.1)}
              />
              {selectionBox.controls.mtr && (
                <line
                  x1={(selectionBox.corners.tl.x + selectionBox.corners.tr.x) / 2}
                  y1={(selectionBox.corners.tl.y + selectionBox.corners.tr.y) / 2}
                  x2={selectionBox.controls.mtr.x}
                  y2={selectionBox.controls.mtr.y}
                  stroke="#8b5cf6"
                  strokeWidth={2 / Math.max(canvasScale, 0.1)}
                />
              )}
            </svg>

            {(
              Object.entries(selectionBox.controls) as Array<
                [OverflowControlKey, { x: number; y: number } | undefined]
              >
            ).map(([key, pt]) => {
              if (!pt || !isNearOrOutsideCanvas(pt)) return null;
              const interactive = isStrictlyOutsideCanvas(pt);
              return (
                <button
                  key={key}
                  type="button"
                  tabIndex={-1}
                  data-overflow-handle="true"
                  onPointerDown={
                    interactive
                      ? (e) => handleOverflowControlPointerDown(key, e)
                      : undefined
                  }
                  style={{
                    left: `${(pt.x / canvasWidth) * 100}%`,
                    top: `${(pt.y / canvasHeight) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    cursor: interactive
                      ? getOverflowControlCursor(key)
                      : undefined,
                  }}
                  className={cn(
                    'absolute flex items-center justify-center w-8 h-8 touch-none',
                    interactive ? 'pointer-events-auto' : 'pointer-events-none'
                  )}
                >
                  <span
                    className={cn(
                      'block rounded-full bg-white border-2 border-[#8b5cf6] shadow-sm',
                      key === 'mtr' ? 'w-3.5 h-3.5' : 'w-3 h-3'
                    )}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Instagram-style Vertical Font Size Slider on Left Edge for Mobile */}
      {selectedTextFontSize !== null && onChangeTextFontSize && (
        <MobileFontSizeSlider
          fontSize={selectedTextFontSize}
          onChange={onChangeTextFontSize}
        />
      )}

      {/* Top-right Zoom Controls & Safe Zone Toggle */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-2.5 right-3 z-10 flex items-center gap-1.5"
      >
        {selectedObjectLocked !== null && onToggleLock && (
          <button
            type="button"
            onClick={onToggleLock}
            aria-label={selectedObjectLocked ? 'Unlock selected layer' : 'Lock selected layer'}
            title={selectedObjectLocked ? 'Unlock layer' : 'Lock layer'}
            className={cn(
              'flex items-center justify-center p-2.5 lg:p-1.5 rounded-lg lg:rounded-md border transition-colors',
              selectedObjectLocked
                ? 'bg-neutral-100 border-neutral-100 text-neutral-950'
                : 'bg-[#1c1c1e] border-neutral-700/80 text-neutral-300 hover:text-white'
            )}
          >
            {selectedObjectLocked ? (
              <Lock className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
            ) : (
              <Unlock className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
            )}
          </button>
        )}

        <div
          data-testid="canvas-zoom-controls"
          className="flex items-center gap-0.5 p-1 rounded-lg lg:rounded-md bg-[#1c1c1e] border border-neutral-700/80 text-xs lg:text-[11px] font-mono text-neutral-200"
        >
          <button
            type="button"
            onClick={() => applyZoom((s) => s - SCALE_BUTTON_STEP)}
            disabled={canvasScale <= MIN_CANVAS_SCALE + 0.001}
            aria-label="Zoom out canvas"
            title="Zoom out (Cmd/Ctrl -)"
            className="p-2 lg:p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-35 disabled:pointer-events-none transition-colors"
          >
            <Minus className="w-4 h-4 lg:w-3 lg:h-3" />
          </button>

          <button
            type="button"
            onClick={resetViewport}
            aria-label="Reset canvas zoom"
            title={`Reset to 26% & center (${canvasWidth} × ${canvasHeight})`}
            className="px-2 py-1.5 lg:px-1.5 lg:py-0.5 rounded hover:bg-neutral-800 text-neutral-200 font-medium min-w-[2.75rem] lg:min-w-[2.5rem] text-center transition-colors"
          >
            {Math.round(canvasScale * 100)}%
          </button>

          <button
            type="button"
            onClick={() => applyZoom((s) => s + SCALE_BUTTON_STEP)}
            disabled={canvasScale >= MAX_CANVAS_SCALE - 0.001}
            aria-label="Zoom in canvas"
            title="Zoom in (Cmd/Ctrl +)"
            className="p-2 lg:p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-35 disabled:pointer-events-none transition-colors"
          >
            <Plus className="w-4 h-4 lg:w-3 lg:h-3" />
          </button>

          <button
            type="button"
            onClick={resetViewport}
            aria-label="Reset canvas position and zoom"
            title="Reset to default position & 26% zoom (Cmd/Ctrl 0)"
            className={cn(
              'p-2 lg:p-1 rounded flex items-center justify-center transition-colors',
              isZoomedOrPanned
                ? 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
            )}
          >
            <RotateCcw className="w-3.5 h-3.5 lg:w-3 lg:h-3" />
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenPreview}
          aria-label="Preview Full Size"
          title="Preview Full Size"
          className="flex items-center justify-center p-2.5 lg:p-1.5 rounded-lg lg:rounded-md border bg-[#1c1c1e] border-neutral-700/80 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <Maximize2 className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
        </button>
      </div>

      {/* Canvas Tap Quick-Add Popover */}
      {canvasTapPopover && !textEditingState?.isEditing && (
        <div
          data-canvas-tap-popover="true"
          role="menu"
          aria-label="Quick add to canvas"
          style={{
            left: `${canvasTapPopover.x}px`,
            top: `${canvasTapPopover.y}px`,
            transform: 'translate(-50%, -115%)',
          }}
          className="absolute z-30 flex items-center gap-1 rounded-xl border border-neutral-700/80 bg-neutral-900/95 p-1 shadow-2xl backdrop-blur-md"
        >
          {onAddText && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setCanvasTapPopover(null);
                onAddText();
              }}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 lg:py-1.5 text-xs font-medium text-neutral-100 hover:bg-neutral-800 active:bg-neutral-700 transition-colors whitespace-nowrap"
            >
              <Type className="w-3.5 h-3.5 text-neutral-300" />
              <span>Add Text</span>
            </button>
          )}
          {onTriggerImageUpload && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setCanvasTapPopover(null);
                onTriggerImageUpload();
              }}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 lg:py-1.5 text-xs font-medium text-neutral-100 hover:bg-neutral-800 active:bg-neutral-700 transition-colors whitespace-nowrap"
            >
              <ImagePlus className="w-3.5 h-3.5 text-neutral-300" />
              <span>Add Image</span>
            </button>
          )}
          {canvasTapPopover.showPaste && (
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleDirectPaste()}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 lg:py-1.5 text-xs font-medium text-neutral-100 hover:bg-neutral-800 active:bg-neutral-700 transition-colors whitespace-nowrap"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-neutral-300" />
              <span>Paste</span>
            </button>
          )}
          <svg
            aria-hidden="true"
            width="20"
            height="10"
            viewBox="0 0 20 10"
            className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 -mt-px"
          >
            <path d="M0 0 L10 9.5 L20 0 Z" fill="rgb(23 23 23 / 0.95)" />
            <path
              d="M0.5 0 L10 9 L19.5 0"
              fill="none"
              stroke="rgb(64 64 64 / 0.8)"
              strokeWidth="1"
            />
          </svg>
        </div>
      )}

      {/* Brief Clipboard Feedback Toast */}
      {clipboardNotice && (
        <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-30 rounded-full border border-neutral-700/80 bg-neutral-900/95 px-3 py-1.5 text-xs font-medium text-neutral-200 shadow-lg backdrop-blur-md">
          {clipboardNotice}
        </div>
      )}

      {/* Drag & Drop Image Overlay */}
      {isDraggingFile && (
        <div className="pointer-events-none absolute inset-4 rounded-lg border border-dashed border-neutral-500 bg-neutral-950/80 flex flex-col items-center justify-center gap-2 z-30">
          <div className="w-10 h-10 rounded-md bg-neutral-900 border border-neutral-700 flex items-center justify-center text-neutral-200">
            <ImagePlus className="w-5 h-5" />
          </div>
          <p className="text-xs font-medium text-neutral-100">
            Drop image to add layer
          </p>
        </div>
      )}

      {/* Floating Inline Text Formatting Popover */}
      {textEditingState?.isEditing &&
        onApplyEditingStyle &&
        onSelectAllEditingText &&
        onExitTextEditing && (
          <TextEditingPopover
            editingState={textEditingState}
            onApplyStyle={onApplyEditingStyle}
            onSelectAll={onSelectAllEditingText}
            onDone={onExitTextEditing}
          />
        )}
    </div>
  );
}
