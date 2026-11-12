import { useState } from 'react';
import { ImagePlus, LayoutTemplate, Plus } from 'lucide-react';
import type {
  TemplatePlacement,
  TemplateSlotSummary,
} from '../../types/editor';
import { cn } from '../../utils/cn';

interface TemplatesTabProps {
  templateSlots: TemplateSlotSummary[];
  onApplyTwoColumnTemplate: (options: {
    placement: TemplatePlacement;
    cornerPercent: number;
  }) => void;
  onTriggerFillSlot: (slotId: string) => void;
  onSelectSlot: (slotId: string) => void;
}

export function TemplatesTab({
  templateSlots,
  onApplyTwoColumnTemplate,
  onTriggerFillSlot,
  onSelectSlot,
}: TemplatesTabProps) {
  const [placement, setPlacement] = useState<TemplatePlacement>('top');
  const [rounded, setRounded] = useState(true);
  const [cornerPercent, setCornerPercent] = useState(6);

  const effectiveCornerPercent = rounded ? cornerPercent : 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-medium text-neutral-300">
            2-Column Photo Split
          </h2>
          <span className="text-[11px] font-mono text-neutral-500">
            50% H · 16px gap
          </span>
        </div>

        {/* Visual Mini Preview */}
        <div className="p-3 rounded-lg bg-neutral-800/60 border border-neutral-700/80 flex items-center justify-center mb-3">
          <div
            className={cn(
              'w-24 h-28 rounded-md bg-neutral-900 border border-neutral-700 p-1.5 flex flex-col',
              placement === 'top' ? 'justify-start' : 'justify-end'
            )}
          >
            <div className="grid grid-cols-2 gap-1 h-1/2 w-full">
              <div
                className="bg-neutral-600/70 border border-dashed border-neutral-400/70 flex items-center justify-center"
                style={{
                  borderRadius: rounded
                    ? `${Math.max(2, Math.round(cornerPercent * 0.65))}px`
                    : '0px',
                }}
              >
                <Plus className="w-3 h-3 text-neutral-200" />
              </div>
              <div
                className="bg-neutral-600/70 border border-dashed border-neutral-400/70 flex items-center justify-center"
                style={{
                  borderRadius: rounded
                    ? `${Math.max(2, Math.round(cornerPercent * 0.65))}px`
                    : '0px',
                }}
              >
                <Plus className="w-3 h-3 text-neutral-200" />
              </div>
            </div>
          </div>
        </div>

        {/* Placement: Top / Bottom */}
        <div className="flex flex-col gap-3">
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
                  onClick={() => setPlacement(opt.id)}
                  className={cn(
                    'py-2 lg:py-1.5 rounded-md lg:rounded-[5px] text-xs font-medium transition-colors',
                    placement === opt.id
                      ? 'bg-neutral-700 text-white'
                      : 'text-neutral-400 hover:text-neutral-100'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Corners: Sharp / Rounded */}
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
            onClick={() =>
              onApplyTwoColumnTemplate({
                placement,
                cornerPercent: effectiveCornerPercent,
              })
            }
            className="w-full flex items-center justify-center gap-1.5 py-2.5 lg:py-2 px-3 rounded-lg lg:rounded-md bg-neutral-100 hover:bg-white text-neutral-950 text-sm lg:text-xs font-medium transition-colors"
          >
            <LayoutTemplate className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
            <span>
              {templateSlots.length > 0
                ? 'Update 2-Column Slots'
                : 'Add 2-Column Template'}
            </span>
          </button>
        </div>
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

