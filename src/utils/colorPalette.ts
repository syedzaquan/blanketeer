const toHex = (value: number): string =>
  Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();

interface ColorBucket {
  rSum: number;
  gSum: number;
  bSum: number;
  count: number;
  score: number;
}

/**
 * Samples up to `maxColors` distinct dominant colors from an image URL/dataURL.
 */
export async function extractImagePalette(
  src: string,
  maxColors = 5
): Promise<string[]> {
  if (typeof document === 'undefined' || !src) return [];

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image for palette'));
    img.src = src;
  });

  const sampleSize = 48;
  const canvas = document.createElement('canvas');
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
  const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

  const buckets = new Map<number, ColorBucket>();

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 160) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Quantize into 24-step buckets (0..10 per channel)
    const rq = Math.round(r / 24);
    const gq = Math.round(g / 24);
    const bq = Math.round(b / 24);
    const key = (rq << 10) | (gq << 5) | bq;

    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const saturation = maxC > 0 ? (maxC - minC) / maxC : 0;
    const weight = 1 + saturation * 1.4;

    const existing = buckets.get(key);
    if (existing) {
      existing.rSum += r;
      existing.gSum += g;
      existing.bSum += b;
      existing.count += 1;
      existing.score += weight;
    } else {
      buckets.set(key, {
        rSum: r,
        gSum: g,
        bSum: b,
        count: 1,
        score: weight,
      });
    }
  }

  const sorted = Array.from(buckets.values()).sort((a, b) => b.score - a.score);
  const picked: { r: number; g: number; b: number }[] = [];

  for (const bucket of sorted) {
    if (picked.length >= maxColors) break;
    const r = bucket.rSum / bucket.count;
    const g = bucket.gSum / bucket.count;
    const b = bucket.bSum / bucket.count;

    const isDistinct = picked.every(
      (c) => Math.hypot(c.r - r, c.g - g, c.b - b) >= 48
    );
    if (isDistinct) {
      picked.push({ r, g, b });
    }
  }

  return picked.map((c) => `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`);
}

