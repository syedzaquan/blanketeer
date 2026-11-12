import * as fabric from 'fabric';
import type { ExportImageFormat } from '../types/editor';
import {
  hasPendingFrauncesDecodes,
  isFrauncesFamily,
  isFrauncesFontDataReady,
  waitForPendingFrauncesDecodes,
} from './frauncesSvg';

export interface ExportPreviewPayload {
  blob: Blob;
  blobUrl: string;
  dataURL: string;
  filename: string;
}

export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /iPad|iPhone|iPod/i.test(ua) ||
    (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
  );
}

function dataUrlToBlob(dataURL: string): Blob {
  const commaIdx = dataURL.indexOf(',');
  if (commaIdx === -1) {
    throw new Error('Invalid exported image data');
  }
  const header = dataURL.slice(0, commaIdx);
  const mimeMatch = header.match(/data:([^;]+)/);
  const mime = mimeMatch?.[1] || 'image/png';
  const binary = atob(dataURL.slice(commaIdx + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function triggerAnchorDownload(href: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = href;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function sharePngBlob(
  blob: Blob,
  filename: string
): Promise<'shared' | 'cancelled' | 'unsupported'> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return 'unsupported';
  }
  if (typeof File === 'undefined') {
    return 'unsupported';
  }

  const file = new File([blob], filename, { type: 'image/png' });
  if (
    typeof navigator.canShare === 'function' &&
    !navigator.canShare({ files: [file] })
  ) {
    return 'unsupported';
  }

  try {
    await navigator.share({
      files: [file],
      title: filename,
    });
    return 'shared';
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return 'cancelled';
    }
    return 'unsupported';
  }
}

export const exportCanvasToImage = async (
  canvas: fabric.Canvas,
  options: {
    format?: ExportImageFormat;
    quality?: number;
    filename?: string;
  } = {}
): Promise<ExportPreviewPayload | null> => {
  const format: ExportImageFormat = options.format ?? 'png';
  const quality = format === 'png' ? 1 : (options.quality ?? 0.92);
  const ext = format === 'jpeg' ? 'jpg' : format;
  const filename = options.filename ?? `story-${Date.now()}.${ext}`;
  const mimeType = `image/${format}`;

  const active = canvas.getActiveObject();
  if (active && 'isEditing' in active && (active as fabric.IText).isEditing) {
    (active as fabric.IText).exitEditing();
  }

  canvas.discardActiveObject();
  canvas.renderAll();

  const hasFrauncesLayer = canvas
    .getObjects()
    .some(
      (obj) =>
        obj.visible !== false &&
        obj instanceof fabric.Textbox &&
        isFrauncesFamily(obj.fontFamily)
    );

  // Only await when Fraunces data or SVG decodes are genuinely pending so we preserve
  // iOS Safari's transient user-activation gesture whenever fonts are already ready.
  if (
    hasFrauncesLayer &&
    (!isFrauncesFontDataReady() || hasPendingFrauncesDecodes())
  ) {
    await waitForPendingFrauncesDecodes();
    canvas.getObjects().forEach((obj) => {
      if (obj instanceof fabric.Textbox) {
        obj.dirty = true;
      }
    });
    canvas.renderAll();
  }

  const dataURL = canvas.toDataURL({
    format,
    multiplier: 1, // Native resolution export
    quality,
  });

  if (!dataURL || dataURL === 'data:,' || !dataURL.startsWith('data:image/')) {
    throw new Error('Canvas export produced empty image data');
  }

  const blob = dataUrlToBlob(dataURL);
  const blobUrl = URL.createObjectURL(blob);

  if (isIOSDevice()) {
    const file = new File([blob], filename, { type: mimeType });
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      (typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] }))
    ) {
      try {
        await navigator.share({ files: [file], title: filename });
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        return null;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
          return null;
        }
      }
    }
    return {
      blob,
      blobUrl,
      dataURL,
      filename,
    };
  }

  triggerAnchorDownload(blobUrl, filename);
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  return null;
};

export const exportCanvasToPNG = async (
  canvas: fabric.Canvas,
  filename = `story-${Date.now()}.png`
): Promise<ExportPreviewPayload | null> =>
  exportCanvasToImage(canvas, { format: 'png', quality: 1, filename });
