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
    <div className="shrink-0 w-full px-2 py-1.5 border-t border-zinc-800/80 bg-zinc-950/95 flex items-center justify-center lg:pointer-events-none lg:w-auto lg:border-0 lg:bg-transparent lg:p-0 lg:absolute lg:bottom-4 lg:left-1/2 lg:-translate-x-1/2 lg:z-20">
      <div className="pointer-events-auto flex items-center gap-1 px-2 py-1 rounded-2xl bg-zinc-900/95 border border-zinc-800 shadow-xl shadow-black/50 backdrop-blur-md max-w-full overflow-x-auto">
        {!selectedObject ? (
          <>
            <button
              type="button"
              onClick={onAddText}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-colors shrink-0"
            >
              <Type className="w-3.5 h-3.5 text-violet-400" />
              <span>Add Text</span>
            </button>
            <div className="w-px h-4 bg-zinc-800 shrink-0" />
            <button
              type="button"
              onClick={onTriggerImageUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-colors shrink-0"
            >
              <ImagePlus className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Add Image</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onOpenMobileInspector}
              title="Edit Properties"
              className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-violet-600 text-white shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <div className="lg:hidden w-px h-5 bg-zinc-800 mx-0.5 shrink-0" />
            <button
              type="button"
              onClick={onBringToFront}
              title="Bring to Front"
              className="p-1.5 sm:p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
            >
              <ArrowUpToLine className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onBringForward}
              title="Bring Forward"
              className="p-1.5 sm:p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onSendBackward}
              title="Send Backward"
              className="p-1.5 sm:p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onSendToBack}
              title="Send to Back"
              className="p-1.5 sm:p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
            >
              <ArrowDownToLine className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-zinc-800 mx-0.5 shrink-0" />
            <button
              type="button"
              onClick={onDuplicate}
              title="Duplicate (Cmd/Ctrl + D)"
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-colors shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Duplicate</span>
            </button>
            <button
              type="button"
              onClick={onDelete}
              title="Delete (Backspace / Delete)"
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
