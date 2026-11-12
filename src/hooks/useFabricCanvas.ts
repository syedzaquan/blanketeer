import { useCallback, useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import {
  ASPECT_RATIO_PRESETS,
  type AspectRatioKey,
  type BackgroundImageConfig,
  type BackgroundMode,
  type BackgroundState,
  type BasicShapeKind,
  type CutoutShape,
  type DiagonalDirection,
  type GradientConfig,
  type ImageStrokeStyle,
  type LayerItem,
  type SelectedObjectState,
  type TemplatePlacement,
  type TemplateSlotSummary,
  type TextBackgroundStyle,
  type TextEditingSelectionState,
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
  extractTemplateSlots,
  positionBackgroundImage,
  prepareBackgroundImageDataURL,
  readFileAsDataURL,
  renderBackgroundOverlayGradient,
  type FabricObjectWithMeta,
} from '../utils/canvasHelpers';
import {
  exportCanvasToPNG,
  isIOSDevice,
  type ExportPreviewPayload,
} from '../utils/exportCanvas';
import { ensureFrauncesFontData, isFrauncesFamily } from '../utils/frauncesSvg';
import {
  SUPPORTED_FONTS,
  loadFont,
  preloadAllFonts,
  registerCustomFontFile,
  registerCustomFontFromDataUrl,
  snapToSupportedWeight,
  type FontOption,
} from '../utils/fonts';
import {
  TEXT_STYLE_PRESETS_BY_ID,
  type TextStylePresetId,
} from '../utils/textPresets';
import { applyCutoutMask } from '../utils/imageCutouts';
import {
  clearSavedProject,
  loadProjectFromBrowser,
  saveProjectToBrowser,
  type SavedCustomFont,
} from '../utils/projectStorage';
import {
  renderGuidesOnTopContext,
  snapObjectToGuides,
  snapRotationAngle,
  type ActiveRotationSnap,
  type ActiveSnapGuides,
} from '../utils/snapGuides';
import { StoryImage, buildImageShadow } from '../utils/storyImage';
import { StoryTextbox } from '../utils/storyTextbox';
import {
  TemplateSlotRect,
  coverCropFileToDataURL,
  updateTemplateSlotCornerRadius,
} from '../utils/templateSlot';

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
  mode: 'color',
  color: '#FE5925',
  gradient: {
    startColor: '#F2A7A0',
    endColor: '#4D1D42',
    angle: 155,
    stops: [
      { offset: 0, color: '#F2A7A0' },
      { offset: 0.35, color: '#D6687E' },
      { offset: 0.7, color: '#983862' },
      { offset: 1, color: '#4D1D42' },
    ],
  },
  image: null,
};

const MAX_HISTORY = 40;

function createStarterTextbox(canvasWidth: number, canvasHeight: number): StoryTextbox {
  return new StoryTextbox('', {
    left: canvasWidth / 2,
    top: canvasHeight / 2,
    width: 780,
    originX: 'center',
    originY: 'center',
    fontFamily: 'Fedro',
    fontSize: 96,
    fontWeight: 700,
    fontSoft: 100,
    fill: '#ffffff',
    placeholder: 'Add your text',
    textAlign: 'center',
    lineHeight: 1.0,
    bgStyle: 'none',
    textBgColor: '#ffffff',
    editorName: 'Headline',
  });
}

function computeControlSizes(cssScale = 0.26): { cornerSize: number; touchCornerSize: number } {
  const safeScale = Math.max(0.1, cssScale);
  return {
    // Keep visual corner dots ~8px and touch hit zones ~44px on screen regardless of CSS zoom.
    cornerSize: Math.round(Math.min(34, Math.max(16, 8 / safeScale))),
    touchCornerSize: Math.round(Math.min(200, Math.max(44, 44 / safeScale))),
  };
}

function applyControlStyling(cssScale = 0.26): { cornerSize: number; touchCornerSize: number } {
  const sizes = computeControlSizes(cssScale);
  Object.assign(fabric.InteractiveFabricObject.ownDefaults, {
    cornerColor: '#ffffff',
    cornerStrokeColor: '#8b5cf6',
    borderColor: '#8b5cf6',
    cornerStyle: 'circle',
    cornerSize: sizes.cornerSize,
    touchCornerSize: sizes.touchCornerSize,
    transparentCorners: false,
    borderScaleFactor: 2.5,
    padding: 0,
  });
  return sizes;
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
  const [templateSlots, setTemplateSlots] = useState<TemplateSlotSummary[]>([]);
  const [textEditingState, setTextEditingState] =
    useState<TextEditingSelectionState | null>(null);
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
  const hasHydratedRef = useRef<boolean>(false);
  const hasUserEditedRef = useRef<boolean>(false);
  const customFontsRef = useRef<SavedCustomFont[]>([]);
  const historyTimerRef = useRef<number | null>(null);
  const bgUpdateRafRef = useRef<number | null>(null);

  const syncTextEditingState = useCallback(() => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (
      !canvas ||
      !(active instanceof StoryTextbox || active instanceof fabric.Textbox) ||
      !active.isEditing
    ) {
      setTextEditingState(null);
      return;
    }

    const start = active.selectionStart ?? 0;
    const end = active.selectionEnd ?? start;
    const hasSelection = end > start;
    const fallbackFill = typeof active.fill === 'string' ? active.fill : '#ffffff';

    let bold = Number(active.fontWeight ?? 400) >= 700;
    let italic = active.fontStyle === 'italic';
    let underline = Boolean(active.underline);
    let fill = fallbackFill;
    let textBackgroundColor = '';

    if (hasSelection) {
      const charStyles = active.getSelectionStyles(start, end, true);
      if (charStyles.length > 0) {
        bold = charStyles.every(
          (s) => Number(s.fontWeight ?? active.fontWeight ?? 400) >= 700
        );
        italic = charStyles.every(
          (s) => (s.fontStyle ?? active.fontStyle) === 'italic'
        );
        underline = charStyles.every((s) =>
          Boolean(s.underline ?? active.underline)
        );
        const firstFill = charStyles[0]?.fill;
        if (typeof firstFill === 'string' && firstFill) {
          fill = firstFill;
        }
        const firstBg = charStyles[0]?.textBackgroundColor;
        if (typeof firstBg === 'string') {
          textBackgroundColor = firstBg;
        }
      }
    }

    const canvasRect = canvas.getElement().getBoundingClientRect();
    const scale = canvas.width ? canvasRect.width / canvas.width : 1;
    const br = active.getBoundingRect();

    setTextEditingState({
      isEditing: true,
      hasSelection,
      selectionStart: start,
      selectionEnd: end,
      bold,
      italic,
      underline,
      fill,
      textBackgroundColor,
      boxRect:
        canvasRect.width > 0
          ? {
              left: canvasRect.left + br.left * scale,
              top: canvasRect.top + br.top * scale,
              width: br.width * scale,
              height: br.height * scale,
            }
          : null,
    });
  }, []);
  const bgFullResTimerRef = useRef<number | null>(null);
  const objectPinchRef = useRef<ObjectPinchSession | null>(null);

  const preset = ASPECT_RATIO_PRESETS[aspectRatio];

  const syncSelectionAndLayers = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    setSelectedObject(extractSelectedState(active));
    setLayers(extractLayersList(canvas));
    setTemplateSlots(extractTemplateSlots(canvas));
  }, []);

  const updateUndoRedoFlags = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(
      historyIndexRef.current >= 0 &&
        historyIndexRef.current < historyRef.current.length - 1
    );
  }, []);

  const persistSnapshot = useCallback((snapshot: HistorySnapshot) => {
    void saveProjectToBrowser({
      version: 1,
      savedAt: Date.now(),
      aspectRatio: snapshot.aspectRatio,
      background: snapshot.background,
      canvasJson: snapshot.canvasJson,
      customFonts: customFontsRef.current,
    });
  }, []);

  const commitHistoryNow = useCallback(
    (persist = true) => {
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

      if (persist) {
        hasUserEditedRef.current = true;
        persistSnapshot(snapshot);
      }
    },
    [persistSnapshot, updateUndoRedoFlags]
  );

  const scheduleHistoryCommit = useCallback(
    (delay = 280) => {
      if (isRestoringRef.current) return;
      hasUserEditedRef.current = true;
      if (historyTimerRef.current !== null) {
        window.clearTimeout(historyTimerRef.current);
      }
      historyTimerRef.current = window.setTimeout(() => {
        historyTimerRef.current = null;
        commitHistoryNow(true);
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
    async (snapshot: HistorySnapshot, persistAfter = false) => {
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
        } else if (snapshot.background.mode === 'gradient') {
          canvas.backgroundImage = undefined;
          canvas.backgroundColor = createLinearGradient(
            targetPreset.width,
            targetPreset.height,
            snapshot.background.gradient
          );
        } else if (snapshot.background.mode === 'color') {
          canvas.backgroundImage = undefined;
          canvas.backgroundColor = snapshot.background.color;
        }
        canvas.requestRenderAll();
        syncSelectionAndLayers();
        if (persistAfter) {
          persistSnapshot(snapshot);
        }
      } finally {
        isRestoringRef.current = false;
        updateUndoRedoFlags();
      }
    },
    [cancelPendingBgWork, persistSnapshot, syncSelectionAndLayers, updateUndoRedoFlags]
  );

  const undo = useCallback(async () => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    await restoreSnapshot(snapshot, true);
  }, [restoreSnapshot]);

  const redo = useCallback(async () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    await restoreSnapshot(snapshot, true);
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
      selection: false,
      // On iOS Retina (3x), a 1080x1920 working canvas exceeds Safari's 16.7 MP canvas limit
      // and causes memory failures during editing/export. Native 1080px is already sharper than screen.
      enableRetinaScaling: !isIOSDevice(),
      backgroundColor: DEFAULT_BACKGROUND.color,
    });

    const rawCanvas = canvas as unknown as {
      _renderBackground: (ctx: CanvasRenderingContext2D) => void;
    };
    const origRenderBackground = rawCanvas._renderBackground.bind(canvas);
    rawCanvas._renderBackground = (ctx: CanvasRenderingContext2D) => {
      origRenderBackground(ctx);
      const currentBg = backgroundRef.current;
      const w = canvas.width || initialPreset.width;
      const h = canvas.height || initialPreset.height;
      if (currentBg.mode === 'image' && currentBg.image?.overlayGradient) {
        renderBackgroundOverlayGradient(ctx, w, h, currentBg.image.overlayGradient);
      }
    };

    canvasRef.current = canvas;
    canvas.backgroundColor = DEFAULT_BACKGROUND.color;

    // Seed an editorial starter text layer so the canvas feels alive immediately
    const starterTitle = createStarterTextbox(
      initialPreset.width,
      initialPreset.height
    );

    canvas.add(starterTitle);
    canvas.setActiveObject(starterTitle);
    canvas.requestRenderAll();

    // Sync initial React state & seed history[0] without overwriting browser storage
    syncSelectionAndLayers();
    commitHistoryNow(false);

    let disposed = false;

    const remeasureAllTextboxes = () => {
      const currentCanvas = canvasRef.current;
      if (!currentCanvas) return;
      fontsRef.current.forEach((f) => fabric.cache.clearFontCache(f.family));
      currentCanvas.getObjects().forEach((obj) => {
        if (obj instanceof fabric.Textbox) {
          obj.dirty = true;
          obj.initDimensions();
          obj.setCoords();
        }
      });
      currentCanvas.requestRenderAll();
      syncSelectionAndLayers();
    };

    const fontsReadyPromise = preloadAllFonts().then(() => {
      if (!disposed) {
        remeasureAllTextboxes();
      }
    });

    // Hydrate saved project from browser storage if present and user hasn't edited yet
    void (async () => {
      const saved = await loadProjectFromBrowser();
      hasHydratedRef.current = true;
      if (disposed || hasUserEditedRef.current || !saved) return;

      if (saved.customFonts?.length) {
        const restoredFonts: FontOption[] = [];
        for (const cf of saved.customFonts) {
          try {
            const opt = await registerCustomFontFromDataUrl(cf.family, cf.dataUrl);
            restoredFonts.push(opt);
            if (!customFontsRef.current.some((f) => f.family === cf.family)) {
              customFontsRef.current.push(cf);
            }
          } catch {
            // Skip unreadable saved font entry
          }
        }
        if (!disposed && restoredFonts.length > 0) {
          setAvailableFonts((prev) => {
            const filtered = prev.filter(
              (p) => !restoredFonts.some((r) => r.family.toLowerCase() === p.family.toLowerCase())
            );
            const next = [...restoredFonts, ...filtered];
            fontsRef.current = next;
            return next;
          });
        }
      }

      if (disposed || hasUserEditedRef.current) return;
      const snapshot: HistorySnapshot = {
        aspectRatio: saved.aspectRatio,
        background: saved.background,
        canvasJson: saved.canvasJson,
      };
      await restoreSnapshot(snapshot, false);
      if (disposed || hasUserEditedRef.current) return;

      historyRef.current = [snapshot];
      historyIndexRef.current = 0;
      updateUndoRedoFlags();

      await fontsReadyPromise;
      if (!disposed) {
        remeasureAllTextboxes();
      }
    })();

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
      activeSnapGuidesRef.current = snapObjectToGuides(
        e.target,
        width,
        height,
        canvas.getObjects()
      );
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

    let prevActiveIdBeforeDown: string | null = null;
    let tapDownInfo: {
      target: fabric.FabricObject;
      x: number;
      y: number;
    } | null = null;

    const getPointerClientXY = (e: Event): { x: number; y: number } | null => {
      if ('changedTouches' in e && (e as TouchEvent).changedTouches?.length) {
        const t = (e as TouchEvent).changedTouches[0];
        return { x: t.clientX, y: t.clientY };
      }
      if ('touches' in e && (e as TouchEvent).touches?.length) {
        const t = (e as TouchEvent).touches[0];
        return { x: t.clientX, y: t.clientY };
      }
      if ('clientX' in e) {
        return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
      }
      return null;
    };

    const handleMouseDownBefore = () => {
      const active = canvas.getActiveObject();
      prevActiveIdBeforeDown = active ? ensureObjectMeta(active).editorId ?? null : null;
      tapDownInfo = null;
    };

    const handleMouseDown = (opt: { e: fabric.TPointerEvent; target?: fabric.FabricObject }) => {
      const target = opt.target;
      if (
        !target ||
        !prevActiveIdBeforeDown ||
        ensureObjectMeta(target).editorId !== prevActiveIdBeforeDown
      ) {
        return;
      }
      if (!(target instanceof StoryTextbox || target instanceof fabric.Textbox)) {
        return;
      }
      if (target.isEditing || target.__corner || ensureObjectMeta(target).locked) {
        return;
      }
      const xy = getPointerClientXY(opt.e);
      if (xy) {
        tapDownInfo = { target, x: xy.x, y: xy.y };
      }
    };

    const handleMouseUp = (opt: { e: fabric.TPointerEvent }) => {
      clearSnapGuides();
      const pending = tapDownInfo;
      tapDownInfo = null;
      if (!pending) return;

      const xy = getPointerClientXY(opt.e);
      if (!xy || Math.hypot(xy.x - pending.x, xy.y - pending.y) > 6) {
        return;
      }
      const active = canvas.getActiveObject();
      if (
        active === pending.target &&
        (active instanceof StoryTextbox || active instanceof fabric.Textbox) &&
        !active.isEditing &&
        !ensureObjectMeta(active).locked
      ) {
        active.enterEditing(opt.e);
        active.setCursorByClick(opt.e);
        canvas.requestRenderAll();
      }
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => {
      clearSnapGuides();
      setTextEditingState(null);
      handleSelection();
    });
    canvas.on('mouse:down:before', handleMouseDownBefore);
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:up', handleMouseUp);
    canvas.on('object:moving', handleObjectMoving);
    canvas.on('object:rotating', handleObjectRotating);
    canvas.on('object:scaling', handleObjectScaling);
    canvas.on('object:modified', handleObjectModified);
    canvas.on('text:editing:entered', syncTextEditingState);
    canvas.on('text:selection:changed', syncTextEditingState);
    canvas.on('text:editing:exited', () => {
      setTextEditingState(null);
      commitHistoryNow();
    });
    canvas.on('text:changed', () => {
      handleTextChanged();
      syncTextEditingState();
    });
    canvas.on('object:added', handleStackChange);
    canvas.on('object:removed', handleStackChange);
    canvas.on('after:render', handleAfterRender);

    const flushPendingSave = () => {
      if (historyTimerRef.current !== null) {
        commitHistoryNow(true);
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingSave();
      }
    };
    window.addEventListener('pagehide', flushPendingSave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      disposed = true;
      window.removeEventListener('pagehide', flushPendingSave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (historyTimerRef.current !== null) {
        window.clearTimeout(historyTimerRef.current);
      }
      cancelPendingBgWork();
      canvas.dispose();
      canvasRef.current = null;
    };
  }, [
    cancelPendingBgWork,
    commitHistoryNow,
    restoreSnapshot,
    scheduleHistoryCommit,
    syncSelectionAndLayers,
    syncTextEditingState,
    updateUndoRedoFlags,
  ]);

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
    async (presetType: TextStylePresetId = 'heading', fontFamily?: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { width, height } = ASPECT_RATIO_PRESETS[aspectRatioRef.current];
      const cfg = TEXT_STYLE_PRESETS_BY_ID[presetType];
      const targetFamily = fontFamily || 'Fedro';
      const targetWeight = isFrauncesFamily(targetFamily)
        ? cfg.fontWeight
        : snapToSupportedWeight(cfg.fontWeight, targetFamily, fontsRef.current);

      const fontOption = fontsRef.current.find((f) => f.family === targetFamily);
      if (fontOption) {
        await loadFont(fontOption, targetWeight, 'normal');
        if (isFrauncesFamily(fontOption.family)) {
          await ensureFrauncesFontData();
        }
        fabric.cache.clearFontCache(fontOption.family);
      }

      const textbox = new StoryTextbox(cfg.defaultText, {
        left: width / 2,
        top: height / 2,
        width: cfg.boxWidth,
        originX: 'center',
        originY: 'center',
        fontFamily: targetFamily,
        fontSize: cfg.fontSize,
        fontWeight: targetWeight,
        fontOpsz: Math.min(144, Math.max(9, Math.round(cfg.fontSize))),
        fontSoft: 100,
        fontWonk: 0,
        fill: cfg.fill,
        textAlign: 'center',
        lineHeight: cfg.lineHeight,
        charSpacing: cfg.charSpacing,
        bgStyle: 'none',
        textBgColor: '#ffffff',
        pillRadius: 24,
        pillPaddingX: 28,
        pillPaddingY: 10,
        editorName: cfg.editorName,
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

  const applyTextPreset = useCallback(
    async (presetId: TextStylePresetId) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject();
      if (!(active instanceof StoryTextbox || active instanceof fabric.Textbox)) {
        await addText(presetId);
        return;
      }

      const preset = TEXT_STYLE_PRESETS_BY_ID[presetId];
      const family = active.fontFamily || 'Fedro';
      const nextWeight = isFrauncesFamily(family)
        ? preset.fontWeight
        : snapToSupportedWeight(preset.fontWeight, family, fontsRef.current);

      await updateTextProps({
        fontSize: preset.fontSize,
        fontWeight: nextWeight,
        fill: preset.fill,
        lineHeight: preset.lineHeight,
        charSpacing: preset.charSpacing,
        ...(isFrauncesFamily(family)
          ? { fontOpsz: Math.min(144, Math.max(9, Math.round(preset.fontSize))) }
          : {}),
      });
    },
    [addText, updateTextProps]
  );

  const uploadCustomFont = useCallback(
    async (file: File) => {
      const [newFont, dataUrl] = await Promise.all([
        registerCustomFontFile(file),
        readFileAsDataURL(file),
      ]);
      customFontsRef.current = [
        ...customFontsRef.current.filter(
          (f) => f.family.toLowerCase() !== newFont.family.toLowerCase()
        ),
        { family: newFont.family, dataUrl },
      ];
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
        commitHistoryNow(true);
      } else if (canvas && historyRef.current[historyIndexRef.current]) {
        persistSnapshot(historyRef.current[historyIndexRef.current]);
      }
      return newFont;
    },
    [commitHistoryNow, persistSnapshot, syncSelectionAndLayers]
  );

  const findObjectById = useCallback((id: string): fabric.FabricObject | undefined => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    return canvas.getObjects().find((o) => ensureObjectMeta(o).editorId === id);
  }, []);

  const initDefaultStoryImageMeta = (img: fabric.FabricImage, name: string): void => {
    const meta = ensureObjectMeta(img) as FabricObjectWithMeta & {
      cutoutShape?: CutoutShape;
      cutoutRadius?: number;
      aspectLocked?: boolean;
      imageStrokeColor?: string;
      imageStrokeWidth?: number;
      imageStrokeStyle?: ImageStrokeStyle;
      imageShadowEnabled?: boolean;
      imageShadowColor?: string;
      imageShadowOpacity?: number;
      imageShadowBlur?: number;
      imageShadowOffsetX?: number;
      imageShadowOffsetY?: number;
    };
    meta.editorName = name;
    meta.cutoutShape = 'none';
    meta.cutoutRadius = 16;
    meta.aspectLocked = true;
    meta.imageStrokeColor = '#ffffff';
    meta.imageStrokeWidth = 0;
    meta.imageStrokeStyle = 'solid';
    meta.imageShadowEnabled = false;
    meta.imageShadowColor = '#000000';
    meta.imageShadowOpacity = 45;
    meta.imageShadowBlur = 24;
    meta.imageShadowOffsetX = 0;
    meta.imageShadowOffsetY = 12;
  };

  const addImageFromFile = useCallback(
    async (file: File) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const src = await readFileAsDataURL(file);
      const img = await StoryImage.fromURL(src, {
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

      initDefaultStoryImageMeta(
        img,
        file.name.replace(/\.[^/.]+$/, '').slice(0, 24) || 'Image'
      );

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

  const addBasicShape = useCallback(
    (shapeKind: BasicShapeKind) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { width, height } = ASPECT_RATIO_PRESETS[aspectRatioRef.current];
      const cx = width / 2;
      const cy = height / 2;

      const commonProps = {
        left: cx,
        top: cy,
        originX: 'center' as const,
        originY: 'center' as const,
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 0,
        strokeUniform: true,
      };

      let shape: fabric.FabricObject;
      let editorName = 'Shape';
      let cornerRadius = 0;

      switch (shapeKind) {
        case 'rect':
          editorName = 'Square';
          shape = new fabric.Rect({
            ...commonProps,
            width: 320,
            height: 320,
            rx: 0,
            ry: 0,
          });
          break;
        case 'rounded':
          editorName = 'Rounded Box';
          cornerRadius = 36;
          shape = new fabric.Rect({
            ...commonProps,
            width: 360,
            height: 240,
            rx: 36,
            ry: 36,
          });
          break;
        case 'circle':
          editorName = 'Circle';
          shape = new fabric.Circle({
            ...commonProps,
            radius: 160,
          });
          break;
        case 'triangle':
          editorName = 'Triangle';
          shape = new fabric.Triangle({
            ...commonProps,
            width: 320,
            height: 280,
          });
          break;
        case 'star': {
          editorName = 'Star';
          const outerR = 170;
          const innerR = 72;
          const points: { x: number; y: number }[] = [];
          for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const angle = (Math.PI / 5) * i - Math.PI / 2;
            points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
          }
          shape = new fabric.Polygon(points, {
            ...commonProps,
          });
          break;
        }
        case 'line':
          editorName = 'Line';
          cornerRadius = 5;
          shape = new fabric.Rect({
            ...commonProps,
            width: 480,
            height: 10,
            rx: 5,
            ry: 5,
          });
          break;
      }

      const meta = ensureObjectMeta(shape) as FabricObjectWithMeta & {
        shapeKind?: BasicShapeKind;
        shapeCornerRadius?: number;
      };
      meta.editorName = editorName;
      meta.shapeKind = shapeKind;
      meta.shapeCornerRadius = cornerRadius;

      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.requestRenderAll();
      syncSelectionAndLayers();
      commitHistoryNow();
    },
    [commitHistoryNow, syncSelectionAndLayers]
  );

  const updateShapeProps = useCallback(
    (
      patch: Partial<{
        fill: string;
        stroke: string;
        strokeWidth: number;
        cornerRadius: number;
      }>
    ) => {
      const canvas = canvasRef.current;
      const active = canvas?.getActiveObject();
      if (!canvas || !active) return;
      const meta = active as FabricObjectWithMeta & {
        shapeKind?: BasicShapeKind;
        shapeCornerRadius?: number;
      };
      if (!meta.shapeKind) return;

      if (patch.fill !== undefined) {
        active.set('fill', patch.fill);
      }
      if (patch.stroke !== undefined) {
        active.set('stroke', patch.stroke);
      }
      if (patch.strokeWidth !== undefined && Number.isFinite(patch.strokeWidth)) {
        active.set({
          strokeWidth: Math.max(0, Math.min(40, Math.round(patch.strokeWidth))),
          strokeUniform: true,
        });
      }
      if (
        patch.cornerRadius !== undefined &&
        Number.isFinite(patch.cornerRadius) &&
        active instanceof fabric.Rect
      ) {
        const clamped = Math.max(0, Math.min(120, Math.round(patch.cornerRadius)));
        meta.shapeCornerRadius = clamped;
        active.set({ rx: clamped, ry: clamped });
      }

      active.dirty = true;
      active.setCoords();
      canvas.requestRenderAll();
      syncSelectionAndLayers();
      scheduleHistoryCommit(200);
    },
    [scheduleHistoryCommit, syncSelectionAndLayers]
  );

  const applyTwoColumnTemplate = useCallback(
    (options: { placement: TemplatePlacement; cornerPercent: number }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { width, height } = ASPECT_RATIO_PRESETS[aspectRatioRef.current];
      const outerPad = 16;
      const gap = 16;
      const slotWidth = Math.round((width - outerPad * 2 - gap) / 2);
      const slotHeight = Math.round(height * 0.5);
      const slotTop =
        options.placement === 'top' ? outerPad : height - outerPad - slotHeight;
      const cornerPercent = Math.max(0, Math.min(25, Math.round(options.cornerPercent)));

      // Replace existing unfilled placeholder slots if the user switches Top/Bottom or re-applies
      const existingSlots = canvas
        .getObjects()
        .filter((obj): obj is TemplateSlotRect => obj instanceof TemplateSlotRect);
      if (existingSlots.length > 0) {
        existingSlots.forEach((s) => canvas.remove(s));
      }

      const makeSlot = (slotIndex: number, leftCenter: number) => {
        const slot = new TemplateSlotRect({
          left: leftCenter,
          top: slotTop + slotHeight / 2,
          width: slotWidth,
          height: slotHeight,
          originX: 'center',
          originY: 'center',
          slotIndex,
          slotCornerPercent: cornerPercent,
          editorName: `Photo ${slotIndex}`,
        });
        ensureObjectMeta(slot);
        return slot;
      };

      const slot1 = makeSlot(1, outerPad + slotWidth / 2);
      const slot2 = makeSlot(2, outerPad + slotWidth + gap + slotWidth / 2);

      canvas.insertAt(0, slot1, slot2);
      canvas.setActiveObject(slot1);
      canvas.requestRenderAll();
      syncSelectionAndLayers();
      commitHistoryNow();
    },
    [commitHistoryNow, syncSelectionAndLayers]
  );

  const applyDiagonalTemplate = useCallback(
    (options: { direction: DiagonalDirection; cornerPercent: number }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { width, height } = ASPECT_RATIO_PRESETS[aspectRatioRef.current];
      const outerPad = 16;
      const gap = 16;

      const slotWidth = Math.round((width - outerPad * 2 - gap) / 2);
      const slotHeight = Math.round((height - outerPad * 2 - gap) / 2);
      const cornerPercent = Math.max(0, Math.min(25, Math.round(options.cornerPercent)));

      const existingSlots = canvas
        .getObjects()
        .filter((obj): obj is TemplateSlotRect => obj instanceof TemplateSlotRect);
      if (existingSlots.length > 0) {
        existingSlots.forEach((s) => canvas.remove(s));
      }

      const leftX = outerPad + slotWidth / 2;
      const rightX = outerPad + slotWidth + gap + slotWidth / 2;
      const topY = outerPad + slotHeight / 2;
      const bottomY = outerPad + slotHeight + gap + slotHeight / 2;

      const isLtr = options.direction === 'ltr';

      const slot1 = new TemplateSlotRect({
        left: leftX,
        top: isLtr ? topY : bottomY,
        width: slotWidth,
        height: slotHeight,
        originX: 'center',
        originY: 'center',
        slotIndex: 1,
        slotCornerPercent: cornerPercent,
        editorName: 'Photo 1',
      });
      ensureObjectMeta(slot1);

      const slot2 = new TemplateSlotRect({
        left: rightX,
        top: isLtr ? bottomY : topY,
        width: slotWidth,
        height: slotHeight,
        originX: 'center',
        originY: 'center',
        slotIndex: 2,
        slotCornerPercent: cornerPercent,
        editorName: 'Photo 2',
      });
      ensureObjectMeta(slot2);

      canvas.insertAt(0, slot1, slot2);
      canvas.setActiveObject(slot1);
      canvas.requestRenderAll();
      syncSelectionAndLayers();
      commitHistoryNow();
    },
    [commitHistoryNow, syncSelectionAndLayers]
  );

  const fillTemplateSlot = useCallback(
    async (slotId: string, file: File) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const target = findObjectById(slotId);
      if (!(target instanceof TemplateSlotRect)) return;

      const slotWidth = Math.max(20, target.getScaledWidth());
      const slotHeight = Math.max(20, target.getScaledHeight());
      const center = target.getCenterPoint();
      const cornerPercent = Math.round(target.slotCornerPercent ?? 0);
      const angle = target.angle || 0;
      const opacity = target.opacity ?? 1;
      const stackIndex = Math.max(0, canvas.getObjects().indexOf(target));
      const fallbackName = target.editorName || `Photo ${target.slotIndex ?? 1}`;

      const rawSrc = await readFileAsDataURL(file);
      const croppedSrc = await coverCropFileToDataURL(
        file,
        rawSrc,
        slotWidth,
        slotHeight
      );
      const img = await StoryImage.fromURL(croppedSrc, {
        crossOrigin: 'anonymous',
      });

      initDefaultStoryImageMeta(
        img,
        file.name.replace(/\.[^/.]+$/, '').slice(0, 24) || fallbackName
      );

      img.set({
        left: center.x,
        top: center.y,
        originX: 'center',
        originY: 'center',
        scaleX: slotWidth / (img.width || 1),
        scaleY: slotHeight / (img.height || 1),
        angle,
        opacity,
      });

      if (cornerPercent > 0) {
        applyCutoutMask(img, 'rounded', cornerPercent);
      }

      if (canvas.getActiveObject() === target) {
        canvas.discardActiveObject();
      }
      canvas.remove(target);
      canvas.insertAt(stackIndex, img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
      syncSelectionAndLayers();
      commitHistoryNow();
    },
    [commitHistoryNow, findObjectById, syncSelectionAndLayers]
  );

  const updateTemplateSlotCorner = useCallback(
    (slotId: string, cornerPercent: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const target = findObjectById(slotId);
      if (!(target instanceof TemplateSlotRect)) return;

      updateTemplateSlotCornerRadius(target, cornerPercent);
      canvas.requestRenderAll();
      syncSelectionAndLayers();
      scheduleHistoryCommit(200);
    },
    [findObjectById, scheduleHistoryCommit, syncSelectionAndLayers]
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

  const updateImageProps = useCallback(
    (
      patch: Partial<{
        width: number;
        height: number;
        aspectLocked: boolean;
        angle: number;
        flipX: boolean;
        flipY: boolean;
        strokeColor: string;
        strokeWidth: number;
        strokeStyle: ImageStrokeStyle;
        shadowEnabled: boolean;
        shadowColor: string;
        shadowOpacity: number;
        shadowBlur: number;
        shadowOffsetX: number;
        shadowOffsetY: number;
      }>
    ) => {
      const canvas = canvasRef.current;
      const active = canvas?.getActiveObject();
      if (!canvas || !(active instanceof fabric.FabricImage)) return;

      const storyImg = active as StoryImage;
      const natW = Math.max(1, storyImg.width || 1);
      const natH = Math.max(1, storyImg.height || 1);
      const currentAspectLocked =
        patch.aspectLocked !== undefined
          ? patch.aspectLocked
          : (storyImg.aspectLocked ?? true);

      if (patch.aspectLocked !== undefined) {
        storyImg.aspectLocked = patch.aspectLocked;
      }

      const curRenderW = Math.max(1, natW * Math.abs(storyImg.scaleX ?? 1));
      const curRenderH = Math.max(1, natH * Math.abs(storyImg.scaleY ?? 1));

      if (patch.width !== undefined && Number.isFinite(patch.width)) {
        const nextW = Math.max(20, Math.min(4000, Math.round(patch.width)));
        const nextScaleX = nextW / natW;
        if (currentAspectLocked) {
          const ratio = curRenderH / curRenderW;
          const nextH = Math.max(20, Math.min(4000, Math.round(nextW * ratio)));
          storyImg.set({ scaleX: nextScaleX, scaleY: nextH / natH });
        } else {
          storyImg.set({ scaleX: nextScaleX });
        }
      } else if (patch.height !== undefined && Number.isFinite(patch.height)) {
        const nextH = Math.max(20, Math.min(4000, Math.round(patch.height)));
        const nextScaleY = nextH / natH;
        if (currentAspectLocked) {
          const ratio = curRenderW / curRenderH;
          const nextW = Math.max(20, Math.min(4000, Math.round(nextH * ratio)));
          storyImg.set({ scaleX: nextW / natW, scaleY: nextScaleY });
        } else {
          storyImg.set({ scaleY: nextScaleY });
        }
      }

      if (patch.strokeColor !== undefined) {
        storyImg.set('imageStrokeColor', patch.strokeColor);
      }
      if (patch.strokeWidth !== undefined && Number.isFinite(patch.strokeWidth)) {
        storyImg.set(
          'imageStrokeWidth',
          Math.max(0, Math.min(64, Math.round(patch.strokeWidth)))
        );
      }
      if (patch.strokeStyle !== undefined) {
        storyImg.set('imageStrokeStyle', patch.strokeStyle);
      }
      if (patch.angle !== undefined && Number.isFinite(patch.angle)) {
        storyImg.set('angle', patch.angle);
      }
      if (patch.flipX !== undefined) {
        storyImg.set('flipX', patch.flipX);
      }
      if (patch.flipY !== undefined) {
        storyImg.set('flipY', patch.flipY);
      }

      const hasShadowPatch =
        patch.shadowEnabled !== undefined ||
        patch.shadowColor !== undefined ||
        patch.shadowOpacity !== undefined ||
        patch.shadowBlur !== undefined ||
        patch.shadowOffsetX !== undefined ||
        patch.shadowOffsetY !== undefined;

      if (hasShadowPatch) {
        const nextEnabled =
          patch.shadowEnabled !== undefined
            ? patch.shadowEnabled
            : true;
        const nextColor =
          patch.shadowColor ?? storyImg.imageShadowColor ?? '#000000';
        const nextOpacity =
          patch.shadowOpacity !== undefined && Number.isFinite(patch.shadowOpacity)
            ? Math.max(0, Math.min(100, Math.round(patch.shadowOpacity)))
            : (storyImg.imageShadowOpacity ?? 45);
        const nextBlur =
          patch.shadowBlur !== undefined && Number.isFinite(patch.shadowBlur)
            ? Math.max(0, Math.min(80, Math.round(patch.shadowBlur)))
            : (storyImg.imageShadowBlur ?? 24);
        const nextOffsetX =
          patch.shadowOffsetX !== undefined && Number.isFinite(patch.shadowOffsetX)
            ? Math.max(-60, Math.min(60, Math.round(patch.shadowOffsetX)))
            : (storyImg.imageShadowOffsetX ?? 0);
        const nextOffsetY =
          patch.shadowOffsetY !== undefined && Number.isFinite(patch.shadowOffsetY)
            ? Math.max(-60, Math.min(60, Math.round(patch.shadowOffsetY)))
            : (storyImg.imageShadowOffsetY ?? 12);

        storyImg.imageShadowEnabled = nextEnabled;
        storyImg.imageShadowColor = nextColor;
        storyImg.imageShadowOpacity = nextOpacity;
        storyImg.imageShadowBlur = nextBlur;
        storyImg.imageShadowOffsetX = nextOffsetX;
        storyImg.imageShadowOffsetY = nextOffsetY;
        storyImg.set(
          'shadow',
          buildImageShadow(
            nextEnabled,
            nextColor,
            nextOpacity,
            nextBlur,
            nextOffsetX,
            nextOffsetY
          )
        );
      }

      storyImg.set('dirty', true);
      storyImg.setCoords();
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.calcOffset();

    const rect = canvas.getElement().getBoundingClientRect();
    if (rect.width <= 0) return;

    const cssScale = rect.width / (canvas.width || 1080);
    const { cornerSize, touchCornerSize } = applyControlStyling(cssScale);

    let changed = false;
    for (const obj of canvas.getObjects()) {
      if (obj.cornerSize !== cornerSize || obj.touchCornerSize !== touchCornerSize) {
        obj.set({ cornerSize, touchCornerSize });
        obj.setCoords();
        changed = true;
      }
    }
    if (changed && canvas.getActiveObject()) {
      canvas.requestRenderAll();
    }
    syncTextEditingState();
  }, [syncTextEditingState]);

  const canPanCanvasAt = useCallback(
    (e: MouseEvent | TouchEvent | PointerEvent): boolean => {
      const canvas = canvasRef.current;
      if (!canvas) return false;
      const active = canvas.getActiveObject();
      if (
        active &&
        'isEditing' in active &&
        Boolean((active as fabric.IText).isEditing)
      ) {
        return false;
      }
      canvas.calcOffset();
      const target = canvas.findTarget(e as fabric.TPointerEvent);
      return !target;
    },
    []
  );

  const getTouchHitKind = useCallback(
    (
      e: MouseEvent | TouchEvent | PointerEvent
    ): 'selected' | 'unselected' | 'empty' => {
      const canvas = canvasRef.current;
      if (!canvas) return 'empty';
      const active = canvas.getActiveObject();
      if (
        active &&
        'isEditing' in active &&
        Boolean((active as fabric.IText).isEditing)
      ) {
        return 'selected';
      }
      canvas.calcOffset();
      const target = canvas.findTarget(e as fabric.TPointerEvent);
      if (!target) return 'empty';
      if (
        active &&
        ensureObjectMeta(target).editorId === ensureObjectMeta(active).editorId
      ) {
        return 'selected';
      }
      return 'unselected';
    },
    []
  );

  const selectObjectAtClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.calcOffset();
      const syntheticEvent = {
        type: 'pointerdown',
        pointerType: 'touch',
        clientX,
        clientY,
      } as unknown as fabric.TPointerEvent;
      const target = canvas.findTarget(syntheticEvent);
      if (!target) {
        canvas.discardActiveObject();
      } else {
        canvas.setActiveObject(target);
      }
      canvas.requestRenderAll();
      syncSelectionAndLayers();
    },
    [syncSelectionAndLayers]
  );

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

  const getActiveObjectId = useCallback((): string | null => {
    const active = canvasRef.current?.getActiveObject();
    return active ? ensureObjectMeta(active).editorId ?? null : null;
  }, []);

  const restoreSelectionById = useCallback(
    (id: string | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const current = canvas.getActiveObject();
      const currentId = current ? ensureObjectMeta(current).editorId ?? null : null;
      if (currentId === id) return;

      if (!id) {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        syncSelectionAndLayers();
        return;
      }

      const target = canvas
        .getObjects()
        .find((obj) => ensureObjectMeta(obj).editorId === id);
      if (target) {
        canvas.setActiveObject(target);
      } else {
        canvas.discardActiveObject();
      }
      canvas.requestRenderAll();
      syncSelectionAndLayers();
    },
    [syncSelectionAndLayers]
  );

  const beginObjectPinch = useCallback(
    (
      touch1: { x: number; y: number },
      touch2: { x: number; y: number },
      allowedObjectId?: string | null
    ): boolean => {
      const canvas = canvasRef.current;
      if (!canvas) return false;
      const active = canvas.getActiveObject();
      if (!active) return false;
      if (allowedObjectId !== undefined) {
        const activeId = ensureObjectMeta(active).editorId;
        if (!allowedObjectId || activeId !== allowedObjectId) {
          return false;
        }
      }
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
        activeSnapGuidesRef.current = snapObjectToGuides(
          target,
          width,
          height,
          canvas.getObjects()
        );
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

  const exportPNG = useCallback(async (): Promise<ExportPreviewPayload | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
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
    const preview = await exportCanvasToPNG(canvas, `story-${Date.now()}.png`);
    syncSelectionAndLayers();
    return preview;
  }, [cancelPendingBgWork, syncSelectionAndLayers]);

  const applyEditingSelectionStyle = useCallback(
    (
      patch: Partial<{
        bold: boolean;
        italic: boolean;
        underline: boolean;
        fill: string;
        textBackgroundColor: string;
      }>
    ) => {
      const canvas = canvasRef.current;
      const active = canvas?.getActiveObject();
      if (
        !canvas ||
        !(active instanceof StoryTextbox || active instanceof fabric.Textbox) ||
        !active.isEditing
      ) {
        return;
      }

      const stylePatch: Record<string, unknown> = {};
      if (patch.bold !== undefined) {
        stylePatch.fontWeight = patch.bold ? 700 : 400;
      }
      if (patch.italic !== undefined) {
        stylePatch.fontStyle = patch.italic ? 'italic' : 'normal';
      }
      if (patch.underline !== undefined) {
        stylePatch.underline = patch.underline;
      }
      if (patch.fill !== undefined) {
        stylePatch.fill = patch.fill;
      }
      if (patch.textBackgroundColor !== undefined) {
        stylePatch.textBackgroundColor = patch.textBackgroundColor;
      }

      const start = active.selectionStart ?? 0;
      const end = active.selectionEnd ?? start;
      if (end > start) {
        active.setSelectionStyles(stylePatch, start, end);
      } else {
        active.set(stylePatch);
      }

      active.dirty = true;
      active.initDimensions();
      active.setCoords();
      canvas.requestRenderAll();
      active.hiddenTextarea?.focus({ preventScroll: true });
      syncTextEditingState();
      syncSelectionAndLayers();
      scheduleHistoryCommit(250);
    },
    [scheduleHistoryCommit, syncSelectionAndLayers, syncTextEditingState]
  );

  const selectAllEditingText = useCallback(() => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (
      !canvas ||
      !(active instanceof StoryTextbox || active instanceof fabric.Textbox) ||
      !active.isEditing
    ) {
      return;
    }
    active.selectAll();
    active.hiddenTextarea?.focus({ preventScroll: true });
    canvas.requestRenderAll();
    syncTextEditingState();
  }, [syncTextEditingState]);

  const exitTextEditing = useCallback(() => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (
      !canvas ||
      !(active instanceof StoryTextbox || active instanceof fabric.Textbox) ||
      !active.isEditing
    ) {
      return;
    }
    active.exitEditing();
    canvas.requestRenderAll();
    setTextEditingState(null);
  }, []);

  const resetProject = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    cancelPendingBgWork();
    if (historyTimerRef.current !== null) {
      window.clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
    }

    isRestoringRef.current = true;
    try {
      const defaultRatio: AspectRatioKey = '4:5';
      const defaultPreset = ASPECT_RATIO_PRESETS[defaultRatio];
      const defaultBg = structuredClone(DEFAULT_BACKGROUND);

      aspectRatioRef.current = defaultRatio;
      setAspectRatioState(defaultRatio);

      backgroundRef.current = defaultBg;
      setBackgroundState(defaultBg);

      if (
        canvas.width !== defaultPreset.width ||
        canvas.height !== defaultPreset.height
      ) {
        canvas.setDimensions({
          width: defaultPreset.width,
          height: defaultPreset.height,
        });
      }

      canvas.clear();
      canvas.backgroundImage = undefined;
      canvas.backgroundColor = defaultBg.color;

      const starterTitle = createStarterTextbox(
        defaultPreset.width,
        defaultPreset.height
      );
      canvas.add(starterTitle);
      canvas.setActiveObject(starterTitle);
      canvas.requestRenderAll();

      const canvasJson = canvas.toObject(CUSTOM_SERIALIZED_PROPS) as Record<
        string,
        unknown
      >;
      historyRef.current = [
        {
          aspectRatio: defaultRatio,
          background: structuredClone(defaultBg),
          canvasJson,
        },
      ];
      historyIndexRef.current = 0;
      hasUserEditedRef.current = true;

      await clearSavedProject();
      syncSelectionAndLayers();
    } finally {
      isRestoringRef.current = false;
      updateUndoRedoFlags();
    }
  }, [cancelPendingBgWork, syncSelectionAndLayers, updateUndoRedoFlags]);

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
    templateSlots,
    background,
    availableFonts,
    canUndo,
    canRedo,
    undo,
    redo,
    addText,
    applyTextPreset,
    updateTextProps,
    uploadCustomFont,
    addImageFromFile,
    addBasicShape,
    updateShapeProps,
    applyTwoColumnTemplate,
    applyDiagonalTemplate,
    fillTemplateSlot,
    updateTemplateSlotCorner,
    applyImageCutout,
    updateImageProps,
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
    canPanCanvasAt,
    getTouchHitKind,
    selectObjectAtClientPoint,
    cancelPointerAction,
    getActiveObjectId,
    restoreSelectionById,
    beginObjectPinch,
    updateObjectPinch,
    endObjectPinch,
    textEditingState,
    applyEditingSelectionStyle,
    selectAllEditingText,
    exitTextEditing,
    showSafeArea,
    toggleSafeArea,
    exportPNG,
    resetProject,
  };
}

