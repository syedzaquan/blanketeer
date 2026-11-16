export type TextStylePresetId =
  | 'hero'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'small';

export interface TextStylePreset {
  id: TextStylePresetId;
  label: string;
  fontFamily?: string;
  fontSize: number;
  fontWeight: number;
  fill: string;
  lineHeight: number;
  charSpacing: number;
  inkBleed?: boolean;
  inkBleedBlur?: number;
  inkBleedThreshold?: number;
  boxWidth: number;
  defaultText: string;
  editorName: string;
}

export const TEXT_STYLE_PRESETS: TextStylePreset[] = [
  {
    id: 'hero',
    label: 'Hero Heading',
    fontFamily: 'Plantin MT Pro',
    fontSize: 170,
    fontWeight: 400,
    fill: '#000000',
    lineHeight: 1.0,
    charSpacing: -30,
    inkBleed: true,
    inkBleedBlur: 0.05,
    inkBleedThreshold: 10,
    boxWidth: 1680,
    defaultText: 'Hero Heading',
    editorName: 'Hero Heading',
  },
  {
    id: 'heading',
    label: 'Heading',
    fontFamily: 'Plantin MT Pro',
    fontSize: 128,
    fontWeight: 400,
    fill: '#000000',
    lineHeight: 0.9,
    charSpacing: -10,
    inkBleed: false,
    boxWidth: 1520,
    defaultText: 'Editorial Heading',
    editorName: 'Heading',
  },
  {
    id: 'subheading',
    label: 'Subheading',
    fontFamily: 'Plantin MT Pro',
    fontSize: 96,
    fontWeight: 500,
    fill: '#171717',
    lineHeight: 1.0,
    charSpacing: 0,
    inkBleed: false,
    boxWidth: 1480,
    defaultText: 'Subheading goes here',
    editorName: 'Subheading',
  },
  {
    id: 'body',
    label: 'Body',
    fontFamily: 'Plantin MT Pro',
    fontSize: 90,
    fontWeight: 400,
    fill: '#262626',
    lineHeight: 1.0,
    charSpacing: 0,
    inkBleed: false,
    boxWidth: 1480,
    defaultText: 'Write your caption or story details here. Drag side handles to wrap lines.',
    editorName: 'Body Text',
  },
  {
    id: 'small',
    label: 'Small',
    fontFamily: 'Plantin MT Pro',
    fontSize: 64,
    fontWeight: 400,
    fill: '#333333',
    lineHeight: 1.0,
    charSpacing: 10,
    inkBleed: false,
    boxWidth: 1360,
    defaultText: 'Small label or caption',
    editorName: 'Small Text',
  },
];

export const TEXT_STYLE_PRESETS_BY_ID: Record<TextStylePresetId, TextStylePreset> = {
  hero: TEXT_STYLE_PRESETS[0],
  heading: TEXT_STYLE_PRESETS[1],
  subheading: TEXT_STYLE_PRESETS[2],
  body: TEXT_STYLE_PRESETS[3],
  small: TEXT_STYLE_PRESETS[4],
};

export function findMatchingTextPreset(
  fontSize: number,
  fontWeight: number,
  fill: string
): TextStylePresetId | null {
  const normalizedFill = fill.toLowerCase();
  const match = TEXT_STYLE_PRESETS.find(
    (preset) =>
      Math.round(fontSize) === preset.fontSize &&
      fontWeight === preset.fontWeight &&
      normalizedFill === preset.fill.toLowerCase()
  );
  return match?.id ?? null;
}

