import * as fabric from 'fabric';
import { waitForPendingFrauncesDecodes } from './frauncesSvg';

export const exportCanvasToPNG = async (
  canvas: fabric.Canvas,
  filename = `story-${Date.now()}.png`
): Promise<void> => {
  const active = canvas.getActiveObject();
  if (active && 'isEditing' in active && (active as fabric.IText).isEditing) {
    (active as fabric.IText).exitEditing();
  }

  canvas.discardActiveObject();
  canvas.renderAll();

  await waitForPendingFrauncesDecodes();
  canvas.getObjects().forEach((obj) => {
    if (obj instanceof fabric.Textbox) {
      obj.dirty = true;
    }
  });
  canvas.renderAll();

  const dataURL = canvas.toDataURL({
    format: 'png',
    multiplier: 1, // Native resolution export
    quality: 1,
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

