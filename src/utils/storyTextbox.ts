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
  inkBleed?: boolean;
  inkBleedBlur?: number;
  inkBleedThreshold?: number;
  placeholder?: string;
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
    'inkBleed',
    'inkBleedBlur',
    'inkBleedThreshold',
    'placeholder',
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
  declare inkBleed: boolean;
  declare inkBleedBlur: number;
  declare inkBleedThreshold: number;
  declare placeholder: string;
  declare locked: boolean;
  private _skipBgInRender = false;

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
      inkBleed = false,
      inkBleedBlur = 0.05,
      inkBleedThreshold = 10,
      placeholder = '',
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
    this.inkBleed = inkBleed;
    this.inkBleedBlur = inkBleedBlur;
    this.inkBleedThreshold = inkBleedThreshold;
    this.placeholder = placeholder;
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
    const hasCharStyles = Boolean(
      this.styles &&
        Object.values(this.styles).some(
          (line) => line && Object.keys(line).length > 0
        )
    );
    const useFrauncesSvg =
      isFrauncesFamily(this.fontFamily) &&
      !this.isEditing &&
      !hasCharStyles &&
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
    if (this.inkBleed) {
      const blurPx = this._getInkBleedBlurPx();
      const bleedPad = Math.ceil(blurPx * 3) + Math.ceil((this.fontSize || 72) * 0.25) + 16;
      dims.width += bleedPad * 2 * dims.zoomX;
      dims.height += bleedPad * 2 * dims.zoomY;
    }
    return dims;
  }

  _renderTextLinesBackground(ctx: CanvasRenderingContext2D): void {
    if (this._skipBgInRender) {
      return;
    }
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

  override initHiddenTextarea(): void {
    super.initHiddenTextarea();
    if (this.hiddenTextarea) {
      // Keep >=16px so iOS Safari does not auto-zoom the page when focusing text editing.
      this.hiddenTextarea.style.fontSize = '16px';
    }
  }

  override exitEditing(): this {
    if (!this.text && this.placeholder) {
      this.dirty = true;
    }
    return super.exitEditing();
  }

  _render(ctx: CanvasRenderingContext2D): void {
    if (this.inkBleed && !this.isEditing && this.text) {
      if (this.bgStyle !== 'none') {
        this._renderTextLinesBackground(ctx);
      }
      this._renderWithInkBleed(ctx);
      return;
    }

    super._render(ctx);
    if (!this.text && !this.isEditing && this.placeholder) {
      ctx.save();
      ctx.globalAlpha *= 0.5;
      ctx.font = this._getFontDeclaration();
      ctx.fillStyle = typeof this.fill === 'string' ? this.fill : '#ffffff';
      ctx.textBaseline = 'middle';
      const align =
        this.textAlign === 'right'
          ? 'right'
          : this.textAlign === 'left'
            ? 'left'
            : 'center';
      ctx.textAlign = align;
      const x =
        align === 'left'
          ? -this.width / 2
          : align === 'right'
            ? this.width / 2
            : 0;
      ctx.fillText(this.placeholder, x, 0, this.width);
      ctx.restore();
    }
  }

  private _getInkBleedBlurPx(): number {
    const rawBlur = Math.max(0, Math.min(30, this.inkBleedBlur ?? 0.05));
    if (rawBlur <= 0) return 0;
    const fontScale = Math.max(1, (this.fontSize || 72) / 40);
    return Math.min(80, rawBlur * fontScale);
  }

  private _renderWithInkBleed(ctx: CanvasRenderingContext2D): void {
    const blurPx = this._getInkBleedBlurPx();
    const pad = Math.ceil(blurPx * 3) + Math.ceil((this.fontSize || 72) * 0.25) + 16;
    const w = Math.max(1, Math.ceil(this.width + pad * 2));
    const h = Math.max(1, Math.ceil(this.height + pad * 2));

    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
    if (!offCtx) {
      super._render(ctx);
      return;
    }

    offCtx.save();
    offCtx.translate(this.width / 2 + pad, this.height / 2 + pad);
    let filterApplied = false;
    if (blurPx > 0 && 'filter' in offCtx) {
      offCtx.filter = `blur(${blurPx.toFixed(2)}px)`;
      filterApplied = offCtx.filter !== 'none' && offCtx.filter !== '';
    }
    this._skipBgInRender = true;
    try {
      super._render(offCtx);
    } finally {
      this._skipBgInRender = false;
      offCtx.restore();
    }

    const imgData = offCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Fallback separable box blur on alpha if ctx.filter is unsupported
    if (blurPx > 0 && !filterApplied) {
      const r = Math.max(1, Math.round(blurPx));
      const tmp = new Uint8ClampedArray(w * h);
      for (let pass = 0; pass < 2; pass++) {
        for (let y = 0; y < h; y++) {
          const rowOff = y * w;
          for (let x = 0; x < w; x++) {
            let sum = 0;
            let count = 0;
            const x0 = Math.max(0, x - r);
            const x1 = Math.min(w - 1, x + r);
            for (let kx = x0; kx <= x1; kx++) {
              sum += data[(rowOff + kx) * 4 + 3];
              count++;
            }
            tmp[rowOff + x] = Math.round(sum / count);
          }
        }
        for (let x = 0; x < w; x++) {
          for (let y = 0; y < h; y++) {
            let sum = 0;
            let count = 0;
            const y0 = Math.max(0, y - r);
            const y1 = Math.min(h - 1, y + r);
            for (let ky = y0; ky <= y1; ky++) {
              sum += tmp[ky * w + x];
              count++;
            }
            data[(y * w + x) * 4 + 3] = Math.round(sum / count);
          }
        }
      }
    }

    // Discrete alpha threshold matching SVG <feComponentTransfer><feFuncA type="discrete">
    const threshold = Math.max(0.01, Math.min(0.99, (this.inkBleedThreshold ?? 10) / 100));
    for (let i = 3; i < data.length; i += 4) {
      const a = data[i];
      if (a === 0) continue;
      data[i] = a / 255 >= threshold ? 255 : 0;
    }
    offCtx.putImageData(imgData, 0, 0);

    // Restore pure solid fill color to eliminate any blur premultiplication fringe
    if (typeof this.fill === 'string' && !this.stroke) {
      offCtx.save();
      offCtx.globalCompositeOperation = 'source-in';
      offCtx.fillStyle = this.fill;
      offCtx.fillRect(0, 0, w, h);
      offCtx.restore();
    }

    ctx.drawImage(offCanvas, -this.width / 2 - pad, -this.height / 2 - pad);
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
      'inkBleed',
      'inkBleedBlur',
      'inkBleedThreshold',
      'placeholder',
      'locked',
      ...propertiesToInclude,
    ] as unknown as K[];
    return super.toObject(extraKeys) as Pick<T, K> & SerializedTextboxProps;
  }
}

fabric.classRegistry.setClass(StoryTextbox, 'StoryTextbox');
fabric.classRegistry.setClass(StoryTextbox, 'story-textbox');
