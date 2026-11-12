import { useState } from 'react';
import { ImagePlus, LayoutTemplate, Plus } from 'lucide-react';
import type {
  DiagonalDirection,
  TemplatePlacement,
  TemplateSlotSummary,
} from '../../types/editor';
import { cn } from '../../utils/cn';

type TemplateKind = 'two-column' | 'diagonal';

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
  onTriggerFillSlot: (slotId: string) => void;
  onSelectSlot: (slotId: string) => void;
}

export function TemplatesTab({
  templateSlots,
  onApplyTwoColumnTemplate,
  onApplyDiagonalTemplate,
  onTriggerFillSlot,
  onSelectSlot,
}: TemplatesTabProps) {
  const [selectedKind, setSelectedKind] = useState<TemplateKind>('two-column');
  const [columnPlacement, setColumnPlacement] = useState<TemplatePlacement>('top');
  const [diagDirection, setDiagDirection] = useState<DiagonalDirection>('rtl');
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
              50% H · 16px gap
            </span>
          </div>

          <div className="p-3 rounded-lg bg-neutral-800/60 border border-neutral-700/80 flex items-center justify-center">
            <div
              className={cn(
                'w-24 h-28 rounded-md bg-neutral-900 border border-neutral-700 p-1.5 flex flex-col',
                columnPlacement === 'top' ? 'justify-start' : 'justify-end'
              )}
            >
              <div className="grid grid-cols-2 gap-1 h-1/2 w-full">
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
              50%×50% · 16px gap
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
                if (!isSlot) return <div key={cell} />;
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
            <input
              id="template-corner-radius"
              aria-label="Template corner radius"
              type="range"
              min={2}
              max={20}
              step={1}
              value={cornerPercent}
              onChange={(e) => setCornerPercent(Number(e.target.value))}
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
            } else {
              onApplyDiagonalTemplate({
                direction: diagDirection,
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
                : 'Add Diagonal Template'}
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
