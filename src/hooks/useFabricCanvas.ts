import { useCallback, useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import {
  ASPECT_RATIO_PRESETS,
  type AspectRatioKey,
  type BackgroundImageConfig,
  type BackgroundMode,
  type BackgroundState,
  type CutoutShape,
  type GradientConfig,
  type LayerItem,
  type SelectedObjectState,
  type TextBackgroundStyle,
} from '../types/editor';
import {
  DEFAULT_BG_ADJUSTMENTS,
  applyBackgroundImageAdjustments,
  isNeutralAdjustments,
  type AdjustmentQuality,
} from '../utils/backgroundFilters';
import {
  CUSTOM_SERIALIZED_PROPS,
  DEFAULT_OVERLAY_GRADIENT,
  createEditorId,
  createLinearGradient,
  ensureObjectMeta,
  extractLayersList,
  extractSelectedState,
  positionBackgroundImage,
  prepareBackgroundImageDataURL,
  readFileAsDataURL,
  renderBackgroundOverlayGradient,
  type FabricObjectWithMeta,
} from '../utils/canvasHelpers';
import { exportCanvasToPNG } from '../utils/exportCanvas';
import { ensureFrauncesFontData, isFrauncesFamily } from '../utils/frauncesSvg';
import {
  SUPPORTED_FONTS,
  loadFont,
  preloadAllFonts,
  registerCustomFontFile,
  snapToSupportedWeight,
  type FontOption,
} from '../utils/fonts';
import { applyCutoutMask } from '../utils/imageCutouts';
import {
  renderGuidesOnTopContext,
  snapObjectToGuides,
  snapRotationAngle,
  type ActiveRotationSnap,
  type ActiveSnapGuides,
} from '../utils/snapGuides';
import { StoryTextbox } from '../utils/storyTextbox';

interface HistorySnapshot {
  aspectRatio: AspectRatioKey;
  background: BackgroundState;
  canvasJson: Record<string, unknown>;
}

interface ObjectPinchSession {
  target: fabric.FabricObject;
  initialDist: number;
  initialScaleX: number;
  initialScaleY: number;
  initialCenter: fabric.Point;
  initialMidCanvas: { x: number; y: number };
  isTextbox: boolean;
}

const EMPTY_SNAP_GUIDES: ActiveSnapGuides = {
  x: null,
  xKind: null,
  y: null,
  yKind: null,
  isDragging: false,
};

function normalizeTextboxScale(target: fabric.FabricObject): boolean {
  if (!(target instanceof StoryTextbox || target instanceof fabric.Textbox)) {
    return false;
  }
  const sx = Math.abs(target.scaleX ?? 1);
  const sy = Math.abs(target.scaleY ?? 1);
  if (Math.abs(sx - 1) <= 0.001 && Math.abs(sy - 1) <= 0.001) {
    return false;
  }

  const uniformScale = (sx + sy) / 2;
  const prevCenter = target.getCenterPoint();
  const baseFontSize = target.fontSize || 48;
  const nextFontSize = Math.max(
    12,
    Math.min(400, Math.round(baseFontSize * uniformScale))
  );
  const factor = nextFontSize / baseFontSize;
  const nextWidth = Math.max(20, (target.width || 100) * factor);
  target.set({
    fontSize: nextFontSize,
    width: nextWidth,
    scaleX: 1,
    scaleY: 1,
  });
  if (target instanceof StoryTextbox) {
    target.set({
      pillRadius: Math.max(4, Math.round((target.pillRadius ?? 20) * factor)),
      pillPaddingX: Math.max(
        4,
        Math.round((target.pillPaddingX ?? 24) * factor)
      ),
      pillPaddingY: Math.max(
        2,
        Math.round((target.pillPaddingY ?? 8) * factor)
      ),
    });
  }
  target.initDimensions();
  target.setPositionByOrigin(prevCenter, 'center', 'center');
  target.setCoords();
  return true;
}

function clientPointToCanvas(
  canvas: fabric.Canvas,
  clientPt: { x: number; y: number }
): { x: number; y: number; cssScale: number } | null {
  const rect = canvas.getElement().getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const cw = canvas.width || 1080;
  const ch = canvas.height || 1350;
  return {
    x: ((clientPt.x - rect.left) / rect.width) * cw,
    y: ((clientPt.y - rect.top) / rect.height) * ch,
    cssScale: rect.width / cw,
  };
}

function isPointNearObject(
  obj: fabric.FabricObject,
  point: { x: number; y: number },
  padCanvas: number
): boolean {
  const center = obj.getCenterPoint();
  const rad = -((obj.angle ?? 0) * Math.PI) / 180;
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  const halfW = obj.getScaledWidth() / 2 + padCanvas;
  const halfH = obj.getScaledHeight() / 2 + padCanvas;
  return Math.abs(lx) <= halfW && Math.abs(ly) <= halfH;
}

const DEFAULT_BACKGROUND: BackgroundState = {
  mode: 'gradient',
  color: '#FE5925',
  gradient: {
    startColor: '#2e1065',
    endColor: '#c026d3',
    angle: 145,
  },
  image: null,
};

const MAX_HISTORY = 40;

function applyControlStyling(): void {
  Object.assign(fabric.InteractiveFabricObject.ownDefaults, {
    cornerColor: '#ffffff',
    cornerStrokeColor: '#8b5cf6',
    borderColor: '#8b5cf6',
    cornerStyle: 'circle',
    cornerSize: 20,
    touchCornerSize: 34,
    transparentCorners: false,
    borderScaleFactor: 2.5,
    padding: 10,
  });
}

function applyLockState(obj: fabric.FabricObject, locked: boolean): void {
  const meta = ensureObjectMeta(obj);
  meta.locked = locked;
  obj.set({
    lockMovementX: locked,
    lockMovementY: locked,
    lockRotation: locked,
    lockScalingX: locked,
    lockScalingY: locked,
    hasControls: !locked,
    editable: obj instanceof fabric.Textbox ? !locked : undefined,
  });
  obj.setCoords();
}

export function useFabricCanvas() {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = useRef<fabric.Canvas | null>(null);

  const [aspectRatio, setAspectRatioState] = useState<AspectRatioKey>('4:5');
  const [background, setBackgroundState] = useState<BackgroundState>(DEFAULT_BACKGROUND);
  const [selectedObject, setSelectedObject] = useState<SelectedObjectState | null>(null);
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [availableFonts, setAvailableFonts] = useState<FontOption[]>(SUPPORTED_FONTS);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [showSafeArea, setShowSafeArea] = useState(false);

  const aspectRatioRef = useRef<AspectRatioKey>('4:5');
  const backgroundRef = useRef<BackgroundState>(DEFAULT_BACKGROUND);
  const fontsRef = useRef<FontOption[]>(SUPPORTED_FONTS);
  const showSafeAreaRef = useRef<boolean>(false);
  const activeSnapGuidesRef = useRef<ActiveSnapGuides>({
    x: null,
    xKind: null,
    y: null,
    yKind: null,
    isDragging: false,
  });
  const activeRotationSnapRef = useRef<ActiveRotationSnap>({
    isRotating: false,
    angle: 0,
    snapped: false,
  });

  const historyRef = useRef<HistorySnapshot[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isRestoringRef = useRef<boolean>(false);
  const historyTimerRef = useRef<number | null>(null);
  const bgUpdateRafRef = useRef<number | null>(null);
  const bgFullResTimerRef = useRef<number | null>(null);
  const objectPinchRef = useRef<ObjectPinchSession | null>(null);

  const preset = ASPECT_RATIO_PRESETS[aspectRatio];

  const syncSelectionAndLayers = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    setSelectedObject(extractSelectedState(active));
    setLayers(extractLayersList(canvas));
  }, []);

  const updateUndoRedoFlags = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(
      historyIndexRef.current >= 0 &&
        historyIndexRef.current < historyRef.current.length - 1
    );
  }, []);

  const commitHistoryNow = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isRestoringRef.current) return;

    if (historyTimerRef.current !== null) {
      window.clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
    }

    const canvasJson = canvas.toObject(CUSTOM_SERIALIZED_PROPS) as Record<
      string,
      unknown
    >;

    const snapshot: HistorySnapshot = {
      aspectRatio: aspectRatioRef.current,
      background: structuredClone(backgroundRef.current),
      canvasJson,
    };

    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    nextHistory.push(snapshot);
    if (nextHistory.length > MAX_HISTORY) {
      nextHistory.shift();
    }
    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
    updateUndoRedoFlags();
  }, [updateUndoRedoFlags]);

  const scheduleHistoryCommit = useCallback(
    (delay = 280) => {
      if (isRestoringRef.current) return;
      if (historyTimerRef.current !== null) {
        window.clearTimeout(historyTimerRef.current);
      }
      historyTimerRef.current = window.setTimeout(() => {
        historyTimerRef.current = null;
        commitHistoryNow();
      }, delay);
    },
    [commitHistoryNow]
  );

  const cancelPendingBgWork = useCallback(() => {
    if (bgUpdateRafRef.current !== null) {
      window.cancelAnimationFrame(bgUpdateRafRef.current);
      bgUpdateRafRef.current = null;
    }
    if (bgFullResTimerRef.current !== null) {
      window.clearTimeout(bgFullResTimerRef.current);
      bgFullResTimerRef.current = null;
    }
  }, []);

  const restoreSnapshot = useCallback(
    async (snapshot: HistorySnapshot) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      cancelPendingBgWork();
      isRestoringRef.current = true;
      try {
        const targetPreset = ASPECT_RATIO_PRESETS[snapshot.aspectRatio];
        if (
          canvas.width !== targetPreset.width ||
          canvas.height !== targetPreset.height
        ) {
          canvas.setDimensions({
            width: targetPreset.width,
            height: targetPreset.height,
          });
        }

        aspectRatioRef.current = snapshot.aspectRatio;
        setAspectRatioState(snapshot.aspectRatio);

        backgroundRef.current = structuredClone(snapshot.background);
        setBackgroundState(structuredClone(snapshot.background));

        await canvas.loadFromJSON(snapshot.canvasJson);

        canvas.getObjects().forEach((obj) => {
          const meta = ensureObjectMeta(obj);
          if (meta.locked) {
            applyLockState(obj, true);
          }
          if (obj instanceof StoryTextbox) {
            obj.dirty = true;
            obj.initDimensions();
            obj.setCoords();
          }
        });

        canvas.discardActiveObject();
        if (
          snapshot.background.mode === 'image' &&
          snapshot.background.image &&
          canvas.backgroundImage instanceof fabric.FabricImage
        ) {
          applyBackgroundImageAdjustments(
            canvas.backgroundImage,
            snapshot.background.image.adjustments
          );
        }
        canvas.requestRenderAll();
        syncSelectionAndLayers();
      } finally {
        isRestoringRef.current = false;
        updateUndoRedoFlags();
      }
    },
    [cancelPendingBgWork, syncSelectionAndLayers, updateUndoRedoFlags]
  );

  const undo = useCallback(async () => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    await restoreSnapshot(snapshot);
  }, [restoreSnapshot]);

  const redo = useCallback(async () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    await restoreSnapshot(snapshot);
  }, [restoreSnapshot]);

  const applyCanvasBackground = useCallback(
    async (
      nextBg: BackgroundState,
      targetWidth: number,
      targetHeight: number,
      adjustmentQuality: AdjustmentQuality = 'full'
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (nextBg.mode === 'color') {
        canvas.backgroundImage = undefined;
        canvas.backgroundColor = nextBg.color;
        canvas.requestRenderAll();
        return;
      }

      if (nextBg.mode === 'gradient') {
        canvas.backgroundImage = undefined;
        canvas.backgroundColor = createLinearGradient(
          targetWidth,
          targetHeight,
          nextBg.gradient
        );
        canvas.requestRenderAll();
        return;
      }

      if (nextBg.mode === 'image') {
        canvas.backgroundColor = nextBg.color || '#09090b';
        if (!nextBg.image) {
          canvas.backgroundImage = undefined;
          canvas.requestRenderAll();
          return;
        }

        const existingBg = canvas.backgroundImage;
        if (
          existingBg instanceof fabric.FabricImage &&
          existingBg.getSrc() === nextBg.image.src
        ) {
          positionBackgroundImage(existingBg, targetWidth, targetHeight, nextBg.image);
          applyBackgroundImageAdjustments(
            existingBg,
            nextBg.image.adjustments,
            adjustmentQuality
          );
          canvas.requestRenderAll();
          return;
        }

        const img = await fabric.FabricImage.fromURL(nextBg.image.src, {
          crossOrigin: 'anonymous',
        });
        positionBackgroundImage(img, targetWidth, targetHeight, nextBg.image);
        applyBackgroundImageAdjustments(img, nextBg.image.adjustments, 'full');
        canvas.backgroundImage = img;
        canvas.requestRenderAll();
      }
    },
    []
  );

  // Initialize Fabric canvas once
  useEffect(() => {
    const el = canvasElRef.current;
    if (!el) return;

    applyControlStyling();

    const initialPreset = ASPECT_RATIO_PRESETS['4:5'];
    const canvas = new fabric.Canvas(el, {
      width: initialPreset.width,
      height: initialPreset.height,
      preserveObjectStacking: true,
      selection: true,
      backgroundColor: '#18181b',
    });

    const rawCanvas = canvas as unknown as {
      _renderBackground: (ctx: CanvasRenderingContext2D) => void;
    };
    const origRenderBackground = rawCanvas._renderBackground.bind(canvas);
    rawCanvas._renderBackground = (ctx: CanvasRenderingContext2D) => {
      origRenderBackground(ctx);
      const currentBg = backgroundRef.current;
      if (currentBg.mode === 'image' && currentBg.image?.overlayGradient) {
        renderBackgroundOverlayGradient(
          ctx,
          canvas.width || initialPreset.width,
          canvas.height || initialPreset.height,
          currentBg.image.overlayGradient
        );
      }
    };

    canvasRef.current = canvas;
    canvas.backgroundColor = createLinearGradient(
      initialPreset.width,
      initialPreset.height,
      DEFAULT_BACKGROUND.gradient
    );

    // Seed an editorial starter text layer so the canvas feels alive immediately
    const starterTitle = new StoryTextbox('Tap to craft\nyour story', {
      left: initialPreset.width / 2,
      top: initialPreset.height * 0.44,
      width: 780,
      originX: 'center',
      originY: 'center',
      fontFamily: 'Fedro',
      fontSize: 96,
      fontWeight: 700,
      fontSoft: 100,
      fill: '#ffffff',
      textAlign: 'center',
      lineHeight: 0.85,
      bgStyle: 'none',
      textBgColor: '#ffffff',
      editorName: 'Headline',
    });

    canvas.add(starterTitle);
    canvas.setActiveObject(starterTitle);
    canvas.requestRenderAll();

    // Sync initial React state & seed history[0]
    syncSelectionAndLayers();
    commitHistoryNow();

    // Preload Fedro, Fraunces, Inter, Montserrat and re-measure when ready
    void preloadAllFonts().then(() => {
      if (!canvasRef.current) return;
      fontsRef.current.forEach((f) => fabric.cache.clearFontCache(f.family));
      canvasRef.current.getObjects().forEach((obj) => {
        if (obj instanceof fabric.Textbox) {
          obj.dirty = true;
          obj.initDimensions();
          obj.setCoords();
        }
      });
      canvasRef.current.requestRenderAll();
    });

    const handleSelection = () => {
      syncSelectionAndLayers();
    };

    const clearSnapGuides = () => {
      if (
        activeSnapGuidesRef.current.isDragging ||
        activeRotationSnapRef.current.isRotating
      ) {
        activeSnapGuidesRef.current = {
          x: null,
          xKind: null,
          y: null,
          yKind: null,
          isDragging: false,
        };
        activeRotationSnapRef.current = {
          isRotating: false,
          angle: 0,
          snapped: false,
        };
        canvas.requestRenderAll();
      }
    };

    const handleObjectMoving = (e: { target?: fabric.FabricObject }) => {
      if (!e.target) return;
      const { width, height } = ASPECT_RATIO_PRESETS[aspectRatioRef.current];
      activeSnapGuidesRef.current = snapObjectToGuides(e.target, width, height);
    };

    const handleObjectRotating = (e: { target?: fabric.FabricObject }) => {
      if (!e.target) return;
      activeRotationSnapRef.current = snapRotationAngle(e.target);
    };

    const handleObjectScaling = (e: { target?: fabric.FabricObject }) => {
      const target = e.target;
      if (
        target &&
        (target instanceof StoryTextbox || target instanceof fabric.Textbox)
      ) {
        const uniformScale = Math.max(0.05, Math.abs(target.scaleX || 1));
        if (
          Math.abs((target.scaleX || 1) - uniformScale) > 0.0001 ||
          Math.abs((target.scaleY || 1) - uniformScale) > 0.0001
        ) {
          target.set({ scaleX: uniformScale, scaleY: uniformScale });
        }
      }
    };

    const handleObjectModified = (e?: { target?: fabric.FabricObject }) => {
      const target = e?.target;
      if (target && normalizeTextboxScale(target)) {
        canvas.requestRenderAll();
      }
      clearSnapGuides();
      syncSelectionAndLayers();
      commitHistoryNow();
    };

    const handleTextChanged = () => {
      syncSelectionAndLayers();
      scheduleHistoryCommit(350);
    };

    const handleStackChange = () => {
      syncSelectionAndLayers();
      if (!isRestoringRef.current) {
        scheduleHistoryCommit(150);
      }
    };

    const handleAfterRender = ({ ctx }: { ctx: CanvasRenderingContext2D }) => {
      if (ctx !== canvas.getContext()) return;
      renderGuidesOnTopContext(
        canvas,
        activeSnapGuidesRef.current,
        showSafeAreaRef.current,
        activeRotationSnapRef.current
      );
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => {
      clearSnapGuides();
      handleSelection();
    });
    canvas.on('object:moving', handleObjectMoving);
    canvas.on('object:rotating', handleObjectRotating);
    canvas.on('object:scaling', handleObjectScaling);
    canvas.on('object:modified', handleObjectModified);
    canvas.on('mouse:up', clearSnapGuides);
    canvas.on('text:changed', handleTextChanged);
    canvas.on('object:added', handleStackChange);
    canvas.on('object:removed', handleStackChange);
    canvas.on('after:render', handleAfterRender);

    return () => {
      if (historyTimerRef.current !== null) {
        window.clearTimeout(historyTimerRef.current);
      }
      cancelPendingBgWork();
      canvas.dispose();
      canvasRef.current = null;
    };
  }, [cancelPendingBgWork, commitHistoryNow, scheduleHistoryCommit, syncSelectionAndLayers]);

  const setAspectRatio = useCallback(
    async (nextRatio: AspectRatioKey) => {
      const canvas = canvasRef.current;
      if (!canvas || nextRatio === aspectRatioRef.current) return;

      cancelPendingBgWork();
      const prevPreset = ASPECT_RATIO_PRESETS[aspectRatioRef.current];
      const nextPreset = ASPECT_RATIO_PRESETS[nextRatio];

      canvas.setDimensions({
        width: nextPreset.width,
        height: nextPreset.height,
      });

      // Keep objects nicely centered relative to canvas center shift
      const dx = (nextPreset.width - prevPreset.width) / 2;
      const dy = (nextPreset.height - prevPreset.height) / 2;
      canvas.getObjects().forEach((obj) => {
        obj.set({
          left: (obj.left ?? 0) + dx,
          top: (obj.top ?? 0) + dy,
        });
        obj.setCoords();
      });

      aspectRatioRef.current = nextRatio;
      setAspectRatioState(nextRatio);

      await applyCanvasBackground(
        backgroundRef.current,
        nextPreset.width,
        nextPreset.height
      );

      canvas.calcOffset();
      canvas.requestRenderAll();
      syncSelectionAndLayers();
      commitHistoryNow();
    },
    [applyCanvasBackground, cancelPendingBgWork, commitHistoryNow, syncSelectionAndLayers]
  );

  const setBackgroundMode = useCallback(
    async (mode: BackgroundMode) => {
      const next: BackgroundState = { ...backgroundRef.current, mode };
      backgroundRef.current = next;
      setBackgroundState(next);
      const { width, height } = ASPECT_RATIO_PRESETS[aspectRatioRef.current];
      await applyCanvasBackground(next, width, height);
      commitHistoryNow();
    },
    [applyCanvasBackground, commitHistoryNow]
  );

  const setBackgroundColor = useCallback(
    async (color: string) => {
      const next: BackgroundState = {
        ...backgroundRef.current,
        mode: 'color',
        color,
      };
      backgroundRef.current = next;
      setBackgroundState(next);
      const { width, height } = ASPECT_RATIO_PRESETS[aspectRatioRef.current];
      await applyCanvasBackground(next, width, height);
      scheduleHistoryCommit(250);
    },
    [applyCanvasBackground, scheduleHistoryCommit]
  );

  const setBackgroundGradient = useCallback(
    async (gradient: GradientConfig) => {
      const next: BackgroundState = {
        ...backgroundRef.current,
        mode: 'gradient',
        gradient,
      };
      backgroundRef.current = next;
      setBackgroundState(next);
      const { width, height } = ASPECT_RATIO_PRESETS[aspectRatioRef.current];
      await applyCanvasBackground(next, width, height);
      scheduleHistoryCommit(250);
    },
    [applyCanvasBackground, scheduleHistoryCommit]
  );

  const setBackgroundImageFromFile = useCallback(
    async (file: File) => {
      cancelPendingBgWork();
      const src = await prepareBackgroundImageDataURL(file);
      const next: BackgroundState = {
        ...backgroundRef.current,
        mode: 'image',
        image: {
          src,
          zoom: 1,
          panX: 0,
          panY: 0,
          fitMode: 'cover',
          overlayGradient: { ...DEFAULT_OVERLAY_GRADIENT },
          adjustments: { ...DEFAULT_BG_ADJUSTMENTS },
        },
      };
      backgroundRef.current = next;
      setBackgroundState(next);
      const { width, height } = ASPECT_RATIO_PRESETS[aspectRatioRef.current];
      await applyCanvasBackground(next, width, height, 'full');
      commitHistoryNow();
    },
    [applyCanvasBackground, cancelPendingBgWork, commitHistoryNow]
  );

  const updateBackgroundImageConfig = useCallback(
    async (patch: Partial<BackgroundImageConfig>) => {
      const currentImage = backgroundRef.current.image;
      if (!currentImage) return;

      const next: BackgroundState = {
        ...backgroundRef.current,
        mode: 'image',
        image: { ...currentImage, ...patch },
      };
      backgroundRef.current = next;
      setBackgroundState(next);

      const hasAdjustmentPatch = patch.adjustments !== undefined;
      const usePreview =
        hasAdjustmentPatch && !isNeutralAdjustments(next.image?.adjustments);

      if (bgUpdateRafRef.current !== null) {
        window.cancelAnimationFrame(bgUpdateRafRef.current);
      }
      bgUpdateRafRef.current = window.requestAnimationFrame(() => {
        bgUpdateRafRef.current = null;
        const { width, height } = ASPECT_RATIO_PRESETS[aspectRatioRef.current];
        void applyCanvasBackground(
          backgroundRef.current,
          width,
          height,
          usePreview ? 'preview' : 'full'
        );
      });

      if (bgFullResTimerRef.current !== null) {
        window.clearTimeout(bgFullResTimerRef.current);
        bgFullResTimerRef.current = null;
      }
      if (usePreview) {
        bgFullResTimerRef.current = window.setTimeout(() => {
          bgFullResTimerRef.current = null;
          const { width, height } = ASPECT_RATIO_PRESETS[aspectRatioRef.current];
          void applyCanvasBackground(
            backgroundRef.current,
            width,
            height,
            'full'
          );
        }, 120);
      }

      scheduleHistoryCommit(250);
    },
    [applyCanvasBackground, scheduleHistoryCommit]
  );

  const removeBackgroundImage = useCallback(async () => {
    cancelPendingBgWork();
    const next: BackgroundState = {
      ...backgroundRef.current,
      mode: 'color',
      image: null,
    };
    backgroundRef.current = next;
    setBackgroundState(next);
    const { width, height } = ASPECT_RATIO_PRESETS[aspectRatioRef.current];
    await applyCanvasBackground(next, width, height, 'full');
    commitHistoryNow();
  }, [applyCanvasBackground, cancelPendingBgWork, commitHistoryNow]);

  const addText = useCallback(
    async (presetType: 'headline' | 'pill' | 'body' = 'headline') => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { width, height } = ASPECT_RATIO_PRESETS[aspectRatioRef.current];

      const configs = {
        headline: {
          text: 'Editorial Heading',
          fontFamily: 'Fedro',
          fontSize: 84,
          fontWeight: 700,
          fill: '#ffffff',
          bgStyle: 'none' as TextBackgroundStyle,
          textBgColor: '#ffffff',
          boxWidth: 740,
          lineHeight: 0.85,
          charSpacing: 0,
          name: 'Headline',
        },
        pill: {
          text: 'Story Highlight',
          fontFamily: 'Inter',
          fontSize: 48,
          fontWeight: 700,
          fill: '#18181b',
          bgStyle: 'pill' as TextBackgroundStyle,
          textBgColor: '#ffffff',
          boxWidth: 620,
          lineHeight: 0.85,
          charSpacing: 0,
          name: 'Pill Text',
        },
        body: {
          text: 'Write your caption or quote here. Drag side handles to wrap lines.',
          fontFamily: 'Fedro',
          fontSize: 44,
          fontWeight: 400,
          fill: '#f4f4f5',
          bgStyle: 'none' as TextBackgroundStyle,
          textBgColor: '#18181b',
          boxWidth: 720,
          lineHeight: 0.85,
          charSpacing: 10,
          name: 'Body Text',
        },
      };

      const cfg = configs[presetType];
      const fontOption = fontsRef.current.find((f) => f.family === cfg.fontFamily);
      if (fontOption) {
        await loadFont(fontOption, cfg.fontWeight, 'normal');
        if (isFrauncesFamily(fontOption.family)) {
          await ensureFrauncesFontData();
        }
        fabric.cache.clearFontCache(fontOption.family);
      }

      const textbox = new StoryTextbox(cfg.text, {
        left: width / 2,
        top: height / 2,
        width: cfg.boxWidth,
        originX: 'center',
        originY: 'center',
        fontFamily: cfg.fontFamily,
        fontSize: cfg.fontSize,
        fontWeight: cfg.fontWeight,
        fontOpsz: Math.min(144, Math.max(9, Math.round(cfg.fontSize))),
        fontSoft: 100,
        fontWonk: 0,
        fill: cfg.fill,
        textAlign: 'center',
        lineHeight: cfg.lineHeight,
        charSpacing: cfg.charSpacing,
        bgStyle: cfg.bgStyle,
        textBgColor: cfg.textBgColor,
        pillRadius: 24,
        pillPaddingX: 28,
        pillPaddingY: 10,
        editorName: cfg.name,
      });

      canvas.add(textbox);
      canvas.setActiveObject(textbox);
      canvas.requestRenderAll();
      syncSelectionAndLayers();
      commitHistoryNow();
    },
    [commitHistoryNow, syncSelectionAndLayers]
  );

  const updateTextProps = useCallback(
    async (
      patch: Partial<{
        text: string;
        fontFamily: string;
        fontSize: number;
        fontWeight: number;
        fontStyle: 'normal' | 'italic';
        fontOpsz: number;
        fontSoft: number;
        fontWonk: number;
        underline: boolean;
        linethrough: boolean;
        textAlign: 'left' | 'center' | 'right' | 'justify';
        fill: string;
        lineHeight: number;
        charSpacing: number;
        bgStyle: TextBackgroundStyle;
        textBgColor: string;
        pillRadius: number;
        pillPaddingX: number;
        pillPaddingY: number;
      }>
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject();
      if (!(active instanceof StoryTextbox || active instanceof fabric.Textbox)) {
        return;
      }

      const effectivePatch = { ...patch };
      const nextFamily = effectivePatch.fontFamily ?? active.fontFamily;

      if (effectivePatch.fontFamily !== undefined) {
        const wasFraunces = isFrauncesFamily(active.fontFamily);
        const willBeFraunces = isFrauncesFamily(nextFamily);

        if (willBeFraunces && !wasFraunces) {
          effectivePatch.fontWeight = effectivePatch.fontWeight ?? 600;
          effectivePatch.fontSoft = effectivePatch.fontSoft ?? 100;
          effectivePatch.fontOpsz =
            effectivePatch.fontOpsz ??
            Math.min(144, Math.max(9, Math.round(active.fontSize || 72)));
        } else if (!willBeFraunces && effectivePatch.fontWeight === undefined) {
          const currentWeight =
            typeof active.fontWeight === 'number'
              ? active.fontWeight
              : parseInt(String(active.fontWeight), 10) || 400;
          effectivePatch.fontWeight = snapToSupportedWeight(
            currentWeight,
            nextFamily,
            fontsRef.current
          );
        }
      }

      const nextWeight = effectivePatch.fontWeight ?? active.fontWeight;
      const nextStyle = effectivePatch.fontStyle ?? active.fontStyle;

      if (
        effectivePatch.fontFamily !== undefined ||
        effectivePatch.fontWeight !== undefined ||
        effectivePatch.fontStyle !== undefined
      ) {
        const fontOption = fontsRef.current.find((f) => f.family === nextFamily);
        if (fontOption) {
          await loadFont(fontOption, nextWeight, nextStyle);
        }
        if (isFrauncesFamily(nextFamily)) {
          await ensureFrauncesFontData();
        }
        fabric.cache.clearFontCache(nextFamily);
      }

      active.set(effectivePatch);
      active.dirty = true;
      active.initDimensions();
      active.setCoords();
      canvas.requestRenderAll();

      syncSelectionAndLayers();
      scheduleHistoryCommit(250);
    },
    [scheduleHistoryCommit, syncSelectionAndLayers]
  );

  const uploadCustomFont = useCallback(async (file: File) => {
    const newFont = await registerCustomFontFile(file);
    setAvailableFonts((prev) => {
      const exists = prev.some(
        (f) => f.family.toLowerCase() === newFont.family.toLowerCase()
      );
      const next = exists ? prev : [newFont, ...prev];
      fontsRef.current = next;
      return next;
    });

    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (canvas && (active instanceof StoryTextbox || active instanceof fabric.Textbox)) {
      fabric.cache.clearFontCache(newFont.family);
      active.set({ fontFamily: newFont.family });
      active.initDimensions();
      active.setCoords();
      canvas.requestRenderAll();
      syncSelectionAndLayers();
      commitHistoryNow();
    }
    return newFont;
  }, [commitHistoryNow, syncSelectionAndLayers]);

  const addImageFromFile = useCallback(
    async (file: File) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const src = await readFileAsDataURL(file);
      const img = await fabric.FabricImage.fromURL(src, {
        crossOrigin: 'anonymous',
      });

      const { width, height } = ASPECT_RATIO_PRESETS[aspectRatioRef.current];
      const maxTargetW = width * 0.72;
      const maxTargetH = height * 0.56;
      const scale = Math.min(
        maxTargetW / (img.width || 1),
        maxTargetH / (img.height || 1),
        1
      );

      const meta = ensureObjectMeta(img) as FabricObjectWithMeta & {
        cutoutShape?: CutoutShape;
        cutoutRadius?: number;
      };
      meta.editorName = file.name.replace(/\.[^/.]+$/, '').slice(0, 24) || 'Image';
      meta.cutoutShape = 'none';
      meta.cutoutRadius = 16;

      img.set({
        left: width / 2,
        top: height / 2,
        originX: 'center',
        originY: 'center',
        scaleX: scale,
        scaleY: scale,
      });

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
      syncSelectionAndLayers();
      commitHistoryNow();
    },
    [commitHistoryNow, syncSelectionAndLayers]
  );

  const applyImageCutout = useCallback(
    (shape: CutoutShape, cornerPercent?: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject();
      if (!(active instanceof fabric.FabricImage)) return;

      const currentRadius =
        cornerPercent ??
        ((active as { cutoutRadius?: number }).cutoutRadius ?? 16);

      applyCutoutMask(active, shape, currentRadius);
      canvas.requestRenderAll();
      syncSelectionAndLayers();
      scheduleHistoryCommit(200);
    },
    [scheduleHistoryCommit, syncSelectionAndLayers]
  );

  const updateActiveCommonProps = useCallback(
    (
      patch: Partial<{
        opacity: number;
        angle: number;
        flipX: boolean;
        flipY: boolean;
        resetTransform: boolean;
      }>
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject();
      if (!active) return;

      if (patch.resetTransform) {
        const { width, height } = ASPECT_RATIO_PRESETS[aspectRatioRef.current];
        active.set({
          angle: 0,
          flipX: false,
          flipY: false,
          left: width / 2,
          top: height / 2,
        });
        if (active instanceof fabric.FabricImage) {
          const scale = Math.min(
            (width * 0.72) / (active.width || 1),
            (height * 0.56) / (active.height || 1),
            1
          );
          active.set({ scaleX: scale, scaleY: scale });
        } else {
          active.set({ scaleX: 1, scaleY: 1 });
        }
      } else {
        const { resetTransform: _ignored, ...rest } = patch;
        void _ignored;
        active.set(rest);
      }

      active.setCoords();
      canvas.requestRenderAll();
      syncSelectionAndLayers();
      scheduleHistoryCommit(200);
    },
    [scheduleHistoryCommit, syncSelectionAndLayers]
  );

  const bringForward = useCallback(() => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    canvas.bringObjectForward(active);
    canvas.requestRenderAll();
    syncSelectionAndLayers();
    commitHistoryNow();
  }, [commitHistoryNow, syncSelectionAndLayers]);

  const sendBackward = useCallback(() => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    canvas.sendObjectBackwards(active);
    canvas.requestRenderAll();
    syncSelectionAndLayers();
    commitHistoryNow();
  }, [commitHistoryNow, syncSelectionAndLayers]);

  const bringToFront = useCallback(() => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    canvas.bringObjectToFront(active);
    canvas.requestRenderAll();
    syncSelectionAndLayers();
    commitHistoryNow();
  }, [commitHistoryNow, syncSelectionAndLayers]);

  const sendToBack = useCallback(() => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    canvas.sendObjectToBack(active);
    canvas.requestRenderAll();
    syncSelectionAndLayers();
    commitHistoryNow();
  }, [commitHistoryNow, syncSelectionAndLayers]);

  const duplicateActiveObject = useCallback(async () => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;

    const cloned = await active.clone(CUSTOM_SERIALIZED_PROPS);
    const meta = ensureObjectMeta(cloned);
    meta.editorId = createEditorId();
    meta.editorName = `${ensureObjectMeta(active).editorName || 'Layer'} Copy`;

    cloned.set({
      left: (active.left ?? 0) + 32,
      top: (active.top ?? 0) + 32,
    });
    if (meta.locked) {
      applyLockState(cloned, false);
    }

    canvas.add(cloned);
    canvas.setActiveObject(cloned);
    canvas.requestRenderAll();
    syncSelectionAndLayers();
    commitHistoryNow();
  }, [commitHistoryNow, syncSelectionAndLayers]);

  const deleteActiveObject = useCallback(() => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;

    if (active instanceof fabric.ActiveSelection) {
      active.forEachObject((obj) => canvas.remove(obj));
      canvas.discardActiveObject();
    } else {
      canvas.remove(active);
      canvas.discardActiveObject();
    }

    canvas.requestRenderAll();
    syncSelectionAndLayers();
    commitHistoryNow();
  }, [commitHistoryNow, syncSelectionAndLayers]);

  const findObjectById = useCallback((id: string): fabric.FabricObject | undefined => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    return canvas.getObjects().find((o) => ensureObjectMeta(o).editorId === id);
  }, []);

  const selectLayerById = useCallback(
    (id: string) => {
      const canvas = canvasRef.current;
      const obj = findObjectById(id);
      if (!canvas || !obj) return;
      canvas.setActiveObject(obj);
      canvas.requestRenderAll();
      syncSelectionAndLayers();
    },
    [findObjectById, syncSelectionAndLayers]
  );

  const toggleLayerVisibility = useCallback(
    (id: string) => {
      const canvas = canvasRef.current;
      const obj = findObjectById(id);
      if (!canvas || !obj) return;
      const nextVisible = obj.visible === false;
      obj.set({ visible: nextVisible });
      if (!nextVisible && canvas.getActiveObject() === obj) {
        canvas.discardActiveObject();
      }
      canvas.requestRenderAll();
      syncSelectionAndLayers();
      commitHistoryNow();
    },
    [commitHistoryNow, findObjectById, syncSelectionAndLayers]
  );

  const toggleLayerLock = useCallback(
    (id: string) => {
      const canvas = canvasRef.current;
      const obj = findObjectById(id);
      if (!canvas || !obj) return;
      const meta = ensureObjectMeta(obj);
      applyLockState(obj, !meta.locked);
      canvas.requestRenderAll();
      syncSelectionAndLayers();
      commitHistoryNow();
    },
    [commitHistoryNow, findObjectById, syncSelectionAndLayers]
  );

  const moveLayer = useCallback(
    (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
      const canvas = canvasRef.current;
      const obj = findObjectById(id);
      if (!canvas || !obj) return;
      if (direction === 'up') canvas.bringObjectForward(obj);
      else if (direction === 'down') canvas.sendObjectBackwards(obj);
      else if (direction === 'top') canvas.bringObjectToFront(obj);
      else if (direction === 'bottom') canvas.sendObjectToBack(obj);

      canvas.requestRenderAll();
      syncSelectionAndLayers();
      commitHistoryNow();
    },
    [commitHistoryNow, findObjectById, syncSelectionAndLayers]
  );

  const deleteLayerById = useCallback(
    (id: string) => {
      const canvas = canvasRef.current;
      const obj = findObjectById(id);
      if (!canvas || !obj) return;
      if (canvas.getActiveObject() === obj) {
        canvas.discardActiveObject();
      }
      canvas.remove(obj);
      canvas.requestRenderAll();
      syncSelectionAndLayers();
      commitHistoryNow();
    },
    [commitHistoryNow, findObjectById, syncSelectionAndLayers]
  );

  const deselectAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active && 'isEditing' in active && (active as fabric.IText).isEditing) {
      (active as fabric.IText).exitEditing();
    }
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    syncSelectionAndLayers();
  }, [syncSelectionAndLayers]);

  const recalculateOffset = useCallback(() => {
    canvasRef.current?.calcOffset();
  }, []);

  const cancelPointerAction = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const raw = canvas as unknown as {
      _currentTransform?: unknown;
      _groupSelector?: unknown;
    };
    if (raw._currentTransform) {
      canvas.endCurrentTransform();
    }
    if (raw._groupSelector) {
      raw._groupSelector = null;
      canvas.requestRenderAll();
    }
  }, []);

  const beginObjectPinch = useCallback(
    (
      touch1: { x: number; y: number },
      touch2: { x: number; y: number }
    ): boolean => {
      const canvas = canvasRef.current;
      if (!canvas) return false;
      const active = canvas.getActiveObject();
      if (!active) return false;
      if (
        ensureObjectMeta(active).locked ||
        active.lockScalingX ||
        active.lockScalingY
      ) {
        return false;
      }

      const p1 = clientPointToCanvas(canvas, touch1);
      const p2 = clientPointToCanvas(canvas, touch2);
      if (!p1 || !p2) return false;

      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const padCanvas = Math.max(44, 36 / Math.max(0.15, p1.cssScale));
      const isNearTarget =
        isPointNearObject(active, mid, padCanvas) ||
        isPointNearObject(active, p1, padCanvas) ||
        isPointNearObject(active, p2, padCanvas);

      if (!isNearTarget) {
        return false;
      }

      if ('isEditing' in active && (active as fabric.IText).isEditing) {
        (active as fabric.IText).exitEditing();
      }
      if (
        (canvas as unknown as { _currentTransform?: unknown })._currentTransform
      ) {
        canvas.endCurrentTransform();
      }

      activeSnapGuidesRef.current = { ...EMPTY_SNAP_GUIDES };
      activeRotationSnapRef.current = {
        isRotating: false,
        angle: 0,
        snapped: false,
      };

      objectPinchRef.current = {
        target: active,
        initialDist: Math.max(
          Math.hypot(touch2.x - touch1.x, touch2.y - touch1.y),
          1
        ),
        initialScaleX: active.scaleX ?? 1,
        initialScaleY: active.scaleY ?? 1,
        initialCenter: active.getCenterPoint(),
        initialMidCanvas: mid,
        isTextbox:
          active instanceof StoryTextbox || active instanceof fabric.Textbox,
      };
      return true;
    },
    []
  );

  const updateObjectPinch = useCallback(
    (touch1: { x: number; y: number }, touch2: { x: number; y: number }) => {
      const session = objectPinchRef.current;
      const canvas = canvasRef.current;
      if (!session || !canvas) return;

      const dist = Math.hypot(touch2.x - touch1.x, touch2.y - touch1.y);
      const rawFactor = dist / session.initialDist;
      const {
        target,
        initialCenter,
        initialMidCanvas,
        initialScaleX,
        initialScaleY,
        isTextbox,
      } = session;

      if (isTextbox) {
        const uniformScale = Math.min(
          12,
          Math.max(0.15, Math.abs(initialScaleX) * rawFactor)
        );
        target.set({ scaleX: uniformScale, scaleY: uniformScale });
      } else {
        const signX = initialScaleX < 0 ? -1 : 1;
        const signY = initialScaleY < 0 ? -1 : 1;
        const nextScaleX =
          signX * Math.min(15, Math.max(0.08, Math.abs(initialScaleX) * rawFactor));
        const nextScaleY =
          signY * Math.min(15, Math.max(0.08, Math.abs(initialScaleY) * rawFactor));
        target.set({ scaleX: nextScaleX, scaleY: nextScaleY });
      }

      const p1 = clientPointToCanvas(canvas, touch1);
      const p2 = clientPointToCanvas(canvas, touch2);
      const dx =
        p1 && p2 && !target.lockMovementX
          ? (p1.x + p2.x) / 2 - initialMidCanvas.x
          : 0;
      const dy =
        p1 && p2 && !target.lockMovementY
          ? (p1.y + p2.y) / 2 - initialMidCanvas.y
          : 0;

      const nextCenter = new fabric.Point(
        initialCenter.x + dx,
        initialCenter.y + dy
      );
      target.setPositionByOrigin(nextCenter, 'center', 'center');
      target.setCoords();

      if (Math.hypot(dx, dy) > 4) {
        const { width, height } = ASPECT_RATIO_PRESETS[aspectRatioRef.current];
        activeSnapGuidesRef.current = snapObjectToGuides(target, width, height);
      }

      canvas.requestRenderAll();
    },
    []
  );

  const endObjectPinch = useCallback(() => {
    const session = objectPinchRef.current;
    objectPinchRef.current = null;
    if (!session) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (session.isTextbox) {
      normalizeTextboxScale(session.target);
    } else {
      session.target.setCoords();
    }

    activeSnapGuidesRef.current = { ...EMPTY_SNAP_GUIDES };
    canvas.requestRenderAll();
    syncSelectionAndLayers();
    commitHistoryNow();
  }, [commitHistoryNow, syncSelectionAndLayers]);

  const toggleSafeArea = useCallback(() => {
    setShowSafeArea((prev) => {
      const next = !prev;
      showSafeAreaRef.current = next;
      canvasRef.current?.requestRenderAll();
      return next;
    });
  }, []);

  const exportPNG = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    cancelPendingBgWork();
    const currentBg = backgroundRef.current;
    if (
      currentBg.mode === 'image' &&
      currentBg.image &&
      canvas.backgroundImage instanceof fabric.FabricImage
    ) {
      applyBackgroundImageAdjustments(
        canvas.backgroundImage,
        currentBg.image.adjustments,
        'full'
      );
    }
    await exportCanvasToPNG(canvas, `story-${Date.now()}.png`);
    syncSelectionAndLayers();
  }, [cancelPendingBgWork, syncSelectionAndLayers]);

  // Global keyboard shortcuts (Delete, Undo, Redo, Duplicate, Nudge, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isFormField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (isFormField) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject();
      const isEditingCanvasText =
        active && 'isEditing' in active && Boolean((active as fabric.IText).isEditing);

      if (e.key === 'Escape') {
        deselectAll();
        return;
      }

      if (isEditingCanvasText) return;

      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          void redo();
        } else {
          void undo();
        }
        return;
      }

      if (isMod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        void redo();
        return;
      }

      if (isMod && e.key.toLowerCase() === 'd') {
        if (active) {
          e.preventDefault();
          void duplicateActiveObject();
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (active) {
          e.preventDefault();
          deleteActiveObject();
        }
        return;
      }

      if (
        active &&
        !ensureObjectMeta(active).locked &&
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 2;
        if (e.key === 'ArrowUp') active.top = (active.top ?? 0) - step;
        if (e.key === 'ArrowDown') active.top = (active.top ?? 0) + step;
        if (e.key === 'ArrowLeft') active.left = (active.left ?? 0) - step;
        if (e.key === 'ArrowRight') active.left = (active.left ?? 0) + step;
        active.setCoords();
        canvas.requestRenderAll();
        scheduleHistoryCommit(300);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    deleteActiveObject,
    deselectAll,
    duplicateActiveObject,
    redo,
    scheduleHistoryCommit,
    undo,
  ]);

  return {
    canvasElRef,
    canvasWidth: preset.width,
    canvasHeight: preset.height,
    aspectRatio,
    setAspectRatio,
    selectedObject,
    layers,
    background,
    availableFonts,
    canUndo,
    canRedo,
    undo,
    redo,
    addText,
    updateTextProps,
    uploadCustomFont,
    addImageFromFile,
    applyImageCutout,
    setBackgroundMode,
    setBackgroundColor,
    setBackgroundGradient,
    setBackgroundImageFromFile,
    updateBackgroundImageConfig,
    removeBackgroundImage,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    duplicateActiveObject,
    deleteActiveObject,
    selectLayerById,
    toggleLayerVisibility,
    toggleLayerLock,
    moveLayer,
    deleteLayerById,
    updateActiveCommonProps,
    deselectAll,
    recalculateOffset,
    cancelPointerAction,
    beginObjectPinch,
    updateObjectPinch,
    endObjectPinch,
    showSafeArea,
    toggleSafeArea,
    exportPNG,
  };
}

