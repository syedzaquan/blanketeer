import * as fabric from 'fabric';
import type { TCacheCanvasDimensions, TOptions } from 'fabric';
import type { TextboxProps, SerializedTextboxProps } from 'fabric';
import type { TextBackgroundStyle } from '../types/editor';
import { createEditorId } from './canvasHelpers';

export interface StoryTextboxExtraProps {
  editorId?: string;
  editorName?: string;
  bgStyle?: TextBackgroundStyle;
  textBgColor?: string;
  pillRadius?: number;
  pillPaddingX?: number;
  pillPaddingY?: number;
  locked?: boolean;
}

export type StoryTextboxOptions = TOptions<TextboxProps> & StoryTextboxExtraProps;

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  if (r === 0) {
    ctx.rect(x, y, width, height);
    ctx.closePath();
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const uniformCornerScale: fabric.TransformActionHandler<
  fabric.Transform & { gestureScale?: number; signX?: number; signY?: number }
> = (eventData, transform, x, y) => {
  const canvas = transform.target.canvas;
  if (!canvas) {
    return fabric.controlsUtils.scalingEqually(eventData, transform, x, y);
  }
  const prevUniform = canvas.uniformScaling;
  const uniKey = canvas.uniScaleKey;
  const key = typeof uniKey === 'string' ? uniKey : null;
  const hasUniToggle =
    key !== null &&
    key in eventData &&
    Boolean((eventData as unknown as Record<string, unknown>)[key]);

  const normalizedEvent =
    hasUniToggle && key !== null
      ? new Proxy(eventData, {
          get(orig, prop) {
            if (prop === key) return false;
            const val = Reflect.get(orig, prop, orig);
            return typeof val === 'function' ? val.bind(orig) : val;
          },
        })
      : eventData;

  canvas.uniformScaling = true;
  try {
    return fabric.controlsUtils.scalingEqually(normalizedEvent, transform, x, y);
  } finally {
    canvas.uniformScaling = prevUniform;
  }
};

function renderWidthPillControl(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  styleOverride: Parameters<fabric.Control['render']>[3],
  fabricObject: fabric.FabricObject
): void {
  const fill = styleOverride?.cornerColor || fabricObject.cornerColor || '#ffffff';
  const stroke =
    styleOverride?.cornerStrokeColor || fabricObject.cornerStrokeColor || '#8b5cf6';
  const boxHeight = fabricObject.getScaledHeight();
  const pillW = 10;
  const pillH = Math.max(20, Math.min(38, boxHeight * 0.5));

  ctx.save();
  ctx.translate(left, top);
  ctx.rotate(fabric.util.degreesToRadians(fabricObject.getTotalAngle()));
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  drawRoundedRectPath(ctx, -pillW / 2, -pillH / 2, pillW, pillH, pillW / 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function createStoryTextboxControls(): Record<string, fabric.Control> {
  const base = fabric.controlsUtils.createTextboxDefaultControls();

  const configureCorner = (ctrl: fabric.Control): fabric.Control => {
    ctrl.actionHandler = uniformCornerScale as fabric.TransformActionHandler;
    ctrl.touchSizeX = 30;
    ctrl.touchSizeY = 30;
    return ctrl;
  };

  const configureWidthBar = (ctrl: fabric.Control): fabric.Control => {
    ctrl.actionHandler = fabric.controlsUtils.changeWidth;
    ctrl.sizeX = 12;
    ctrl.sizeY = 38;
    ctrl.touchSizeX = 44;
    ctrl.touchSizeY = 28;
    ctrl.render = renderWidthPillControl;
    return ctrl;
  };

  // Exclude mt/mb vertical-stretch handles so text glyphs can never be thinned/distorted.
  // Place ml/mr after corners because Fabric hit-tests controls in reverse insertion order.
  return {
    tl: configureCorner(base.tl),
    tr: configureCorner(base.tr),
    bl: configureCorner(base.bl),
    br: configureCorner(base.br),
    ml: configureWidthBar(base.ml),
    mr: configureWidthBar(base.mr),
    mtr: base.mtr,
  };
}

export class StoryTextbox extends fabric.Textbox {
  static type = 'StoryTextbox';

  static createControls(): { controls: Record<string, fabric.Control> } {
    return {
      controls: createStoryTextboxControls(),
    };
  }

  static cacheProperties: string[] = [
    ...(fabric.Textbox.cacheProperties || []),
    'bgStyle',
    'textBgColor',
    'pillRadius',
    'pillPaddingX',
    'pillPaddingY',
  ];

  declare editorId: string;
  declare editorName: string;
  declare bgStyle: TextBackgroundStyle;
  declare textBgColor: string;
  declare pillRadius: number;
  declare pillPaddingX: number;
  declare pillPaddingY: number;
  declare locked: boolean;

  constructor(text: string, options: StoryTextboxOptions = {}) {
    const {
      editorId,
      editorName = 'Text Layer',
      bgStyle = 'none',
      textBgColor = '#ffffff',
      pillRadius = 20,
      pillPaddingX = 24,
      pillPaddingY = 8,
      locked = false,
      ...textboxOptions
    } = options;

    super(text, textboxOptions);

    this.editorId = editorId || createEditorId();
    this.editorName = editorName;
    this.bgStyle = bgStyle;
    this.textBgColor = textBgColor;
    this.pillRadius = pillRadius;
    this.pillPaddingX = pillPaddingX;
    this.pillPaddingY = pillPaddingY;
    this.locked = locked;
  }

  _getCacheCanvasDimensions(): TCacheCanvasDimensions {
    const dims = super._getCacheCanvasDimensions();
    if (this.bgStyle === 'pill' || this.bgStyle === 'solid') {
      const extraX = this.bgStyle === 'pill' ? Math.max(this.pillPaddingX, 24) : 16;
      const extraY = this.bgStyle === 'pill' ? Math.max(this.pillPaddingY, 16) : 12;
      dims.width += (extraX * 2 + 16) * dims.zoomX;
      dims.height += (extraY * 2 + 16) * dims.zoomY;
    }
    return dims;
  }

  _renderTextLinesBackground(ctx: CanvasRenderingContext2D): void {
    if (this.bgStyle === 'none') {
      super._renderTextLinesBackground(ctx);
      return;
    }

    if (!this.textBgColor) {
      return;
    }

    const originalFill = ctx.fillStyle;
    const leftOffset = this._getLeftOffset();
    let lineTopOffset = this._getTopOffset();

    const isPill = this.bgStyle === 'pill';
    const padX = isPill ? this.pillPaddingX : Math.round(this.fontSize * 0.14);
    const padY = isPill ? this.pillPaddingY : Math.round(this.fontSize * 0.04);
    const radius = isPill ? this.pillRadius : 0;

    ctx.save();
    ctx.fillStyle = this.textBgColor;

    for (let i = 0, len = this._textLines.length; i < len; i++) {
      const heightOfLine = this.getHeightOfLine(i);
      const bgHeight = heightOfLine / (this.lineHeight || 1);
      const lineChars = this._textLines[i];
      const charBounds = this.__charBounds?.[i];

      if (lineChars && lineChars.length > 0) {
        let firstNonSpace = -1;
        let lastNonSpace = -1;
        for (let j = 0; j < lineChars.length; j++) {
          if (lineChars[j].trim().length > 0) {
            if (firstNonSpace === -1) firstNonSpace = j;
            lastNonSpace = j;
          }
        }

        if (firstNonSpace !== -1 && lastNonSpace !== -1) {
          const lineLeftOffset = this._getLineLeftOffset(i);
          const isJustifiedLine =
            this.textAlign === 'justify' && !this.isEndOfWrapping(i);

          let boxStart: number;
          let boxWidth: number;

          if (isJustifiedLine) {
            boxStart = leftOffset + lineLeftOffset;
            boxWidth = this.width;
          } else if (charBounds && charBounds[firstNonSpace] && charBounds[lastNonSpace]) {
            const firstCharLeft = charBounds[firstNonSpace].left;
            const lastCharRight =
              charBounds[lastNonSpace].left + charBounds[lastNonSpace].width;
            boxStart = leftOffset + lineLeftOffset + firstCharLeft;
            boxWidth = Math.max(0, lastCharRight - firstCharLeft);
          } else {
            boxStart = leftOffset + lineLeftOffset;
            boxWidth = this.getLineWidth(i);
          }

          if (boxWidth > 0) {
            if (this.direction === 'rtl') {
              boxStart = this.width - boxStart - boxWidth;
            }

            drawRoundedRectPath(
              ctx,
              boxStart - padX,
              lineTopOffset - padY,
              boxWidth + padX * 2,
              bgHeight + padY * 2,
              radius
            );
            ctx.fill();
          }
        }
      }

      lineTopOffset += heightOfLine;
    }

    ctx.restore();
    ctx.fillStyle = originalFill;
    this._removeShadow(ctx);
  }

  toObject<
    T extends Omit<
      TOptions<TextboxProps> & fabric.TClassProperties<this>,
      keyof SerializedTextboxProps
    >,
    K extends keyof T = never,
  >(propertiesToInclude: K[] = []): Pick<T, K> & SerializedTextboxProps {
    const extraKeys = [
      'editorId',
      'editorName',
      'bgStyle',
      'textBgColor',
      'pillRadius',
      'pillPaddingX',
      'pillPaddingY',
      'locked',
      ...propertiesToInclude,
    ] as unknown as K[];
    return super.toObject(extraKeys) as Pick<T, K> & SerializedTextboxProps;
  }
}

fabric.classRegistry.setClass(StoryTextbox, 'StoryTextbox');
fabric.classRegistry.setClass(StoryTextbox, 'story-textbox');
