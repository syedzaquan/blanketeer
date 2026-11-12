import * as fabric from 'fabric';
import type {
  CompleteTextStyleDeclaration,
  SerializedTextboxProps,
  TCacheCanvasDimensions,
  TextboxProps,
  TOptions,
} from 'fabric';
import type { TextBackgroundStyle } from '../types/editor';
import { createEditorId } from './canvasHelpers';
import {
  buildFrauncesVariationSettings,
  clampFrauncesAxes,
  ensureFrauncesFontData,
  getOrRequestFrauncesBitmap,
  isFrauncesFamily,
  isFrauncesFontDataReady,
  measureFrauncesGlyphWidth,
  type FrauncesAxisSettings,
  type FrauncesRenderLine,
} from './frauncesSvg';

export interface StoryTextboxExtraProps {
  editorId?: string;
  editorName?: string;
  fontOpsz?: number;
  fontSoft?: number;
  fontWonk?: number;
  bgStyle?: TextBackgroundStyle;
  textBgColor?: string;
  pillRadius?: number;
  pillPaddingX?: number;
  pillPaddingY?: number;
  locked?: boolean;
}

type CanvasContextWithVariation = CanvasRenderingContext2D & {
  fontVariationSettings?: string;
};

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
    // Inherit object.touchCornerSize so touch targets stay ~44px on screen across zoom levels.
    ctrl.touchSizeX = 0;
    ctrl.touchSizeY = 0;
    return ctrl;
  };

  const configureWidthBar = (ctrl: fabric.Control): fabric.Control => {
    ctrl.actionHandler = fabric.controlsUtils.changeWidth;
    ctrl.sizeX = 14;
    ctrl.sizeY = 42;
    ctrl.touchSizeX = 0;
    ctrl.touchSizeY = 0;
    ctrl.render = renderWidthPillControl;
    return ctrl;
  };

  // Exclude mt/mb vertical-stretch handles so text glyphs can never be thinned/distorted.
  // Place corners after ml/mr because Fabric hit-tests controls in reverse insertion order.
  return {
    ml: configureWidthBar(base.ml),
    mr: configureWidthBar(base.mr),
    tl: configureCorner(base.tl),
    tr: configureCorner(base.tr),
    bl: configureCorner(base.bl),
    br: configureCorner(base.br),
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
    'fontOpsz',
    'fontSoft',
    'fontWonk',
    'bgStyle',
    'textBgColor',
    'pillRadius',
    'pillPaddingX',
    'pillPaddingY',
  ];

  declare editorId: string;
  declare editorName: string;
  declare fontOpsz: number;
  declare fontSoft: number;
  declare fontWonk: number;
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
      fontOpsz,
      fontSoft = 100,
      fontWonk = 0,
      bgStyle = 'none',
      textBgColor = '#ffffff',
      pillRadius = 20,
      pillPaddingX = 24,
      pillPaddingY = 8,
      locked = false,
      ...textboxOptions
    } = options;

    const defaultOpsz = Math.min(
      144,
      Math.max(9, Math.round((textboxOptions.fontSize as number | undefined) || 72))
    );
    const resolvedOpsz = fontOpsz ?? defaultOpsz;
    const resolvedWeight =
      textboxOptions.fontWeight ??
      (isFrauncesFamily(String(textboxOptions.fontFamily ?? '')) ? 600 : undefined);

    // Seed custom axis values before super() calls initDimensions() during construction.
    super(text, {
      ...textboxOptions,
      lineHeight: textboxOptions.lineHeight ?? 1.0,
      ...(resolvedWeight !== undefined ? { fontWeight: resolvedWeight } : {}),
      fontOpsz: resolvedOpsz,
      fontSoft,
      fontWonk,
    } as TOptions<TextboxProps>);

    this.editorId = editorId || createEditorId();
    this.editorName = editorName;
    this.fontOpsz = resolvedOpsz;
    this.fontSoft = fontSoft;
    this.fontWonk = fontWonk;
    this.bgStyle = bgStyle;
    this.textBgColor = textBgColor;
    this.pillRadius = pillRadius;
    this.pillPaddingX = pillPaddingX;
    this.pillPaddingY = pillPaddingY;
    this.locked = locked;
  }

  private _parseNumericWeight(rawWeight: unknown): number {
    if (typeof rawWeight === 'number' && Number.isFinite(rawWeight)) {
      return rawWeight;
    }
    if (rawWeight === 'bold') return 700;
    if (rawWeight === 'normal') return 400;
    const parsed = parseInt(String(rawWeight ?? 400), 10);
    return Number.isFinite(parsed) ? parsed : 400;
  }

  private _getFrauncesAxes(
    charStyle?: Partial<CompleteTextStyleDeclaration>
  ): FrauncesAxisSettings {
    const rawWeight = charStyle?.fontWeight ?? this.fontWeight;
    const rawStyle = charStyle?.fontStyle ?? this.fontStyle;
    return clampFrauncesAxes({
      fontWeight: this._parseNumericWeight(rawWeight),
      fontStyle: rawStyle === 'italic' ? 'italic' : 'normal',
      fontOpsz: this.fontOpsz,
      fontSoft: this.fontSoft,
      fontWonk: this.fontWonk,
    });
  }

  private _applyCanvasVariationSettings(
    ctx: CanvasRenderingContext2D,
    charStyle?: Partial<CompleteTextStyleDeclaration>
  ): void {
    const extCtx = ctx as CanvasContextWithVariation;
    if (!('fontVariationSettings' in extCtx)) return;
    const family = String(charStyle?.fontFamily ?? this.fontFamily ?? '');
    if (isFrauncesFamily(family)) {
      extCtx.fontVariationSettings = buildFrauncesVariationSettings(
        this._getFrauncesAxes(charStyle)
      );
    } else if (extCtx.fontVariationSettings && extCtx.fontVariationSettings !== 'normal') {
      extCtx.fontVariationSettings = 'normal';
    }
  }

  override _setTextStyles(
    ctx: CanvasRenderingContext2D,
    charStyle?: CompleteTextStyleDeclaration,
    forMeasuring?: boolean
  ): void {
    super._setTextStyles(ctx, charStyle, forMeasuring);
    this._applyCanvasVariationSettings(ctx, charStyle);
  }

  override _measureChar(
    _char: string,
    charStyle: CompleteTextStyleDeclaration,
    previousChar: string | undefined,
    prevCharStyle: CompleteTextStyleDeclaration | Record<string, never>
  ): { width: number; kernedWidth: number } {
    const family = String(charStyle?.fontFamily ?? this.fontFamily ?? '');
    if (!isFrauncesFamily(family)) {
      return super._measureChar(_char, charStyle, previousChar, prevCharStyle);
    }

    const axes = this._getFrauncesAxes(charStyle);
    const fontMultiplier =
      Number(charStyle?.fontSize ?? this.fontSize ?? this.CACHE_FONT_SIZE) /
      this.CACHE_FONT_SIZE;

    const prevDecl =
      previousChar && prevCharStyle && 'fontFamily' in prevCharStyle
        ? this._getFontDeclaration(prevCharStyle as CompleteTextStyleDeclaration, true)
        : '';
    const currDecl = this._getFontDeclaration(charStyle, true);
    const stylesAreEqual = Boolean(previousChar && currDecl === prevDecl);

    const width = measureFrauncesGlyphWidth(_char, axes, this.CACHE_FONT_SIZE);
    let kernedWidth = width;

    if (stylesAreEqual && previousChar) {
      const prevWidth = measureFrauncesGlyphWidth(
        previousChar,
        axes,
        this.CACHE_FONT_SIZE
      );
      const coupleWidth = measureFrauncesGlyphWidth(
        previousChar + _char,
        axes,
        this.CACHE_FONT_SIZE
      );
      kernedWidth = coupleWidth - prevWidth;
    }

    return {
      width: width * fontMultiplier,
      kernedWidth: kernedWidth * fontMultiplier,
    };
  }

  override _renderTextFill(ctx: CanvasRenderingContext2D): void {
    const useFrauncesSvg =
      isFrauncesFamily(this.fontFamily) &&
      !this.isEditing &&
      typeof this.fill === 'string' &&
      this.fill.length > 0 &&
      !this.path;

    if (!useFrauncesSvg) {
      this._applyCanvasVariationSettings(ctx);
      super._renderTextFill(ctx);
      return;
    }

    if (!isFrauncesFontDataReady()) {
      void ensureFrauncesFontData();
      this._applyCanvasVariationSettings(ctx);
      super._renderTextFill(ctx);
      return;
    }

    const boxW = Math.max(1, this.width || 1);
    const boxH = Math.max(1, this.height || 1);
    const padX = Math.max(48, Math.ceil((this.fontSize || 48) * 0.75));
    const padY = Math.max(48, Math.ceil((this.fontSize || 48) * 0.75));
    const svgW = boxW + padX * 2;
    const svgH = boxH + padY * 2;
    const originX = boxW / 2 + padX;
    const originY = boxH / 2 + padY;

    const axes = this._getFrauncesAxes();
    const charSpacingPx =
      this.charSpacing !== 0 ? ((this.fontSize || 48) * this.charSpacing) / 1000 : 0;
    const leftOffset = this._getLeftOffset();
    let lineTopOffset = this._getTopOffset();

    const lines: FrauncesRenderLine[] = [];
    for (let i = 0, len = this._textLines.length; i < len; i++) {
      const chars = this._textLines[i] || [];
      const lineText = chars.join('');
      const heightOfLine = this.getHeightOfLine(i);
      const heightImpl = heightOfLine / (this.lineHeight || 1);
      const baselineY =
        originY + lineTopOffset + heightImpl * (1 - this._fontSizeFraction);
      const lineStartX = originX + leftOffset + this._getLineLeftOffset(i);
      const isJustified =
        this.textAlign.includes('justify') && !this.isEndOfWrapping(i);

      lines.push({
        text: lineText,
        chars,
        lineStartX,
        baselineY,
        charBounds: this.__charBounds?.[i],
        isJustified,
      });

      lineTopOffset += heightOfLine;
    }

    const maxEdge = Math.max(svgW, svgH, 1);
    const renderScale = Math.min(2, 3200 / maxEdge);

    const renderKey = [
      axes.fontStyle,
      axes.fontWeight,
      axes.fontOpsz,
      axes.fontSoft,
      axes.fontWonk,
      this.fontSize,
      this.charSpacing,
      this.lineHeight,
      this.textAlign,
      this.direction,
      this.fill,
      boxW.toFixed(2),
      boxH.toFixed(2),
      this.text,
    ].join('|');

    const bitmap = getOrRequestFrauncesBitmap({
      renderKey,
      svgWidth: svgW,
      svgHeight: svgH,
      renderScale,
      fill: this.fill as string,
      fontSize: this.fontSize || 48,
      charSpacingPx,
      axes,
      lines,
      onReady: () => {
        this.dirty = true;
        this.canvas?.requestRenderAll();
      },
    });

    if (bitmap) {
      ctx.drawImage(bitmap, -boxW / 2 - padX, -boxH / 2 - padY, svgW, svgH);
      return;
    }

    // Immediate non-blank frame during 4-8ms async SVG image decode.
    this._applyCanvasVariationSettings(ctx);
    super._renderTextFill(ctx);
  }

  _getCacheCanvasDimensions(): TCacheCanvasDimensions {
    const dims = super._getCacheCanvasDimensions();
    if (this.bgStyle === 'pill' || this.bgStyle === 'solid') {
      const extraX = this.bgStyle === 'pill' ? Math.max(this.pillPaddingX, 24) : 16;
      const extraY = this.bgStyle === 'pill' ? Math.max(this.pillPaddingY, 16) : 12;
      dims.width += (extraX * 2 + 16) * dims.zoomX;
      dims.height += (extraY * 2 + 16) * dims.zoomY;
    } else if (isFrauncesFamily(this.fontFamily)) {
      dims.width += 24 * dims.zoomX;
      dims.height += 24 * dims.zoomY;
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
      'fontOpsz',
      'fontSoft',
      'fontWonk',
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
