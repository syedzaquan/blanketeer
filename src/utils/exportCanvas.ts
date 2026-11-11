import * as fabric from 'fabric';

export const exportCanvasToPNG = (
  canvas: fabric.Canvas,
  filename = `story-${Date.now()}.png`
): void => {
  const active = canvas.getActiveObject();
  if (active && 'isEditing' in active && (active as fabric.IText).isEditing) {
    (active as fabric.IText).exitEditing();
  }

  canvas.discardActiveObject();
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

