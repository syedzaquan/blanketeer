export type AspectRatioKey = '9:16' | '1:1' | '4:5';

export interface AspectRatioPreset {
  key: AspectRatioKey;
  label: string;
  ratioLabel: string;
  width: number;
  height: number;
}

export const ASPECT_RATIO_PRESETS: Record<AspectRatioKey, AspectRatioPreset> = {
  '4:5': {
    key: '4:5',
    label: 'Portrait',
    ratioLabel: '4:5',
    width: 1080,
    height: 1350,
  },
  '9:16': {
    key: '9:16',
    label: 'Story',
    ratioLabel: '9:16',
    width: 1080,
    height: 1920,
  },
  '1:1': {
    key: '1:1',
    label: 'Square',
    ratioLabel: '1:1',
    width: 1080,
    height: 1080,
  },
};

export type BackgroundMode = 'color' | 'gradient' | 'image';

export interface GradientStop {
  offset: number;
  color: string;
}

export interface GradientConfig {
  startColor: string;
  endColor: string;
  angle: number;
  stops?: GradientStop[];
}

export type GradientBlendMode =
  | 'source-over'
  | 'multiply'
  | 'overlay'
  | 'soft-light'
  | 'screen'
  | 'darken'
  | 'lighten';

export interface BackgroundOverlayGradient {
  enabled: boolean;
  startColor: string;
  startAlpha: number;
  endColor: string;
  endAlpha: number;
  opacity: number;
  angle: number;
  coverage: number;
  midpoint: number;
  blendMode: GradientBlendMode;
}

export interface BackgroundImageAdjustments {
  brightness: number;
  contrast: number;
  shadows: number;
  highlights: number;
  dehaze: number;
  blackPoint: number;
}

export interface BackgroundImageConfig {
  src: string;
  zoom: number;
  panX: number;
  panY: number;
  fitMode: 'cover' | 'contain';
  overlayGradient?: BackgroundOverlayGradient;
  adjustments?: BackgroundImageAdjustments;
}

export interface BackgroundState {
  mode: BackgroundMode;
  color: string;
  gradient: GradientConfig;
  image: BackgroundImageConfig | null;
}

export type TextBackgroundStyle = 'none' | 'solid' | 'pill';

export interface TextEditingSelectionState {
  isEditing: boolean;
  hasSelection: boolean;
  selectionStart: number;
  selectionEnd: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fill: string;
  textBackgroundColor: string;
  boxRect: { left: number; top: number; width: number; height: number } | null;
}

export type CutoutShape = 'none' | 'circle' | 'square' | 'rounded' | 'star' | 'heart';

export type ImageStrokeStyle =
  | 'solid'
  | 'dashed'
  | 'dotted'
  | 'stamp'
  | 'wavy'
  | 'polaroid';

export type ExportImageFormat = 'png' | 'jpeg' | 'webp';

export interface SelectedTextProps {
  kind: 'text';
  id: string;
  name: string;
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
  textShadowEnabled: boolean;
  opacity: number;
  angle: number;
  flipX: boolean;
  flipY: boolean;
  locked: boolean;
}

export type ImageFilterPreset =
  | 'none'
  | 'bw'
  | 'noir'
  | 'vivid'
  | 'warm'
  | 'cool'
  | 'fade'
  | 'sepia';

export interface ImageFilterConfig {
  preset: ImageFilterPreset;
  intensity: number;
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  blur: number;
  shadows: number;
  highlights: number;
  dehaze: number;
  blackPoint: number;
}

export interface SelectedImageProps {
  kind: 'image';
  id: string;
  name: string;
  cutoutShape: CutoutShape;
  cutoutRadius: number;
  naturalWidth: number;
  naturalHeight: number;
  width: number;
  height: number;
  aspectLocked: boolean;
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: ImageStrokeStyle;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowOpacity: number;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  filter: ImageFilterConfig;
  opacity: number;
  angle: number;
  scaleX: number;
  scaleY: number;
  flipX: boolean;
  flipY: boolean;
  locked: boolean;
}

export interface SelectedTemplateSlotProps {
  kind: 'slot';
  id: string;
  name: string;
  slotIndex: number;
  width: number;
  height: number;
  cornerPercent: number;
  opacity: number;
  angle: number;
  flipX: boolean;
  flipY: boolean;
  locked: boolean;
}

export type BasicShapeKind =
  | 'rect'
  | 'rounded'
  | 'circle'
  | 'triangle'
  | 'star'
  | 'line';

export type ShapeImageFit = 'cover' | 'contain' | 'stretch';

export interface SelectedShapeProps {
  kind: 'shape';
  id: string;
  name: string;
  shapeKind: BasicShapeKind;
  fill: string;
  shapeImageSrc?: string;
  shapeImageFit: ShapeImageFit;
  shapeImageScale: number;
  shapeImageOffsetX: number;
  shapeImageOffsetY: number;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
  opacity: number;
  angle: number;
  flipX: boolean;
  flipY: boolean;
  locked: boolean;
}

export interface SelectedOtherProps {
  kind: 'other';
  id: string;
  name: string;
  opacity: number;
  angle: number;
  flipX: boolean;
  flipY: boolean;
  locked: boolean;
}

export type SelectedObjectState =
  | SelectedTextProps
  | SelectedImageProps
  | SelectedTemplateSlotProps
  | SelectedShapeProps
  | SelectedOtherProps;

export interface LayerItem {
  id: string;
  kind: 'text' | 'image' | 'slot' | 'shape' | 'other';
  label: string;
  visible: boolean;
  locked: boolean;
  index: number;
  isSelected: boolean;
}

export type TemplatePlacement = 'top' | 'bottom';

export type DiagonalDirection = 'ltr' | 'rtl';

export interface TemplateSlotSummary {
  id: string;
  label: string;
  slotIndex: number;
  width: number;
  height: number;
  cornerPercent: number;
}

export type SidebarTab =
  | 'text'
  | 'image'
  | 'shapes'
  | 'templates'
  | 'background'
  | 'layers';

export type OverflowControlKey =
  | 'tl'
  | 'tr'
  | 'bl'
  | 'br'
  | 'ml'
  | 'mr'
  | 'mt'
  | 'mb'
  | 'mtr';

export interface SelectionBoxSnapshot {
  id: string;
  locked: boolean;
  hasControls: boolean;
  isTextbox: boolean;
  angle: number;
  corners: {
    tl: { x: number; y: number };
    tr: { x: number; y: number };
    br: { x: number; y: number };
    bl: { x: number; y: number };
  };
  controls: Partial<Record<OverflowControlKey, { x: number; y: number }>>;
}

export type CropAspectRatio = 'free' | '1:1' | '4:5' | '5:4' | '9:16' | '16:9';

export interface CanvasPageSnapshot {
  id: string;
  name: string;
  aspectRatio: AspectRatioKey;
  background: BackgroundState;
  canvasJson: Record<string, unknown>;
  thumbnailDataUrl?: string;
}

export interface CanvasPageItem {
  id: string;
  name: string;
  aspectRatio: AspectRatioKey;
  thumbnailDataUrl?: string;
}

