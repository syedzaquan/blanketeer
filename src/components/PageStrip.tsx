import React from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import type { CanvasPageItem } from '../types/editor';

interface PageStripProps {
  pages: CanvasPageItem[];
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onDuplicatePage: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
}

export const PageStrip: React.FC<PageStripProps> = ({
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
}) => {
  if (pages.length === 0) return null;

  return (
    <div className="shrink-0 border-t border-white/10 bg-[#0d0d11]/95 backdrop-blur-md px-3 py-2 flex items-center gap-2 overflow-x-auto overflow-y-visible no-scrollbar z-20">
      <div className="flex items-center gap-2 mx-auto min-w-max">
        {pages.map((page, index) => {
          const isActive = page.id === activePageId;
          const aspectClass =
            page.aspectRatio === '1:1'
              ? 'w-9 h-9'
              : page.aspectRatio === '9:16'
                ? 'w-6 h-10'
                : 'w-8 h-10';

          return (
            <div
              key={page.id}
              className={`group relative flex items-center gap-1.5 rounded-lg p-1 transition ${
                isActive
                  ? 'bg-indigo-500/20 ring-1 ring-indigo-400/70'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] ring-1 ring-white/10'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectPage(page.id)}
                title={`${page.name} (${page.aspectRatio})`}
                className="flex items-center gap-2 text-left"
              >
                <div
                  className={`${aspectClass} rounded overflow-hidden bg-zinc-900 border border-white/15 shrink-0 flex items-center justify-center relative`}
                >
                  {page.thumbnailDataUrl ? (
                    <img
                      src={page.thumbnailDataUrl}
                      alt={page.name}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <span className="text-[10px] font-semibold text-zinc-500">
                      {index + 1}
                    </span>
                  )}
                </div>
                <div className="hidden sm:flex flex-col pr-1 leading-tight">
                  <span className="text-[11px] font-medium text-zinc-200">
                    {index + 1}
                  </span>
                  <span className="text-[9px] text-zinc-500">
                    {page.aspectRatio}
                  </span>
                </div>
              </button>

              {isActive && (
                <div className="flex items-center gap-0.5 pl-0.5 border-l border-white/10">
                  <button
                    type="button"
                    onClick={() => onDuplicatePage(page.id)}
                    title="Duplicate slide"
                    aria-label="Duplicate slide"
                    className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  {pages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeletePage(page.id)}
                      title="Delete slide"
                      aria-label="Delete slide"
                      className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-500/15 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={onAddPage}
          title="Add new slide"
          className="h-11 px-3 rounded-lg border border-dashed border-white/20 hover:border-indigo-400/70 bg-white/[0.03] hover:bg-indigo-500/15 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Slide</span>
        </button>
      </div>
    </div>
  );
};
