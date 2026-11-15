import React, { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type {
  CanvasPageItem,
  ExportImageFormat,
  ExportScale,
} from '../types/editor';
import type { ExportedPageItem } from '../utils/exportCanvas';

interface ZoomablePreviewImageProps {
  src: string;
  alt: string;
  imageWidth: number;
  imageHeight: number;
  onZoomActiveChange: (active: boolean) => void;
}

const PREVIEW_TEXTURE_SUPERSAMPLE = 3;

const ZoomablePreviewImage: React.FC<ZoomablePreviewImageProps> = ({
  src,
  alt,
  imageWidth,
  imageHeight,
  onZoomActiveChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [boxSize, setBoxSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);

  const pinchRef = useRef<{
    initialDist: number;
    initialMidX: number;
    initialMidY: number;
    centerX: number;
    centerY: number;
  } | null>(null);
  const wheelResetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setBoxSize({ w: el.clientWidth, h: el.clientHeight });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (wheelResetTimerRef.current !== null) {
        window.clearTimeout(wheelResetTimerRef.current);
      }
    };
  }, []);

  const fitScale =
    boxSize.w > 0 && boxSize.h > 0 && imageWidth > 0 && imageHeight > 0
      ? Math.min(boxSize.w / imageWidth, boxSize.h / imageHeight)
      : 0;
  const displayW = fitScale > 0 ? imageWidth * fitScale : 0;
  const displayH = fitScale > 0 ? imageHeight * fitScale : 0;

  const startPinchFromTouches = (t1: React.Touch, t2: React.Touch) => {
    const el = imgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    pinchRef.current = {
      initialDist: Math.max(dist, 1),
      initialMidX: (t1.clientX + t2.clientX) / 2,
      initialMidY: (t1.clientY + t2.clientY) / 2,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
    };
    setIsPinching(true);
    onZoomActiveChange(true);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      e.stopPropagation();
      startPinchFromTouches(e.touches[0], e.touches[1]);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      e.stopPropagation();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      const { initialDist, initialMidX, initialMidY, centerX, centerY } =
        pinchRef.current;

      const rawScale = dist / initialDist;
      // Elastic resistance below 1x and above 4x
      const clampedScale =
        rawScale < 1
          ? 1 - (1 - Math.max(0.7, rawScale)) * 0.45
          : rawScale > 4
            ? 4 + (rawScale - 4) * 0.25
            : rawScale;

      const offsetFromCenterX = initialMidX - centerX;
      const offsetFromCenterY = initialMidY - centerY;
      const tx =
        midX - initialMidX - offsetFromCenterX * (clampedScale - 1);
      const ty =
        midY - initialMidY - offsetFromCenterY * (clampedScale - 1);

      setTransform({ scale: clampedScale, x: tx, y: ty });
    }
  };

  const resetElastic = () => {
    if (!pinchRef.current && !isPinching) return;
    pinchRef.current = null;
    setIsPinching(false);
    setTransform({ scale: 1, x: 0, y: 0 });
    onZoomActiveChange(false);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      resetElastic();
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    e.stopPropagation();
    if (wheelResetTimerRef.current !== null) {
      window.clearTimeout(wheelResetTimerRef.current);
    }

    const el = imgRef.current;
    const rect = el?.getBoundingClientRect();

    setIsPinching(true);
    onZoomActiveChange(true);
    setTransform((prev) => {
      const factor = Math.exp(-e.deltaY * 0.01);
      const rawNext = prev.scale * factor;
      const nextScale = Math.max(0.85, Math.min(4.5, rawNext));
      if (!rect) {
        return { scale: nextScale, x: prev.x, y: prev.y };
      }
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const cursorOffsetX = e.clientX - centerX;
      const cursorOffsetY = e.clientY - centerY;
      const ratio = nextScale / prev.scale;
      return {
        scale: nextScale,
        x: prev.x * ratio - cursorOffsetX * (ratio - 1),
        y: prev.y * ratio - cursorOffsetY * (ratio - 1),
      };
    });

    wheelResetTimerRef.current = window.setTimeout(() => {
      setIsPinching(false);
      setTransform({ scale: 1, x: 0, y: 0 });
      onZoomActiveChange(false);
    }, 180);
  };

  const hasMeasuredSize = displayW > 0 && displayH > 0;
  const renderScale = hasMeasuredSize
    ? transform.scale / PREVIEW_TEXTURE_SUPERSAMPLE
    : transform.scale;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onWheel={handleWheel}
      onClick={(e) => e.stopPropagation()}
      className={`w-full h-full flex items-center justify-center ${
        isPinching ? 'relative z-30 touch-none' : 'touch-pan-x'
      }`}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        style={{
          width: hasMeasuredSize
            ? `${displayW * PREVIEW_TEXTURE_SUPERSAMPLE}px`
            : undefined,
          height: hasMeasuredSize
            ? `${displayH * PREVIEW_TEXTURE_SUPERSAMPLE}px`
            : undefined,
          maxWidth: hasMeasuredSize ? 'none' : '100%',
          maxHeight: hasMeasuredSize ? 'none' : '100%',
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${renderScale})`,
          transition: isPinching
            ? 'none'
            : 'transform 360ms cubic-bezier(0.22, 1, 0.36, 1)',
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
        className="shrink-0 object-contain rounded-lg shadow-2xl ring-1 ring-white/10"
      />
    </div>
  );
};

interface FullSizePreviewModalProps {
  pages: CanvasPageItem[];
  activePageId: string;
  onClose: () => void;
  onRenderPages: (
    pageIds: string[],
    format: ExportImageFormat,
    quality?: number,
    scale?: ExportScale
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
  const [isZooming, setIsZooming] = useState(false);
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
          const items = await onRenderPages([pageId], 'png', undefined, 2);
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
          className={`w-full h-full flex snap-x snap-mandatory no-scrollbar ${
            isZooming ? 'overflow-hidden' : 'overflow-x-auto'
          }`}
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
                  <ZoomablePreviewImage
                    src={rendered.blobUrl || rendered.dataURL}
                    alt={`Slide ${idx + 1} full size preview`}
                    imageWidth={rendered.width}
                    imageHeight={rendered.height}
                    onZoomActiveChange={setIsZooming}
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
