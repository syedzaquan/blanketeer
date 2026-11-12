import { useState } from 'react';
import {
  Bold,
  Check,
  Highlighter,
  Italic,
  Palette,
  Underline,
} from 'lucide-react';
import type { TextEditingSelectionState } from '../types/editor';
import { PRESET_COLOR_SWATCHES } from '../utils/canvasHelpers';
import { cn } from '../utils/cn';

interface TextEditingPopoverProps {
  editingState: TextEditingSelectionState;
  onApplyStyle: (
    patch: Partial<{
      bold: boolean;
      italic: boolean;
      underline: boolean;
      fill: string;
      textBackgroundColor: string;
    }>
  ) => void;
  onSelectAll: () => void;
  onDone: () => void;
}

type ActivePalette = 'none' | 'color' | 'highlight';

export function TextEditingPopover({
  editingState,
  onApplyStyle,
  onSelectAll,
  onDone,
}: TextEditingPopoverProps) {
  const [openPalette, setOpenPalette] = useState<ActivePalette>('none');

  if (!editingState.isEditing || !editingState.boxRect) {
    return null;
  }

  const { boxRect } = editingState;
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 390;
  const clampedCenterX = Math.max(
    148,
    Math.min(viewportW - 148, boxRect.left + boxRect.width / 2)
  );
  const placeAbove = boxRect.top >= 116;
  const topY = placeAbove
    ? boxRect.top - 10
    : boxRect.top + boxRect.height + 10;

  const keepFocus = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      data-testid="text-editing-popover"
      onMouseDown={keepFocus}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      style={{
        left: `${clampedCenterX}px`,
        top: `${topY}px`,
        transform: placeAbove ? 'translate(-50%, -100%)' : 'translateX(-50%)',
      }}
      className="fixed z-40 flex flex-col items-center gap-1.5 select-none"
    >
      <div className="flex items-center gap-0.5 p-1 rounded-xl bg-[#1c1c1e]/95 backdrop-blur-md border border-neutral-700/90 shadow-xl text-neutral-200">
        <button
          type="button"
          onMouseDown={keepFocus}
          onClick={() => onApplyStyle({ bold: !editingState.bold })}
          aria-label="Bold"
          title="Bold"
          className={cn(
            'p-2 lg:p-1.5 rounded-lg transition-colors',
            editingState.bold
              ? 'bg-neutral-100 text-neutral-950'
              : 'hover:bg-neutral-800 text-neutral-200'
          )}
        >
          <Bold className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={keepFocus}
          onClick={() => onApplyStyle({ italic: !editingState.italic })}
          aria-label="Italic"
          title="Italic"
          className={cn(
            'p-2 lg:p-1.5 rounded-lg transition-colors',
            editingState.italic
              ? 'bg-neutral-100 text-neutral-950'
              : 'hover:bg-neutral-800 text-neutral-200'
          )}
        >
          <Italic className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={keepFocus}
          onClick={() => onApplyStyle({ underline: !editingState.underline })}
          aria-label="Underline"
          title="Underline"
          className={cn(
            'p-2 lg:p-1.5 rounded-lg transition-colors',
            editingState.underline
              ? 'bg-neutral-100 text-neutral-950'
              : 'hover:bg-neutral-800 text-neutral-200'
          )}
        >
          <Underline className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
        </button>

        <div className="w-px h-5 bg-neutral-700/80 mx-0.5" />

        <button
          type="button"
          onMouseDown={keepFocus}
          onClick={() =>
            setOpenPalette((prev) => (prev === 'color' ? 'none' : 'color'))
          }
          aria-label="Text color"
          title="Text color"
          className={cn(
            'p-2 lg:p-1.5 rounded-lg flex items-center gap-1 transition-colors',
            openPalette === 'color'
              ? 'bg-neutral-700 text-white'
              : 'hover:bg-neutral-800 text-neutral-200'
          )}
        >
          <Palette className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
          <span
            className="w-2.5 h-2.5 rounded-full border border-white/40"
            style={{ backgroundColor: editingState.fill }}
          />
        </button>

        <button
          type="button"
          onMouseDown={keepFocus}
          onClick={() =>
            setOpenPalette((prev) =>
              prev === 'highlight' ? 'none' : 'highlight'
            )
          }
          aria-label="Highlight color"
          title="Highlight color"
          className={cn(
            'p-2 lg:p-1.5 rounded-lg flex items-center gap-1 transition-colors',
            openPalette === 'highlight' || editingState.textBackgroundColor
              ? 'bg-neutral-700 text-white'
              : 'hover:bg-neutral-800 text-neutral-200'
          )}
        >
          <Highlighter className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
          {editingState.textBackgroundColor && (
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/40"
              style={{ backgroundColor: editingState.textBackgroundColor }}
            />
          )}
        </button>

        <div className="w-px h-5 bg-neutral-700/80 mx-0.5" />

        <button
          type="button"
          onMouseDown={keepFocus}
          onClick={onSelectAll}
          aria-label="Select all text"
          title="Select all text"
          className="px-2 py-1.5 lg:py-1 rounded-lg text-xs lg:text-[11px] font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
        >
          All
        </button>

        <button
          type="button"
          onMouseDown={keepFocus}
          onClick={onDone}
          aria-label="Done editing text"
          title="Done"
          className="p-2 lg:p-1.5 rounded-lg bg-neutral-100 text-neutral-950 hover:bg-white transition-colors"
        >
          <Check className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
        </button>
      </div>

      {openPalette !== 'none' && (
        <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#1c1c1e]/95 backdrop-blur-md border border-neutral-700/90 shadow-xl max-w-[92vw] flex-wrap justify-center">
          {openPalette === 'highlight' && (
            <button
              type="button"
              onMouseDown={keepFocus}
              onClick={() => onApplyStyle({ textBackgroundColor: '' })}
              className={cn(
                'px-2 h-6 rounded-md text-[11px] font-medium border transition-colors',
                !editingState.textBackgroundColor
                  ? 'bg-neutral-100 border-neutral-100 text-neutral-950'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white'
              )}
            >
              None
            </button>
          )}
          {PRESET_COLOR_SWATCHES.map((swatch) => {
            const activeColor =
              openPalette === 'color'
                ? editingState.fill
                : editingState.textBackgroundColor;
            const isActive =
              activeColor.toLowerCase() === swatch.toLowerCase();
            return (
              <button
                key={swatch}
                type="button"
                onMouseDown={keepFocus}
                onClick={() =>
                  onApplyStyle(
                    openPalette === 'color'
                      ? { fill: swatch }
                      : { textBackgroundColor: swatch }
                  )
                }
                aria-label={`${openPalette === 'color' ? 'Text' : 'Highlight'} color ${swatch}`}
                className={cn(
                  'w-6 h-6 rounded-full border transition-transform',
                  isActive
                    ? 'border-white ring-2 ring-white/50 scale-110'
                    : 'border-neutral-600 hover:scale-105'
                )}
                style={{ backgroundColor: swatch }}
              />
            );
          })}
          <input
            type="color"
            aria-label={
              openPalette === 'color'
                ? 'Custom text color'
                : 'Custom highlight color'
            }
            value={
              (openPalette === 'color'
                ? editingState.fill
                : editingState.textBackgroundColor) || '#ffffff'
            }
            onChange={(e) =>
              onApplyStyle(
                openPalette === 'color'
                  ? { fill: e.target.value }
                  : { textBackgroundColor: e.target.value }
              )
            }
            className="w-6 h-6 rounded-full border border-neutral-600 bg-transparent cursor-pointer shrink-0"
          />
        </div>
      )}
    </div>
  );
}
