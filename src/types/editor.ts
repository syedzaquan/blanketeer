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

export type CutoutShape = 'none' | 'circle' | 'square' | 'rounded' | 'star' | 'heart';

export type ImageStrokeStyle = 'solid' | 'dashed' | 'dotted';

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
  opacity: number;
  angle: number;
  flipX: boolean;
  flipY: boolean;
  locked: boolean;
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
  | SelectedOtherProps;

export interface LayerItem {
  id: string;
  kind: 'text' | 'image' | 'slot' | 'other';
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
  | 'templates'
  | 'background'
  | 'layers';

