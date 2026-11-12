import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Copy,
  ImagePlus,
  SlidersHorizontal,
  Trash2,
  Type,
} from 'lucide-react';
import type { SelectedObjectState } from '../types/editor';

interface ToolbarProps {
  selectedObject: SelectedObjectState | null;
  onOpenMobileInspector: () => void;
  onTriggerFillSlot?: (slotId: string) => void;
  onAddText: () => void;
  onTriggerImageUpload: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function Toolbar({
  selectedObject,
  onOpenMobileInspector,
  onTriggerFillSlot,
  onAddText,
  onTriggerImageUpload,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onDuplicate,
  onDelete,
}: ToolbarProps) {
  return (
    <div className="shrink-0 w-full px-2 py-2 border-t border-neutral-800/80 bg-[#0f0f0f] flex items-center justify-center lg:pointer-events-none lg:w-auto lg:border-0 lg:bg-transparent lg:p-0 lg:absolute lg:bottom-3.5 lg:left-1/2 lg:-translate-x-1/2 lg:z-20">
      <div className="pointer-events-auto flex items-center gap-1 lg:gap-0.5 p-1 rounded-xl lg:rounded-lg bg-[#1c1c1e] border border-neutral-700/80 max-w-full overflow-x-auto">
        {!selectedObject ? (
          <>
            <button
              type="button"
              onClick={onAddText}
              aria-label="Add Text"
              title="Add Text"
              className="flex items-center gap-1.5 px-3.5 py-2 lg:px-2.5 lg:py-1 rounded-lg lg:rounded-md text-sm lg:text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors shrink-0"
            >
              <Type className="w-4 h-4 lg:w-3.5 lg:h-3.5 text-neutral-400" />
              <span>Add Text</span>
            </button>
            <div className="w-px h-5 lg:h-3.5 bg-neutral-800 mx-0.5 shrink-0" />
            <button
              type="button"
              onClick={onTriggerImageUpload}
              aria-label="Add Image"
              title="Add Image"
              className="flex items-center gap-1.5 px-3.5 py-2 lg:px-2.5 lg:py-1 rounded-lg lg:rounded-md text-sm lg:text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors shrink-0"
            >
              <ImagePlus className="w-4 h-4 lg:w-3.5 lg:h-3.5 text-neutral-400" />
              <span>Add Image</span>
            </button>
          </>
        ) : (
          <>
            {selectedObject.kind === 'slot' && onTriggerFillSlot && (
              <>
                <button
                  type="button"
                  onClick={() => onTriggerFillSlot(selectedObject.id)}
                  aria-label="Choose photo for slot"
                  title="Choose photo for slot"
                  className="p-2.5 lg:p-1.5 rounded-lg lg:rounded-md bg-neutral-100 text-neutral-950 hover:bg-white transition-colors shrink-0"
                >
                  <ImagePlus className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                </button>
                <div className="w-px h-5 lg:h-4 bg-neutral-800 mx-0.5 shrink-0" />
              </>
            )}
            <button
              type="button"
              onClick={onOpenMobileInspector}
              aria-label="Edit Properties"
              title="Edit Properties"
              className="lg:hidden p-2.5 rounded-lg bg-neutral-100 text-neutral-950 shrink-0"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <div className="lg:hidden w-px h-5 bg-neutral-800 mx-0.5 shrink-0" />
            <button
              type="button"
              onClick={onBringToFront}
              aria-label="Bring to Front"
              title="Bring to Front"
              className="p-2.5 lg:p-1.5 rounded-lg lg:rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors shrink-0"
            >
              <ArrowUpToLine className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
            </button>
            <button
              type="button"
              onClick={onBringForward}
              aria-label="Bring Forward"
              title="Bring Forward"
              className="p-2.5 lg:p-1.5 rounded-lg lg:rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors shrink-0"
            >
              <ArrowUp className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
            </button>
            <button
              type="button"
              onClick={onSendBackward}
              aria-label="Send Backward"
              title="Send Backward"
              className="p-2.5 lg:p-1.5 rounded-lg lg:rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors shrink-0"
            >
              <ArrowDown className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
            </button>
            <button
              type="button"
              onClick={onSendToBack}
              aria-label="Send to Back"
              title="Send to Back"
              className="p-2.5 lg:p-1.5 rounded-lg lg:rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors shrink-0"
            >
              <ArrowDownToLine className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
            </button>
            <div className="w-px h-5 lg:h-4 bg-neutral-800 mx-0.5 shrink-0" />
            <button
              type="button"
              onClick={onDuplicate}
              aria-label="Duplicate"
              title="Duplicate (Cmd/Ctrl + D)"
              className="p-2.5 lg:p-1.5 rounded-lg lg:rounded-md text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors shrink-0"
            >
              <Copy className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete"
              title="Delete (Backspace / Delete)"
              className="p-2.5 lg:p-1.5 rounded-lg lg:rounded-md text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors shrink-0"
            >
              <Trash2 className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
