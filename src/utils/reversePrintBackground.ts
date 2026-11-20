import type { BackgroundReversePrint } from '../types/editor';
import { getSafeZoneBounds } from './snapGuides';

const MALAY_PARAGRAPHS = [
  'Pada suatu petang yang redup, angin lembut bertiup menyusuri beranda rumah lama sambil membawa bau tanah selepas hujan dan bunyi dedaun yang bergeser perlahan.',
  'Setiap helaian kertas menyimpan jejak waktu yang tidak pernah tergesa-gesa, seolah-olah huruf-huruf yang tercetak di atasnya sedang menunggu untuk dibaca semula dalam diam.',
  'Di sudut meja kayu itu, secawan kopi hitam yang sudah suam menjadi saksi kepada catatan ringkas tentang perjalanan, kenangan lama, dan harapan yang masih belum selesai ditulis.',
  'Kadangkala kita tidak perlu mencari jawapan yang terlalu jauh, kerana ketenangan selalunya bersembunyi di celah rutin harian yang sering kita anggap biasa sahaja.',
  'Langit Kuala Lumpur pada lewat senja selalu berubah warna daripada jingga pudar kepada biru kelam sebelum lampu-lampu jalan mula menyala satu demi satu.',
  'Bunyi hujan yang turun rintik-rintik di atas bumbung zink mengingatkan kita kepada zaman kanak-kanak ketika waktu terasa jauh lebih panjang dan sederhana.',
  'Dalam setiap perbualan yang jujur, ada ruang kecil untuk mendengar tanpa menghakimi, memahami tanpa terburu-buru, dan menghargai setiap kata yang diluahkan.',
  'Buku yang sudah lama tersimpan di rak paling atas itu masih berbau dakwat dan kenangan, walaupun pinggir halamannya sedikit menguning dimakan masa.',
  'Langkah yang perlahan bukanlah tanda kita ketinggalan, sebaliknya memberi peluang untuk melihat perincian kecil yang sering terlepas pandang ketika berlari.',
  'Apabila malam semakin larut dan kota mulai sunyi, fikiran yang berserabut perlahan-lahan tersusun semula menjadi baris ayat yang lebih tenang dan bermakna.',
  'Secarik nota yang ditulis dengan tangan terasa lebih dekat di hati kerana setiap lekuk huruf membawa emosi serta kehadiran penulisnya pada saat itu.',
  'Esok sentiasa datang sebagai halaman baharu yang masih kosong, memberi ruang untuk kita mencuba lagi dengan hati yang lebih lapang dan sabar.',
];

function createPrng(seed: number): () => number {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let cachedKey = '';
let cachedCanvas: HTMLCanvasElement | null = null;

function buildReversePrintCanvas(
  width: number,
  height: number,
  seed: number,
  inkBleedBlur: number,
  inkBleedThreshold: number,
  scale: number
): HTMLCanvasElement {
  const sw = Math.max(1, Math.round(width * scale));
  const sh = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const safe = getSafeZoneBounds(width, height);
  const rand = createPrng(seed);

  // Shuffle Malay paragraphs deterministically using seed
  const pool = [...MALAY_PARAGRAPHS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const fontSize = 90;
  const lineHeight = 90; // 1.00 line-height matching Body preset
  const paragraphGap = 44;
  const fontDecl = `400 ${fontSize}px "Plantin MT Pro", Georgia, serif`;

  ctx.font = fontDecl;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  interface WordRun {
    text: string;
    x: number;
    y: number;
    width: number;
    isDark: boolean;
    bleed: boolean;
    bleedBlur: number;
    bleedAlpha: number;
    bleedDx: number;
    bleedDy: number;
  }

  const wordsToDraw: WordRun[] = [];
  let cursorY = safe.top;
  let poolIdx = 0;

  // Wrap paragraphs to fill the entire safe area height
  while (cursorY + lineHeight <= safe.bottom) {
    const paragraph = pool[poolIdx % pool.length];
    poolIdx++;
    const tokens = paragraph.split(/\s+/);
    let lineWords: string[] = [];
    let lineWidth = 0;
    const spaceW = ctx.measureText(' ').width;

    const flushLine = () => {
      if (lineWords.length === 0 || cursorY + lineHeight > safe.bottom) return;
      let cursorX = safe.left;
      for (let i = 0; i < lineWords.length; i++) {
        const w = lineWords[i];
        const wWidth = ctx.measureText(w).width;
        const isDark = rand() < 0.34;
        const bleed = rand() < 0.22;
        wordsToDraw.push({
          text: w,
          x: cursorX,
          y: cursorY,
          width: wWidth,
          isDark,
          bleed,
          bleedBlur: 3.5 + rand() * 5.5,
          bleedAlpha: 0.3 + rand() * 0.4,
          bleedDx: (rand() - 0.5) * 5,
          bleedDy: (rand() - 0.5) * 5,
        });
        cursorX += wWidth + spaceW;
      }
      cursorY += lineHeight;
    };

    for (const token of tokens) {
      const tokenW = ctx.measureText(token).width;
      const nextW = lineWords.length === 0 ? tokenW : lineWidth + spaceW + tokenW;
      if (nextW > safe.width && lineWords.length > 0) {
        flushLine();
        if (cursorY + lineHeight > safe.bottom) break;
        lineWords = [token];
        lineWidth = tokenW;
      } else {
        lineWords.push(token);
        lineWidth = nextW;
      }
    }
    flushLine();
    cursorY += paragraphGap;
  }

  // Step 1: Render mirrored text with controllable Ink Bleed (blur + threshold) on a scratch canvas
  const bleedCanvas = document.createElement('canvas');
  bleedCanvas.width = sw;
  bleedCanvas.height = sh;
  const bleedCtx = bleedCanvas.getContext('2d', { willReadFrequently: true });
  if (!bleedCtx) return canvas;

  const rawBlur = Math.max(0, Math.min(30, inkBleedBlur));
  const blurPx =
    rawBlur <= 0 ? 0 : Math.min(80, rawBlur * (fontSize / 40)) * scale;

  bleedCtx.save();
  bleedCtx.scale(scale, scale);
  bleedCtx.translate(width, 0);
  bleedCtx.scale(-1, 1);
  bleedCtx.font = fontDecl;
  bleedCtx.textBaseline = 'top';
  bleedCtx.textAlign = 'left';
  bleedCtx.fillStyle = '#1a1816';
  let filterApplied = false;
  if (blurPx > 0 && 'filter' in bleedCtx) {
    bleedCtx.filter = `blur(${blurPx.toFixed(2)}px)`;
    filterApplied = bleedCtx.filter !== 'none' && bleedCtx.filter !== '';
  }
  for (const run of wordsToDraw) {
    bleedCtx.fillText(run.text, run.x, run.y);
  }
  bleedCtx.restore();

  if (rawBlur > 0) {
    const imgData = bleedCtx.getImageData(0, 0, sw, sh);
    const data = imgData.data;

    // Fallback separable box blur on alpha if ctx.filter is unsupported (e.g. iOS Safari)
    if (blurPx > 0 && !filterApplied) {
      const r = Math.max(1, Math.round(blurPx));
      const tmp = new Uint8ClampedArray(sw * sh);
      for (let pass = 0; pass < 2; pass++) {
        for (let y = 0; y < sh; y++) {
          const rowOff = y * sw;
          let sum = 0;
          const initEnd = Math.min(sw - 1, r);
          for (let kx = 0; kx <= initEnd; kx++) {
            sum += data[(rowOff + kx) * 4 + 3];
          }
          for (let x = 0; x < sw; x++) {
            if (x > r) sum -= data[(rowOff + x - r - 1) * 4 + 3];
            if (x + r < sw && x > 0) {
              sum += data[(rowOff + x + r) * 4 + 3];
            }
            const count = Math.min(sw - 1, x + r) - Math.max(0, x - r) + 1;
            tmp[rowOff + x] = Math.round(sum / count);
          }
        }
        for (let x = 0; x < sw; x++) {
          let sum = 0;
          const initEnd = Math.min(sh - 1, r);
          for (let ky = 0; ky <= initEnd; ky++) {
            sum += tmp[ky * sw + x];
          }
          for (let y = 0; y < sh; y++) {
            if (y > r) sum -= tmp[(y - r - 1) * sw + x];
            if (y + r < sh && y > 0) {
              sum += tmp[(y + r) * sw + x];
            }
            const count = Math.min(sh - 1, y + r) - Math.max(0, y - r) + 1;
            data[(y * sw + x) * 4 + 3] = Math.round(sum / count);
          }
        }
      }
    }

    const threshold = Math.max(0.01, Math.min(0.99, inkBleedThreshold / 100));
    for (let i = 3; i < data.length; i += 4) {
      const a = data[i];
      if (a === 0) continue;
      data[i] = a / 255 >= threshold ? 255 : 0;
    }
    bleedCtx.putImageData(imgData, 0, 0);

    // Restore pure ink color so thresholded edges have crisp solid fill
    bleedCtx.save();
    bleedCtx.globalCompositeOperation = 'source-in';
    bleedCtx.fillStyle = '#1a1816';
    bleedCtx.fillRect(0, 0, sw, sh);
    bleedCtx.restore();
  }

  // Step 2: Composite onto final canvas with subtle through-paper softness & random darker words
  ctx.save();
  ctx.filter = `blur(${(1.15 * scale).toFixed(2)}px)`;
  ctx.globalAlpha = 0.58;
  ctx.drawImage(bleedCanvas, 0, 0);

  // Darken random words so some text appears darker than the rest
  ctx.save();
  ctx.scale(scale, scale);
  ctx.beginPath();
  for (const run of wordsToDraw) {
    if (!run.isDark) continue;
    const mirroredLeft = width - (run.x + run.width) - 6;
    ctx.rect(mirroredLeft, run.y - 4, run.width + 12, lineHeight + 8);
  }
  ctx.clip();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 0.55;
  ctx.drawImage(bleedCanvas, 0, 0);
  ctx.restore();

  // Pass 3: Random localized ink bleed halos here and there
  ctx.scale(scale, scale);
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.font = fontDecl;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1a1816';
  for (const run of wordsToDraw) {
    if (!run.bleed) continue;
    ctx.filter = `blur(${(run.bleedBlur * scale).toFixed(1)}px)`;
    ctx.globalAlpha = run.bleedAlpha;
    ctx.fillText(run.text, run.x + run.bleedDx, run.y + run.bleedDy);
  }
  ctx.restore();

  return canvas;
}

export function renderBackgroundReversePrint(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  reversePrint: BackgroundReversePrint | undefined,
  quality: 'preview' | 'full' = 'full'
): void {
  if (!reversePrint || !reversePrint.enabled) return;

  const alpha = Math.max(0, Math.min(1, reversePrint.opacity / 100));
  if (alpha <= 0) return;

  const scale = quality === 'preview' ? 0.25 : 1;
  const seed = reversePrint.seed || 1;
  const inkBleedBlur = reversePrint.inkBleedBlur ?? 0.15;
  const inkBleedThreshold = reversePrint.inkBleedThreshold ?? 20;
  const key = `${width}x${height}:${scale}:${seed}:${inkBleedBlur.toFixed(2)}:${Math.round(inkBleedThreshold)}`;
  if (!cachedCanvas || cachedKey !== key) {
    cachedCanvas = buildReversePrintCanvas(
      width,
      height,
      seed,
      inkBleedBlur,
      inkBleedThreshold,
      scale
    );
    cachedKey = key;
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(cachedCanvas, 0, 0, width, height);
  ctx.restore();
}
