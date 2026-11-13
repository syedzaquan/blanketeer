import React, { useState } from 'react';
import { Check, Download, Layers, Loader2, X } from 'lucide-react';
import type { CanvasPageItem, ExportImageFormat } from '../types/editor';
import {
  shareOrDownloadExportedPages,
  type ExportedPageItem,
} from '../utils/exportCanvas';

interface ExportPagesModalProps {
  isOpen: boolean;
  pages: CanvasPageItem[];
  activePageId: string;
  onClose: () => void;
  onRenderSelectedPages: (
    pageIds: string[],
    format: ExportImageFormat,
    quality?: number
  ) => Promise<ExportedPageItem[]>;
}

const FORMAT_OPTIONS: {
  id: ExportImageFormat;
  label: string;
  hint: string;
}[] = [
  { id: 'png', label: 'PNG', hint: 'Lossless' },
  { id: 'jpeg', label: 'JPEG', hint: 'Smaller size' },
  { id: 'webp', label: 'WebP', hint: 'Modern web' },
];

export const ExportPagesModal: React.FC<ExportPagesModalProps> = ({
  isOpen,
  pages,
  activePageId,
  onClose,
  onRenderSelectedPages,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    pages.map((p) => p.id)
  );
  const [format, setFormat] = useState<ExportImageFormat>('png');
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const allSelected = pages.length > 0 && selectedIds.length === pages.length;

  const togglePage = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(activePageId ? [activePageId] : []);
    } else {
      setSelectedIds(pages.map((p) => p.id));
    }
  };

  const handleExport = async () => {
    if (selectedIds.length === 0 || isExporting) return;
    setIsExporting(true);
    setErrorMsg(null);
    let rendered: ExportedPageItem[] = [];
    try {
      rendered = await onRenderSelectedPages(selectedIds, format);
      const result = await shareOrDownloadExportedPages(rendered, format);
      if (result !== 'cancelled') {
        onClose();
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to export selected slides'
      );
    } finally {
      rendered.forEach((item) => {
        if (item.blobUrl) {
          URL.revokeObjectURL(item.blobUrl);
        }
      });
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#121218] text-zinc-100 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Export Slides</h2>
              <p className="text-xs text-zinc-400">
                Choose which slides to export ({selectedIds.length} of{' '}
                {pages.length} selected)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Slides
            </span>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition"
            >
              {allSelected ? 'Keep only current' : 'Select all'}
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {pages.map((page, index) => {
              const checked = selectedIds.includes(page.id);
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => togglePage(page.id)}
                  className={`group relative rounded-xl p-2 border text-left transition flex flex-col gap-1.5 ${
                    checked
                      ? 'border-indigo-500 bg-indigo-500/15'
                      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="w-full aspect-[4/5] rounded-lg overflow-hidden bg-zinc-900 border border-white/10 flex items-center justify-center relative">
                    {page.thumbnailDataUrl ? (
                      <img
                        src={page.thumbnailDataUrl}
                        alt={page.name}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <span className="text-xs text-zinc-500">
                        Slide {index + 1}
                      </span>
                    )}
                    <div
                      className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center border transition ${
                        checked
                          ? 'bg-indigo-500 border-indigo-400 text-white'
                          : 'bg-black/60 border-white/30 text-transparent'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-1 px-0.5">
                    <span className="text-[11px] font-medium text-zinc-200 truncate">
                      Slide {index + 1}
                    </span>
                    <span className="text-[10px] text-zinc-500 shrink-0">
                      {page.aspectRatio}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-2 pt-1">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider block">
              Format
            </span>
            <div className="grid grid-cols-3 gap-2">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFormat(opt.id)}
                  className={`px-3 py-2 rounded-xl border text-left transition ${
                    format === opt.id
                      ? 'border-indigo-500 bg-indigo-500/15 text-white'
                      : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="text-xs font-semibold">{opt.label}</div>
                  <div className="text-[10px] text-zinc-400">{opt.hint}</div>
                </button>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
              {errorMsg}
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-white/10 bg-black/25 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={selectedIds.length === 0 || isExporting}
            className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Rendering {selectedIds.length}...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                Export {selectedIds.length === pages.length ? 'All' : selectedIds.length}{' '}
                {selectedIds.length === 1 ? 'Slide' : 'Slides'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
