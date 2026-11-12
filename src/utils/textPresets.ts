export type TextStylePresetId = 'heading' | 'subheading' | 'body' | 'small';

export interface TextStylePreset {
  id: TextStylePresetId;
  label: string;
  fontSize: number;
  fontWeight: number;
  fill: string;
  lineHeight: number;
  charSpacing: number;
  boxWidth: number;
  defaultText: string;
  editorName: string;
}

export const TEXT_STYLE_PRESETS: TextStylePreset[] = [
  {
    id: 'heading',
    label: 'Heading',
    fontSize: 64,
    fontWeight: 600,
    fill: '#000000',
    lineHeight: 1.0,
    charSpacing: 0,
    boxWidth: 760,
    defaultText: 'Editorial Heading',
    editorName: 'Heading',
  },
  {
    id: 'subheading',
    label: 'Subheading',
    fontSize: 48,
    fontWeight: 500,
    fill: '#171717',
    lineHeight: 1.0,
    charSpacing: 0,
    boxWidth: 740,
    defaultText: 'Subheading goes here',
    editorName: 'Subheading',
  },
  {
    id: 'body',
    label: 'Body',
    fontSize: 36,
    fontWeight: 400,
    fill: '#262626',
    lineHeight: 1.0,
    charSpacing: 5,
    boxWidth: 740,
    defaultText: 'Write your caption or story details here. Drag side handles to wrap lines.',
    editorName: 'Body Text',
  },
  {
    id: 'small',
    label: 'Small',
    fontSize: 32,
    fontWeight: 400,
    fill: '#333333',
    lineHeight: 1.0,
    charSpacing: 10,
    boxWidth: 680,
    defaultText: 'Small label or caption',
    editorName: 'Small Text',
  },
];

export const TEXT_STYLE_PRESETS_BY_ID: Record<TextStylePresetId, TextStylePreset> = {
  heading: TEXT_STYLE_PRESETS[0],
  subheading: TEXT_STYLE_PRESETS[1],
  body: TEXT_STYLE_PRESETS[2],
  small: TEXT_STYLE_PRESETS[3],
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

