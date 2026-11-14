import * as fabric from 'fabric';
import {
  ASPECT_RATIO_PRESETS,
  type CanvasPageSnapshot,
  type ExportImageFormat,
} from '../types/editor';
import { applyBackgroundImageAdjustments } from './backgroundFilters';
import { createLinearGradient } from './canvasHelpers';
import { applyStoryImageFilters } from './imageFilters';
import type { StoryImage } from './storyImage';
import { StoryTextbox } from './storyTextbox';
import { restoreShapeImageFills } from './shapeImageFill';
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

export interface ExportedPageItem {
  pageId: string;
  pageName: string;
  blob: Blob;
  blobUrl: string;
  dataURL: string;
  filename: string;
  width: number;
  height: number;
}

export async function renderPageSnapshotToPayload(
  page: CanvasPageSnapshot,
  slideNumber: number,
  format: ExportImageFormat = 'png',
  quality?: number
): Promise<ExportedPageItem> {
  const preset = ASPECT_RATIO_PRESETS[page.aspectRatio] ?? ASPECT_RATIO_PRESETS['4:5'];
  const ext = format === 'jpeg' ? 'jpg' : format;
  const safeSlug = page.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const filename = `blanketeer-${safeSlug || `slide-${slideNumber}`}.${ext}`;
  const finalQuality = format === 'png' ? 1 : (quality ?? 0.92);

  const el = document.createElement('canvas');
  el.width = preset.width;
  el.height = preset.height;
  const staticCanvas = new fabric.StaticCanvas(el, {
    width: preset.width,
    height: preset.height,
    renderOnAddRemove: false,
  });

  try {
    if (page.background.mode === 'color') {
      staticCanvas.backgroundColor = page.background.color;
    } else if (page.background.mode === 'gradient') {
      staticCanvas.backgroundColor = createLinearGradient(
        preset.width,
        preset.height,
        page.background.gradient
      );
    }

    await staticCanvas.loadFromJSON(page.canvasJson);
    await restoreShapeImageFills(staticCanvas);

    staticCanvas.getObjects().forEach((obj) => {
      if (obj instanceof StoryTextbox) {
        obj.dirty = true;
        obj.initDimensions();
        obj.setCoords();
      }
      if (obj instanceof fabric.FabricImage) {
        const imgWithFilter = obj as StoryImage;
        if (imgWithFilter.imageFilter) {
          applyStoryImageFilters(imgWithFilter, imgWithFilter.imageFilter, 'full');
        }
      }
    });

    if (
      page.background.mode === 'image' &&
      page.background.image &&
      staticCanvas.backgroundImage instanceof fabric.FabricImage
    ) {
      applyBackgroundImageAdjustments(
        staticCanvas.backgroundImage,
        page.background.image.adjustments,
        'full'
      );
    }

    staticCanvas.renderAll();

    const hasFrauncesLayer = staticCanvas
      .getObjects()
      .some(
        (obj) =>
          obj.visible !== false &&
          obj instanceof fabric.Textbox &&
          isFrauncesFamily(obj.fontFamily)
      );

    if (
      hasFrauncesLayer &&
      (!isFrauncesFontDataReady() || hasPendingFrauncesDecodes())
    ) {
      await waitForPendingFrauncesDecodes();
      staticCanvas.getObjects().forEach((obj) => {
        if (obj instanceof fabric.Textbox) {
          obj.dirty = true;
        }
      });
      staticCanvas.renderAll();
    }

    const dataURL = staticCanvas.toDataURL({
      format,
      multiplier: 1,
      quality: finalQuality,
    });

    if (!dataURL || dataURL === 'data:,' || !dataURL.startsWith('data:image/')) {
      throw new Error(`Export failed for ${page.name}`);
    }

    const blob = dataUrlToBlob(dataURL);
    const blobUrl = URL.createObjectURL(blob);

    return {
      pageId: page.id,
      pageName: page.name,
      blob,
      blobUrl,
      dataURL,
      filename,
      width: preset.width,
      height: preset.height,
    };
  } finally {
    staticCanvas.dispose();
  }
}

export async function shareOrDownloadExportedPages(
  items: ExportedPageItem[],
  format: ExportImageFormat
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (items.length === 0) return 'cancelled';
  const mimeType = `image/${format}`;

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof File !== 'undefined'
  ) {
    const files = items.map(
      (item) => new File([item.blob], item.filename, { type: mimeType })
    );
    if (
      typeof navigator.canShare !== 'function' ||
      navigator.canShare({ files })
    ) {
      try {
        await navigator.share({
          files,
          title: `Blanketeer (${items.length} ${items.length === 1 ? 'slide' : 'slides'})`,
        });
        return 'shared';
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return 'cancelled';
        }
      }
    }
  }

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    triggerAnchorDownload(item.blobUrl, item.filename);
    if (i < items.length - 1) {
      await new Promise((r) => window.setTimeout(r, 120));
    }
  }
  return 'downloaded';
}
