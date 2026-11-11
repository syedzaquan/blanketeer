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

export interface GradientConfig {
  startColor: string;
  endColor: string;
  angle: number;
}

export interface BackgroundImageConfig {
  src: string;
  zoom: number;
  panX: number;
  panY: number;
  fitMode: 'cover' | 'contain';
}

export interface BackgroundState {
  mode: BackgroundMode;
  color: string;
  gradient: GradientConfig;
  image: BackgroundImageConfig | null;
}

export type TextBackgroundStyle = 'none' | 'solid' | 'pill';

export type CutoutShape = 'none' | 'circle' | 'square' | 'rounded' | 'star' | 'heart';

export interface SelectedTextProps {
  kind: 'text';
  id: string;
  name: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
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
  opacity: number;
  angle: number;
  scaleX: number;
  scaleY: number;
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

export type SelectedObjectState = SelectedTextProps | SelectedImageProps | SelectedOtherProps;

export interface LayerItem {
  id: string;
  kind: 'text' | 'image' | 'other';
  label: string;
  visible: boolean;
  locked: boolean;
  index: number;
  isSelected: boolean;
}

export type SidebarTab = 'text' | 'image' | 'background' | 'layers';

