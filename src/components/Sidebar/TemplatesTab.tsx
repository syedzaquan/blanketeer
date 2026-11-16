import { useState } from 'react';
import { ImagePlus, LayoutTemplate, Plus } from 'lucide-react';
import type {
  DiagonalDirection,
  TemplatePlacement,
  TemplateSlotSummary,
} from '../../types/editor';
import { cn } from '../../utils/cn';
import { RangeSlider } from '../RangeSlider';

type TemplateKind =
  | 'two-column'
  | 'diagonal'
  | 'split'
  | 'bento'
  | 'hero-two'
  | 'grid-4'
  | 'editorial'
  | 'stack-3'
  | 'corner-photo';

interface TemplatesTabProps {
  templateSlots: TemplateSlotSummary[];
  onApplyTwoColumnTemplate: (options: {
    placement: TemplatePlacement;
    cornerPercent: number;
  }) => void;
  onApplyDiagonalTemplate: (options: {
    direction: DiagonalDirection;
    cornerPercent: number;
  }) => void;
  onApplySplitTemplate: (options: {
    direction: 'horizontal' | 'vertical';
    cornerPercent: number;
  }) => void;
  onApplyBentoTemplate: (options: { cornerPercent: number }) => void;
  onApplyHeroTwoTemplate: (options: { cornerPercent: number }) => void;
  onApplyGridFourTemplate: (options: { cornerPercent: number }) => void;
  onApplyEditorialTemplate: (options: { cornerPercent: number }) => void;
  onApplyStackThreeTemplate: (options: { cornerPercent: number }) => void;
  onApplyCornerPhotoGridTemplate: (options: { cornerPercent: number }) => void;
  onTriggerFillSlot: (slotId: string) => void;
  onSelectSlot: (slotId: string) => void;
}

export function TemplatesTab({
  templateSlots,
  onApplyTwoColumnTemplate,
  onApplyDiagonalTemplate,
  onApplySplitTemplate,
  onApplyBentoTemplate,
  onApplyHeroTwoTemplate,
  onApplyGridFourTemplate,
  onApplyEditorialTemplate,
  onApplyStackThreeTemplate,
  onApplyCornerPhotoGridTemplate,
  onTriggerFillSlot,
  onSelectSlot,
}: TemplatesTabProps) {
  const [selectedKind, setSelectedKind] = useState<TemplateKind>('two-column');
  const [columnPlacement, setColumnPlacement] = useState<TemplatePlacement>('top');
  const [diagDirection, setDiagDirection] = useState<DiagonalDirection>('rtl');
  const [splitDirection, setSplitDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [rounded, setRounded] = useState(true);
  const [cornerPercent, setCornerPercent] = useState(6);

  const effectiveCornerPercent = rounded ? cornerPercent : 0;
  const previewRadius = rounded
    ? `${Math.max(2, Math.round(cornerPercent * 0.65))}px`
    : '0px';

  return (
    <div className="flex flex-col gap-4">
      {/* Layout Switcher */}
      <div>
        <h2 className="text-xs font-medium text-neutral-300 mb-2">
          Photo Layouts
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSelectedKind('two-column')}
            className={cn(
              'p-2.5 rounded-lg border flex flex-col items-center gap-1.5 transition-colors',
              selectedKind === 'two-column'
                ? 'bg-neutral-700 border-neutral-500 text-white'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
            )}
          >
            <svg width="28" height="32" viewBox="0 0 28 32" className="shrink-0">
              <rect
                x="1"
                y="1"
                width="26"
                height="30"
                rx="3"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.35"
                strokeWidth="1.5"
              />
              <rect
                x="3.5"
                y="3.5"
                width="9.5"
                height="13"
                rx="1.5"
                fill="currentColor"
                fillOpacity="0.65"
              />
              <rect
                x="15"
                y="3.5"
                width="9.5"
                height="13"
                rx="1.5"
                fill="currentColor"
                fillOpacity="0.65"
              />
            </svg>
            <span className="text-xs font-medium">2-Column</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedKind('diagonal')}
            className={cn(
              'p-2.5 rounded-lg border flex flex-col items-center gap-1.5 transition-colors',
              selectedKind === 'diagonal'
                ? 'bg-neutral-700 border-neutral-500 text-white'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
            )}
          >
            <svg width="28" height="32" viewBox="0 0 28 32" className="shrink-0">
              <rect
                x="1"
                y="1"
                width="26"
                height="30"
                rx="3"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.35"
                strokeWidth="1.5"
              />
              <rect
                x="3.5"
                y="17"
                width="9.5"
                height="11.5"
                rx="1.5"
                fill="currentColor"
                fillOpacity="0.65"
              />
              <rect
                x="15"
                y="3.5"
                width="9.5"
                height="11.5"
                rx="1.5"
                fill="currentColor"
                fillOpacity="0.65"
              />
            </svg>
            <span className="text-xs font-medium">Diagonal</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedKind('split')}
            className={cn(
              'p-2.5 rounded-lg border flex flex-col items-center gap-1.5 transition-colors',
              selectedKind === 'split'
                ? 'bg-neutral-700 border-neutral-500 text-white'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
            )}
          >
            <svg width="28" height="32" viewBox="0 0 28 32" className="shrink-0">
              <rect
                x="1"
                y="1"
                width="26"
                height="30"
                rx="3"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.35"
                strokeWidth="1.5"
              />
              <rect
                x="3.5"
                y="3.5"
                width="21"
                height="11.5"
                rx="1.5"
                fill="currentColor"
                fillOpacity="0.65"
              />
              <rect
                x="3.5"
                y="17"
                width="21"
                height="11.5"
                rx="1.5"
                fill="currentColor"
                fillOpacity="0.65"
              />
            </svg>
            <span className="text-xs font-medium">Split 50/50</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedKind('bento')}
            className={cn(
              'p-2.5 rounded-lg border flex flex-col items-center gap-1.5 transition-colors',
              selectedKind === 'bento'
                ? 'bg-neutral-700 border-neutral-500 text-white'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
            )}
          >
            <svg width="28" height="32" viewBox="0 0 28 32" className="shrink-0">
              <rect
                x="1"
                y="1"
                width="26"
                height="30"
                rx="3"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.35"
                strokeWidth="1.5"
              />
              <rect
                x="3.5"
                y="3.5"
                width="9.5"
                height="25"
                rx="1.5"
                fill="currentColor"
                fillOpacity="0.65"
              />
              <rect
                x="15"
                y="3.5"
                width="9.5"
                height="11.5"
                rx="1.5"
                fill="currentColor"
                fillOpacity="0.65"
              />
              <rect
                x="15"
                y="17"
                width="9.5"
                height="11.5"
                rx="1.5"
                fill="currentColor"
                fillOpacity="0.65"
              />
            </svg>
            <span className="text-xs font-medium">3-Photo Bento</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedKind('hero-two')}
            className={cn(
              'p-2.5 rounded-lg border flex flex-col items-center gap-1.5 transition-colors',
              selectedKind === 'hero-two'
                ? 'bg-neutral-700 border-neutral-500 text-white'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
            )}
          >
            <svg width="28" height="32" viewBox="0 0 28 32" className="shrink-0">
              <rect
                x="1"
                y="1"
                width="26"
                height="30"
                rx="3"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.35"
                strokeWidth="1.5"
              />
              <rect
                x="3.5"
                y="3.5"
                width="21"
                height="13.5"
                rx="1.5"
                fill="currentColor"
                fillOpacity="0.65"
              />
              <rect
                x="3.5"
                y="19"
                width="9.5"
                height="9.5"
                rx="1.5"
                fill="currentColor"
                fillOpacity="0.65"
              />
              <rect
                x="15"
                y="19"
                width="9.5"
                height="9.5"
                rx="1.5"
                fill="currentColor"
                fillOpacity="0.65"
              />
            </svg>
            <span className="text-xs font-medium">Hero + 2</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedKind('grid-4')}
            className={cn(
              'p-2.5 rounded-lg border flex flex-col items-center gap-1.5 transition-colors',
              selectedKind === 'grid-4'
                ? 'bg-neutral-700 border-neutral-500 text-white'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
            )}
          >
            <svg width="28" height="32" viewBox="0 0 28 32" className="shrink-0">
              <rect
                x="1"
                y="1"
                width="26"
                height="30"
                rx="3"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.35"
                strokeWidth="1.5"
              />
              <rect
                x="3.5"
                y="3.5"
                width="9.5"
                height="11.5"
                rx="1.5"
                fill="currentColor"
                fillOpacity="0.65"
              />
              <rect
                x="15"
                y="3.5"
                width="9.5"
                height="11.5"
                rx="1.5"
                fill="currentColor"
                fillOpacity="0.65"
              />
              <rect
                x="3.5"
                y="17"
                width="9.5"
                height="11.5"
                rx="1.5"
                fill="currentColor"
                fillOpacity="0.65"
              />
              <rect
                x="15"
                y="17"
                width="9.5"
                height="11.5"
                rx="1.5"
                fill="currentColor"
                fillOpacity="0.65"
              />
            </svg>
            <span className="text-xs font-medium">4-Grid</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedKind('editorial')}
            className={cn(
              'p-2.5 rounded-lg border flex flex-col items-center gap-1.5 transition-colors',
              selectedKind === 'editorial'
                ? 'bg-neutral-700 border-neutral-500 text-white'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
            )}
          >
            <svg width="28" height="32" viewBox="0 0 28 32" className="shrink-0">
              <rect
                x="1"
                y="1"
                width="26"
                height="30"
                rx="3"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.35"
                strokeWidth="1.5"
              />
              <rect
                x="3.5"
                y="3.5"
                width="21"
                height="15"
                rx="1.5"
                fill="currentColor"
                fillOpacity="0.65"
              />
              <rect
                x="3.5"
                y="21"
                width="14"
                height="2.5"
                rx="1"
                fill="currentColor"
                fillOpacity="0.8"
              />
              <rect
                x="3.5"
                y="25.5"
                width="21"
                height="2"
                rx="1"
                fill="currentColor"
                fillOpacity="0.45"
              />
            </svg>
            <span className="text-xs font-medium">Editorial</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedKind('stack-3')}
            className={cn(
              'p-2.5 rounded-lg border flex flex-col items-center gap-1.5 transition-colors',
              selectedKind === 'stack-3'
                ? 'bg-neutral-700 border-neutral-500 text-white'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
            )}
          >
            <svg width="28" height="32" viewBox="0 0 28 32" className="shrink-0">
              <rect
                x="1"
                y="1"
                width="26"
                height="30"
                rx="3"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.35"
                strokeWidth="1.5"
              />
              <rect
                x="3.5"
                y="3.5"
                width="21"
                height="7"
                rx="1.5"
                fill="currentColor"
                fillOpacity="0.65"
              />
              <rect
                x="3.5"
                y="12.5"
                width="21"
                height="7"
                rx="1.5"
                fill="currentColor"
                fillOpacity="0.65"
              />
              <rect
                x="3.5"
                y="21.5"
                width="21"
                height="7"
                rx="1.5"
                fill="currentColor"
                fillOpacity="0.65"
              />
            </svg>
            <span className="text-xs font-medium">3-Row Stack</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedKind('corner-photo')}
            className={cn(
              'p-2.5 rounded-lg border flex flex-col items-center gap-1.5 transition-colors',
              selectedKind === 'corner-photo'
                ? 'bg-neutral-700 border-neutral-500 text-white'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
            )}
          >
            <svg width="28" height="32" viewBox="0 0 28 32" className="shrink-0">
              <rect
                x="1"
                y="1"
                width="26"
                height="30"
                rx="3"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.35"
                strokeWidth="1.5"
              />
              {/* 1: Top-Left text */}
              <rect x="3.5" y="6" width="9" height="1.8" rx="0.9" fill="currentColor" fillOpacity="0.65" />
              <rect x="3.5" y="9.5" width="7.5" height="1.8" rx="0.9" fill="currentColor" fillOpacity="0.45" />
              <rect x="3.5" y="13" width="6" height="1.8" rx="0.9" fill="currentColor" fillOpacity="0.35" />
              {/* 2: Top-Right image */}
              <rect
                x="15"
                y="3.5"
                width="9.5"
                height="11.5"
                rx="1.5"
                fill="currentColor"
                fillOpacity="0.65"
              />
              {/* 3: Bottom-Left text */}
              <rect x="3.5" y="19.5" width="9" height="1.8" rx="0.9" fill="currentColor" fillOpacity="0.65" />
              <rect x="3.5" y="23" width="7.5" height="1.8" rx="0.9" fill="currentColor" fillOpacity="0.45" />
              <rect x="3.5" y="26.5" width="6" height="1.8" rx="0.9" fill="currentColor" fillOpacity="0.35" />
              {/* 4: Bottom-Right text */}
              <rect x="15" y="19.5" width="9" height="1.8" rx="0.9" fill="currentColor" fillOpacity="0.65" />
              <rect x="15" y="23" width="7.5" height="1.8" rx="0.9" fill="currentColor" fillOpacity="0.45" />
              <rect x="15" y="26.5" width="6" height="1.8" rx="0.9" fill="currentColor" fillOpacity="0.35" />
            </svg>
            <span className="text-xs font-medium">1-Photo + 3 Text</span>
          </button>
        </div>
      </div>

      {/* 2-Column Options */}
      {selectedKind === 'two-column' && (
        <div className="flex flex-col gap-3 border-t border-neutral-800/80 pt-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-300">
              2-Column Split
            </span>
            <span className="text-[11px] font-mono text-neutral-500">
              50% H · + Body
            </span>
          </div>

          <div className="p-3 rounded-lg bg-neutral-800/60 border border-neutral-700/80 flex items-center justify-center">
            <div className="w-24 h-28 rounded-md bg-neutral-900 border border-neutral-700 p-1.5 flex flex-col justify-between gap-1.5">
              {columnPlacement === 'bottom' && (
                <div className="flex flex-col gap-1 px-0.5 pt-1">
                  <div className="h-1.5 w-full rounded-full bg-neutral-500/70" />
                  <div className="h-1.5 w-4/5 rounded-full bg-neutral-600/60" />
                  <div className="h-1.5 w-3/5 rounded-full bg-neutral-600/50" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-1 h-1/2 w-full shrink-0">
                {[0, 1].map((idx) => (
                  <div
                    key={idx}
                    className="bg-neutral-600/70 border border-dashed border-neutral-400/70 flex items-center justify-center"
                    style={{ borderRadius: previewRadius }}
                  >
                    <Plus className="w-3 h-3 text-neutral-200" />
                  </div>
                ))}
              </div>
              {columnPlacement === 'top' && (
                <div className="flex flex-col gap-1 px-0.5 pb-1">
                  <div className="h-1.5 w-full rounded-full bg-neutral-500/70" />
                  <div className="h-1.5 w-4/5 rounded-full bg-neutral-600/60" />
                  <div className="h-1.5 w-3/5 rounded-full bg-neutral-600/50" />
                </div>
              )}
            </div>
          </div>

          <div>
            <span className="block text-xs lg:text-[11px] text-neutral-400 mb-1.5 lg:mb-1">
              Placement
            </span>
            <div className="grid grid-cols-2 gap-0.5 p-0.5 rounded-lg lg:rounded-md bg-neutral-800/80 border border-neutral-700">
              {(
                [
                  { id: 'top', label: 'Top (50%)' },
                  { id: 'bottom', label: 'Bottom (50%)' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setColumnPlacement(opt.id)}
                  className={cn(
                    'py-2 lg:py-1.5 rounded-md lg:rounded-[5px] text-xs font-medium transition-colors',
                    columnPlacement === opt.id
                      ? 'bg-neutral-700 text-white'
                      : 'text-neutral-400 hover:text-neutral-100'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Diagonal Options */}
      {selectedKind === 'diagonal' && (
        <div className="flex flex-col gap-3 border-t border-neutral-800/80 pt-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-300">
              Diagonal Split
            </span>
            <span className="text-[11px] font-mono text-neutral-500">
              50%×50% · + Body
            </span>
          </div>

          {/* Diagonal 2x2 Quadrant Preview */}
          <div className="p-3 rounded-lg bg-neutral-800/60 border border-neutral-700/80 flex items-center justify-center">
            <div className="w-24 h-28 rounded-md bg-neutral-900 border border-neutral-700 p-1.5 grid grid-cols-2 grid-rows-2 gap-1">
              {[0, 1, 2, 3].map((cell) => {
                const isSlot =
                  diagDirection === 'ltr'
                    ? cell === 0 || cell === 3
                    : cell === 2 || cell === 1;
                if (!isSlot) {
                  return (
                    <div
                      key={cell}
                      className="flex flex-col justify-center gap-1 px-0.5"
                    >
                      <div className="h-1 w-full rounded-full bg-neutral-500/70" />
                      <div className="h-1 w-4/5 rounded-full bg-neutral-600/60" />
                      <div className="h-1 w-3/5 rounded-full bg-neutral-600/50" />
                    </div>
                  );
                }
                return (
                  <div
                    key={cell}
                    className="bg-neutral-600/70 border border-dashed border-neutral-400/70 flex items-center justify-center"
                    style={{ borderRadius: previewRadius }}
                  >
                    <Plus className="w-3 h-3 text-neutral-200" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Direction: Top-Left & Bottom-Right vs Bottom-Left & Top-Right */}
          <div>
            <span className="block text-xs lg:text-[11px] text-neutral-400 mb-1.5 lg:mb-1">
              Direction
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setDiagDirection('rtl')}
                className={cn(
                  'py-2 lg:py-1.5 px-2 rounded-lg lg:rounded-md border flex items-center justify-center gap-1.5 text-xs font-medium transition-colors',
                  diagDirection === 'rtl'
                    ? 'bg-neutral-700 border-neutral-500 text-white'
                    : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                )}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
                  <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" />
                  <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" />
                </svg>
                <span>Right → Left</span>
              </button>
              <button
                type="button"
                onClick={() => setDiagDirection('ltr')}
                className={cn(
                  'py-2 lg:py-1.5 px-2 rounded-lg lg:rounded-md border flex items-center justify-center gap-1.5 text-xs font-medium transition-colors',
                  diagDirection === 'ltr'
                    ? 'bg-neutral-700 border-neutral-500 text-white'
                    : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                )}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
                  <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" />
                  <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" />
                </svg>
                <span>Left → Right</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split 50/50 Options */}
      {selectedKind === 'split' && (
        <div className="flex flex-col gap-3 border-t border-neutral-800/80 pt-3.5">
          <div>
            <span className="block text-xs lg:text-[11px] text-neutral-400 mb-1.5">
              Split Direction
            </span>
            <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-neutral-800/80 border border-neutral-700">
              {(
                [
                  { id: 'horizontal', label: 'Top / Bottom' },
                  { id: 'vertical', label: 'Left / Right' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSplitDirection(opt.id)}
                  className={cn(
                    'py-2 lg:py-1 rounded-md text-xs font-medium transition-colors',
                    splitDirection === opt.id
                      ? 'bg-neutral-700 text-white'
                      : 'text-neutral-400 hover:text-neutral-100'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Shared Corner Options + Apply Button */}
      <div className="flex flex-col gap-3">
        <div>
          <span className="block text-xs lg:text-[11px] text-neutral-400 mb-1.5 lg:mb-1">
            Corners
          </span>
          <div className="grid grid-cols-2 gap-0.5 p-0.5 rounded-lg lg:rounded-md bg-neutral-800/80 border border-neutral-700">
            <button
              type="button"
              onClick={() => setRounded(false)}
              className={cn(
                'py-2 lg:py-1.5 rounded-md lg:rounded-[5px] text-xs font-medium transition-colors',
                !rounded
                  ? 'bg-neutral-700 text-white'
                  : 'text-neutral-400 hover:text-neutral-100'
              )}
            >
              Sharp
            </button>
            <button
              type="button"
              onClick={() => setRounded(true)}
              className={cn(
                'py-2 lg:py-1.5 rounded-md lg:rounded-[5px] text-xs font-medium transition-colors',
                rounded
                  ? 'bg-neutral-700 text-white'
                  : 'text-neutral-400 hover:text-neutral-100'
              )}
            >
              Rounded
            </button>
          </div>
        </div>

        {rounded && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <label
                htmlFor="template-corner-radius"
                className="text-neutral-400"
              >
                Corner Radius
              </label>
              <span className="font-mono text-neutral-300">
                {cornerPercent}%
              </span>
            </div>
            <RangeSlider
              id="template-corner-radius"
              aria-label="Template corner radius"
              min={2}
              max={20}
              step={1}
              value={cornerPercent}
              defaultValue={6}
              onValueChange={setCornerPercent}
              className="w-full"
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            if (selectedKind === 'two-column') {
              onApplyTwoColumnTemplate({
                placement: columnPlacement,
                cornerPercent: effectiveCornerPercent,
              });
            } else if (selectedKind === 'diagonal') {
              onApplyDiagonalTemplate({
                direction: diagDirection,
                cornerPercent: effectiveCornerPercent,
              });
            } else if (selectedKind === 'split') {
              onApplySplitTemplate({
                direction: splitDirection,
                cornerPercent: effectiveCornerPercent,
              });
            } else if (selectedKind === 'bento') {
              onApplyBentoTemplate({
                cornerPercent: effectiveCornerPercent,
              });
            } else if (selectedKind === 'hero-two') {
              onApplyHeroTwoTemplate({
                cornerPercent: effectiveCornerPercent,
              });
            } else if (selectedKind === 'grid-4') {
              onApplyGridFourTemplate({
                cornerPercent: effectiveCornerPercent,
              });
            } else if (selectedKind === 'editorial') {
              onApplyEditorialTemplate({
                cornerPercent: effectiveCornerPercent,
              });
            } else if (selectedKind === 'stack-3') {
              onApplyStackThreeTemplate({
                cornerPercent: effectiveCornerPercent,
              });
            } else {
              onApplyCornerPhotoGridTemplate({
                cornerPercent: effectiveCornerPercent,
              });
            }
          }}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 lg:py-2 px-3 rounded-lg lg:rounded-md bg-neutral-100 hover:bg-white text-neutral-950 text-sm lg:text-xs font-medium transition-colors"
        >
          <LayoutTemplate className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
          <span>
            {templateSlots.length > 0
              ? 'Update Slots'
              : selectedKind === 'two-column'
                ? 'Add 2-Column Template'
                : selectedKind === 'diagonal'
                  ? 'Add Diagonal Template'
                  : selectedKind === 'split'
                    ? 'Add Split Template'
                    : selectedKind === 'bento'
                      ? 'Add Bento Template'
                      : selectedKind === 'hero-two'
                        ? 'Add Hero + 2 Template'
                        : selectedKind === 'grid-4'
                          ? 'Add 4-Grid Template'
                          : selectedKind === 'editorial'
                            ? 'Add Editorial Template'
                            : selectedKind === 'stack-3'
                              ? 'Add 3-Row Stack Template'
                              : 'Add 1-Photo + 3 Text Template'}
          </span>
        </button>
      </div>

      {/* Active Empty Slots Ready to Fill */}
      {templateSlots.length > 0 && (
        <div className="border-t border-neutral-800/80 pt-3.5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-neutral-300">
              Fill Image Slots
            </h3>
            <span className="text-[11px] text-neutral-500">Tap to upload</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {templateSlots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => {
                  onSelectSlot(slot.id);
                  onTriggerFillSlot(slot.id);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 lg:py-2 px-2.5 rounded-lg lg:rounded-md bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700 text-xs font-medium text-neutral-100 transition-colors"
              >
                <ImagePlus className="w-4 h-4 lg:w-3.5 lg:h-3.5 text-neutral-300 shrink-0" />
                <span className="truncate">{slot.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
