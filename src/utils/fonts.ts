import { ensureFrauncesFontData } from './frauncesSvg';

export interface FontWeightOption {
  value: number;
  label: string;
}

export interface FontOption {
  name: string;
  family: string;
  source: 'google' | 'custom';
  url?: string;
  previewText?: string;
  categoryLabel: string;
  availableWeights: FontWeightOption[];
  isVariableWeight?: boolean;
}

const STANDARD_WEIGHTS_100_TO_700: FontWeightOption[] = [
  { value: 100, label: 'Thin' },
  { value: 200, label: 'ExLight' },
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'SemiBold' },
  { value: 700, label: 'Bold' },
];

const STANDARD_WEIGHTS_300_TO_900: FontWeightOption[] = [
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'SemiBold' },
  { value: 700, label: 'Bold' },
  { value: 800, label: 'ExBold' },
  { value: 900, label: 'Black' },
];

const STANDARD_WEIGHTS_100_TO_900: FontWeightOption[] = [
  { value: 100, label: 'Thin' },
  { value: 200, label: 'ExLight' },
  ...STANDARD_WEIGHTS_300_TO_900,
];

const LT_MUSEUM_WEIGHTS: FontWeightOption[] = [
  { value: 300, label: 'Light' },
  { value: 500, label: 'Medium' },
  { value: 700, label: 'Bold' },
  { value: 900, label: 'Black' },
];

const CASLON_ANTIQUE_WEIGHTS: FontWeightOption[] = [
  { value: 400, label: 'Regular' },
  { value: 700, label: 'Bold' },
];

const LT_STAIRCASE_WEIGHTS: FontWeightOption[] = [
  { value: 400, label: 'Regular' },
];

const FRAUNCES_PRESET_WEIGHTS: FontWeightOption[] = [
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 600, label: 'SemiBold' },
  { value: 700, label: 'Bold' },
  { value: 900, label: 'Black' },
];

export const SUPPORTED_FONTS: FontOption[] = [
  {
    name: 'Fedro',
    family: 'Fedro',
    source: 'custom',
    categoryLabel: 'Display Serif',
    availableWeights: STANDARD_WEIGHTS_300_TO_900,
  },
  {
    name: 'Fraunces',
    family: 'Fraunces',
    source: 'custom',
    url: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,100..900,0..100,0..1;1,9..144,100..900,0..100,0..1&display=swap',
    categoryLabel: 'Variable Serif',
    availableWeights: FRAUNCES_PRESET_WEIGHTS,
    isVariableWeight: true,
  },
  {
    name: 'Delight',
    family: 'Delight',
    source: 'custom',
    categoryLabel: 'Modern Sans',
    availableWeights: STANDARD_WEIGHTS_100_TO_900,
  },
  {
    name: 'LT Museum',
    family: 'LT Museum',
    source: 'custom',
    categoryLabel: 'Editorial Sans',
    availableWeights: LT_MUSEUM_WEIGHTS,
  },
  {
    name: 'LT Staircase',
    family: 'LT Staircase',
    source: 'custom',
    categoryLabel: 'Display Serif',
    availableWeights: LT_STAIRCASE_WEIGHTS,
  },
  {
    name: 'Morganite',
    family: 'Morganite',
    source: 'custom',
    categoryLabel: 'Tall Condensed',
    availableWeights: STANDARD_WEIGHTS_100_TO_900,
  },
  {
    name: 'Humane',
    family: 'Humane',
    source: 'custom',
    categoryLabel: 'Condensed Display',
    availableWeights: STANDARD_WEIGHTS_100_TO_700,
  },
  {
    name: 'Caslon Antique',
    family: 'Caslon Antique',
    source: 'custom',
    categoryLabel: 'Vintage Serif',
    availableWeights: CASLON_ANTIQUE_WEIGHTS,
  },
  {
    name: 'Inter',
    family: 'Inter',
    source: 'google',
    url: 'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,100..900;1,100..900&display=swap',
    categoryLabel: 'Modern Sans',
    availableWeights: STANDARD_WEIGHTS_100_TO_900,
  },
  {
    name: 'Montserrat',
    family: 'Montserrat',
    source: 'google',
    url: 'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap',
    categoryLabel: 'Geometric Sans',
    availableWeights: STANDARD_WEIGHTS_100_TO_900,
  },
];

export function getFontWeightOptions(
  fontFamily: string,
  fonts: FontOption[] = SUPPORTED_FONTS
): FontWeightOption[] {
  const match = fonts.find(
    (f) => f.family.toLowerCase() === fontFamily.replace(/['"]/g, '').trim().toLowerCase()
  );
  return match?.availableWeights ?? [
    { value: 400, label: 'Regular' },
    { value: 700, label: 'Bold' },
  ];
}

export function snapToSupportedWeight(
  weight: number,
  fontFamily: string,
  fonts: FontOption[] = SUPPORTED_FONTS
): number {
  const options = getFontWeightOptions(fontFamily, fonts);
  if (options.some((o) => o.value === weight)) {
    return weight;
  }
  return options.reduce((closest, candidate) =>
    Math.abs(candidate.value - weight) < Math.abs(closest.value - weight)
      ? candidate
      : closest
  ).value;
}

const loadedFontFamilies = new Set<string>();

export const isFontLoaded = (family: string): boolean => {
  if (loadedFontFamilies.has(family)) return true;
  if (typeof document === 'undefined' || !('fonts' in document)) return false;
  for (const face of document.fonts) {
    if (
      face.family.replace(/['"]/g, '').toLowerCase() === family.toLowerCase() &&
      face.status === 'loaded'
    ) {
      loadedFontFamilies.add(family);
      return true;
    }
  }
  return false;
};

export const loadFont = async (
  font: FontOption,
  weight: string | number = 400,
  style: string = 'normal'
): Promise<boolean> => {
  if (typeof document === 'undefined') return false;

  if (font.url && !document.querySelector(`link[href="${font.url}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = font.url;
    document.head.appendChild(link);
  }

  if ('fonts' in document) {
    try {
      const descriptor = `${style} ${weight} 16px "${font.family}"`;
      const loaded = await document.fonts.load(descriptor);
      if (loaded.length > 0) {
        loadedFontFamilies.add(font.family);
        return true;
      }
      // Fallback check at default weight 400 normal in case specific weight isn't defined
      const defaultLoaded = await document.fonts.load(`16px "${font.family}"`);
      if (defaultLoaded.length > 0) {
        loadedFontFamilies.add(font.family);
        return true;
      }
    } catch {
      return false;
    }
  }

  return isFontLoaded(font.family);
};

export const preloadAllFonts = async (): Promise<void> => {
  const localDiscretePreloads = SUPPORTED_FONTS.filter(
    (font) => font.source === 'custom' && !font.isVariableWeight
  ).flatMap((font) =>
    font.availableWeights.flatMap((w) => [
      loadFont(font, w.value, 'normal'),
      loadFont(font, w.value, 'italic'),
    ])
  );

  await Promise.allSettled([
    ...SUPPORTED_FONTS.map((font) =>
      loadFont(
        font,
        snapToSupportedWeight(400, font.family, SUPPORTED_FONTS),
        'normal'
      )
    ),
    ...localDiscretePreloads,
    loadFont(SUPPORTED_FONTS[1], 100, 'normal'),
    loadFont(SUPPORTED_FONTS[1], 600, 'normal'),
    loadFont(SUPPORTED_FONTS[1], 700, 'normal'),
    loadFont(SUPPORTED_FONTS[1], 900, 'normal'),
    loadFont(SUPPORTED_FONTS[1], 600, 'italic'),
    loadFont(SUPPORTED_FONTS[1], 700, 'italic'),
    ensureFrauncesFontData(),
  ]);
};

async function registerCustomFontBuffer(
  familyName: string,
  buffer: ArrayBuffer
): Promise<FontOption> {
  const fontFace = new FontFace(familyName, buffer);
  const loadedFace = await fontFace.load();
  document.fonts.add(loadedFace);
  loadedFontFamilies.add(familyName);

  const isVariableRange = /\s+\d+/.test(loadedFace.weight);
  return {
    name: familyName,
    family: familyName,
    source: 'custom',
    categoryLabel: 'Local Font',
    isVariableWeight: isVariableRange,
    availableWeights: isVariableRange
      ? STANDARD_WEIGHTS_100_TO_900
      : [
          { value: 400, label: 'Regular' },
          { value: 700, label: 'Bold' },
        ],
  };
}

export const registerCustomFontFile = async (file: File): Promise<FontOption> => {
  const buffer = await file.arrayBuffer();
  const baseName = file.name.replace(/\.[^/.]+$/, '').trim() || 'Custom Font';
  return registerCustomFontBuffer(baseName, buffer);
};

export const registerCustomFontFromDataUrl = async (
  family: string,
  dataUrl: string
): Promise<FontOption> => {
  const res = await fetch(dataUrl);
  const buffer = await res.arrayBuffer();
  return registerCustomFontBuffer(family, buffer);
};
