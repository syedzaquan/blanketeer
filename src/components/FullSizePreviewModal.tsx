import React, { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { CanvasPageItem, ExportImageFormat } from '../types/editor';
import type { ExportedPageItem } from '../utils/exportCanvas';

interface FullSizePreviewModalProps {
  pages: CanvasPageItem[];
  activePageId: string;
  onClose: () => void;
  onRenderPages: (
    pageIds: string[],
    format: ExportImageFormat
  ) => Promise<ExportedPageItem[]>;
}

export const FullSizePreviewModal: React.FC<FullSizePreviewModalProps> = ({
  pages,
  activePageId,
  onClose,
  onRenderPages,
}) => {
  const initialIndex = Math.max(
    0,
    pages.findIndex((p) => p.id === activePageId)
  );
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [renderedById, setRenderedById] = useState<
    Record<string, ExportedPageItem>
  >({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledInitialRef = useRef(false);

  // Render active slide first for instant display, then render remaining slides
  useEffect(() => {
    let cancelled = false;
    const createdUrls: string[] = [];

    const orderedIds = [
      ...(activePageId && pages.some((p) => p.id === activePageId)
        ? [activePageId]
        : []),
      ...pages.map((p) => p.id).filter((id) => id !== activePageId),
    ];

    void (async () => {
      for (const pageId of orderedIds) {
        if (cancelled) break;
        try {
          const items = await onRenderPages([pageId], 'png');
          if (cancelled) {
            items.forEach((it) => {
              if (it.blobUrl) URL.revokeObjectURL(it.blobUrl);
            });
            break;
          }
          const item = items[0];
          if (item) {
            if (item.blobUrl) createdUrls.push(item.blobUrl);
            setRenderedById((prev) => ({ ...prev, [item.pageId]: item }));
          }
        } catch (err) {
          if (!cancelled) {
            setErrorMsg(
              err instanceof Error ? err.message : 'Failed to render preview'
            );
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [activePageId, onRenderPages, pages]);

  // Jump scroll container to initial active slide on mount
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || hasScrolledInitialRef.current) return;
    hasScrolledInitialRef.current = true;
    if (initialIndex > 0) {
      el.scrollLeft = initialIndex * el.clientWidth;
    }
  }, [initialIndex]);

  const goToIndex = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(pages.length - 1, nextIndex));
    setCurrentIndex(clamped);
    const el = scrollerRef.current;
    if (el) {
      el.scrollTo({
        left: clamped * el.clientWidth,
        behavior: 'smooth',
      });
    }
  };

  // Keyboard navigation (Escape, ArrowLeft, ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && pages.length > 1) {
        goToIndex(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && pages.length > 1) {
        goToIndex(currentIndex + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, onClose, pages.length]);

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== currentIndex && idx >= 0 && idx < pages.length) {
      setCurrentIndex(idx);
    }
  };

  const currentPage = pages[currentIndex] ?? pages[0];
  const currentRendered = currentPage ? renderedById[currentPage.id] : undefined;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Full size post preview"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col select-none"
    >
      {/* Top Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-14 px-4 flex items-center justify-between shrink-0 text-neutral-200 border-b border-white/10"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-medium">
            {pages.length > 1
              ? `Preview ${currentIndex + 1} of ${pages.length}`
              : 'Full Size Preview'}
          </span>
          {currentRendered && (
            <span className="text-xs text-neutral-400 tabular-nums">
              {currentRendered.width} × {currentRendered.height}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          title="Close (Esc)"
          className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Carousel Stage */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="w-full h-full flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
          style={{ scrollbarWidth: 'none' }}
        >
          {pages.map((page, idx) => {
            const rendered = renderedById[page.id];
            return (
              <div
                key={page.id}
                className="w-full h-full shrink-0 snap-center flex items-center justify-center p-4 sm:p-8"
              >
                {rendered ? (
                  <img
                    src={rendered.blobUrl || rendered.dataURL}
                    alt={`Slide ${idx + 1} full size preview`}
                    onClick={(e) => e.stopPropagation()}
                    draggable={false}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl ring-1 ring-white/10"
                  />
                ) : (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex flex-col items-center gap-2.5 text-neutral-400"
                  >
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                    <span className="text-xs">Rendering slide {idx + 1}...</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {errorMsg && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-xs text-rose-200">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Bottom Dots Indicator */}
      {pages.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="h-12 shrink-0 flex items-center justify-center gap-2 px-4"
        >
          {pages.map((page, idx) => (
            <button
              key={page.id}
              type="button"
              onClick={() => goToIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-2 rounded-full transition-all ${
                idx === currentIndex
                  ? 'w-6 bg-white'
                  : 'w-2 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
