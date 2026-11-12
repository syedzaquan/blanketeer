import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '../utils/cn';

interface MobileFontSizeSliderProps {
  fontSize: number;
  min?: number;
  max?: number;
  onChange: (size: number) => void;
}

export function MobileFontSizeSlider({
  fontSize,
  min = 16,
  max = 220,
  onChange,
}: MobileFontSizeSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const effectiveMax = Math.max(max, fontSize);
  const clampedValue = Math.min(effectiveMax, Math.max(min, fontSize));
  const ratio =
    effectiveMax > min ? (clampedValue - min) / (effectiveMax - min) : 0;
  const percent = Math.round(ratio * 100);

  const updateFromClientY = (clientY: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (rect.height <= 0) return;
    const nextRatio = Math.min(
      1,
      Math.max(0, (rect.bottom - clientY) / rect.height)
    );
    const nextSize = Math.round(min + nextRatio * (effectiveMax - min));
    onChange(nextSize);
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateFromClientY(e.clientY);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    updateFromClientY(e.clientY);
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(Math.min(effectiveMax, clampedValue + step));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(Math.max(min, clampedValue - step));
    }
  };

  return (
    <div
      data-testid="mobile-font-size-slider"
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="lg:hidden absolute left-2 top-[46%] -translate-y-1/2 z-20 flex flex-col items-center gap-1.5 select-none"
    >
      <div
        className={cn(
          'px-1 py-0.5 text-xs font-mono font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] transition-transform min-w-[2rem] text-center',
          isDragging ? 'scale-110' : 'scale-100'
        )}
      >
        {Math.round(fontSize)}
      </div>

      <div className="px-1 py-1">
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="Mobile Font Size"
          aria-orientation="vertical"
          aria-valuemin={min}
          aria-valuemax={effectiveMax}
          aria-valuenow={Math.round(clampedValue)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
          className="relative w-7 h-40 sm:h-48 flex items-center justify-center touch-none cursor-ns-resize outline-none"
        >
          <div className="relative w-1.5 h-full rounded-full bg-white/30 shadow-[0_1px_3px_rgba(0,0,0,0.5)] overflow-hidden">
            <div
              className="absolute bottom-0 left-0 right-0 rounded-full bg-white"
              style={{ height: `${percent}%` }}
            />
          </div>

          <div
            className={cn(
              'pointer-events-none absolute w-5 h-5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.65)] transition-transform',
              isDragging ? 'scale-110' : 'scale-100'
            )}
            style={{ bottom: `calc(${percent}% - 10px)` }}
          />
        </div>
      </div>
    </div>
  );
}
