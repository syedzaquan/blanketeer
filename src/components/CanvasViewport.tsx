import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
  type RefObject,
} from 'react';
import { ImagePlus, Scan } from 'lucide-react';
import { useWindowSize } from '../hooks/useWindowSize';
import { cn } from '../utils/cn';

interface CanvasViewportProps {
  canvasElRef: RefObject<HTMLCanvasElement | null>;
  canvasWidth: number;
  canvasHeight: number;
  showSafeArea: boolean;
  onToggleSafeArea: () => void;
  onDeselectAll: () => void;
  onDropImageFile: (file: File) => void;
  onRecalculateOffset: () => void;
}

const calculateScale = (
  containerWidth: number,
  containerHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  isDesktop: boolean
): number => {
  const paddingX = isDesktop ? 64 : 24;
  const paddingY = isDesktop ? 104 : 28;
  const availableWidth = Math.max(containerWidth - paddingX, 120);
  const availableHeight = Math.max(containerHeight - paddingY, 120);
  return Math.min(availableWidth / canvasWidth, availableHeight / canvasHeight, 1);
};

export function CanvasViewport({
  canvasElRef,
  canvasWidth,
  canvasHeight,
  showSafeArea,
  onToggleSafeArea,
  onDeselectAll,
  onDropImageFile,
  onRecalculateOffset,
}: CanvasViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const windowSize = useWindowSize();
  const [containerSize, setContainerSize] = useState({ width: 720, height: 760 });
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [windowSize.width, windowSize.height]);

  const isDesktop = windowSize.width >= 1024;
  const scale = calculateScale(
    containerSize.width,
    containerSize.height,
    canvasWidth,
    canvasHeight,
    isDesktop
  );

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      onRecalculateOffset();
    });
    return () => window.cancelAnimationFrame(id);
  }, [scale, canvasWidth, canvasHeight, onRecalculateOffset]);

  const handleBackdropMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onDeselectAll();
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingFile(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsDraggingFile(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onDropImageFile(file);
    }
  };

  const scaledWidth = Math.round(canvasWidth * scale);
  const scaledHeight = Math.round(canvasHeight * scale);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleBackdropMouseDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex-1 min-h-0 studio-grid-bg flex items-center justify-center lg:pb-10 overflow-hidden select-none"
    >
      {/* Scaled Canvas Frame */}
      <div
        className="relative touch-none shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)] ring-1 ring-white/10 rounded-[4px] overflow-hidden checkerboard-bg shrink-0"
        style={{
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
        }}
      >
        <div
          style={{
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <canvas ref={canvasElRef} />
        </div>
      </div>

      {/* Top-right Safe Zone Toggle */}
      <button
        type="button"
        onClick={onToggleSafeArea}
        title="Toggle Instagram Safe Area Guides"
        className={cn(
          'absolute top-2.5 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium backdrop-blur transition-colors',
          showSafeArea
            ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
            : 'bg-zinc-900/80 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
        )}
      >
        <Scan className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Safe Area</span>
      </button>

      {/* Viewport Zoom & Resolution Indicator */}
      <div className="pointer-events-none absolute bottom-2 left-3 lg:bottom-3 lg:left-4 flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-zinc-900/85 border border-zinc-800/80 text-[10px] sm:text-[11px] font-mono text-zinc-400 backdrop-blur">
        <span>{Math.round(scale * 100)}%</span>
        <span className="text-zinc-600">•</span>
        <span>
          {canvasWidth} × {canvasHeight}
        </span>
      </div>

      {/* Drag & Drop Image Overlay */}
      {isDraggingFile && (
        <div className="pointer-events-none absolute inset-4 rounded-2xl border-2 border-dashed border-violet-400 bg-violet-950/50 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
          <div className="w-14 h-14 rounded-2xl bg-violet-600/30 border border-violet-400/50 flex items-center justify-center text-violet-200">
            <ImagePlus className="w-7 h-7" />
          </div>
          <p className="text-sm font-semibold text-white">
            Drop image to add layer
          </p>
          <p className="text-xs text-violet-200/80">
            Inserted at full resolution on your story canvas
          </p>
        </div>
      )}
    </div>
  );
}
