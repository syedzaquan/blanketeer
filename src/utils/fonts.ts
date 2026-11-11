export interface FontOption {
  name: string;
  family: string;
  source: 'google' | 'custom';
  url?: string;
  previewText?: string;
  categoryLabel: string;
}

export const SUPPORTED_FONTS: FontOption[] = [
  {
    name: 'Fedro',
    family: 'Fedro',
    source: 'custom',
    categoryLabel: 'Display Serif',
  },
  {
    name: 'Fraunces',
    family: 'Fraunces',
    source: 'custom',
    categoryLabel: 'Variable Serif',
  },
  {
    name: 'Inter',
    family: 'Inter',
    source: 'google',
    url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap',
    categoryLabel: 'Modern Sans',
  },
  {
    name: 'Montserrat',
    family: 'Montserrat',
    source: 'google',
    url: 'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,600;0,700;0,900;1,400;1,700&display=swap',
    categoryLabel: 'Geometric Sans',
  },
];

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
  await Promise.allSettled([
    ...SUPPORTED_FONTS.map((font) => loadFont(font, 400, 'normal')),
    loadFont(SUPPORTED_FONTS[0], 600, 'normal'),
    loadFont(SUPPORTED_FONTS[0], 700, 'normal'),
    loadFont(SUPPORTED_FONTS[0], 900, 'normal'),
    loadFont(SUPPORTED_FONTS[0], 400, 'italic'),
    loadFont(SUPPORTED_FONTS[0], 700, 'italic'),
    loadFont(SUPPORTED_FONTS[1], 600, 'normal'),
    loadFont(SUPPORTED_FONTS[1], 700, 'normal'),
    loadFont(SUPPORTED_FONTS[1], 900, 'normal'),
    loadFont(SUPPORTED_FONTS[1], 400, 'italic'),
    loadFont(SUPPORTED_FONTS[1], 700, 'italic'),
  ]);
};

export const registerCustomFontFile = async (file: File): Promise<FontOption> => {
  const buffer = await file.arrayBuffer();
  const baseName = file.name.replace(/\.[^/.]+$/, '').trim() || 'Custom Font';
  const fontFace = new FontFace(baseName, buffer);
  const loadedFace = await fontFace.load();
  document.fonts.add(loadedFace);
  loadedFontFamilies.add(baseName);

  return {
    name: baseName,
    family: baseName,
    source: 'custom',
    categoryLabel: 'Local Font',
  };
};
