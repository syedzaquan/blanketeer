import {
  useRef,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type TouchEvent,
} from 'react';

interface RangeSliderProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'type' | 'onChange' | 'defaultValue' | 'value' | 'min' | 'max' | 'step'
  > {
  min: number;
  max: number;
  step?: number;
  value: number;
  defaultValue?: number;
  onValueChange: (value: number) => void;
}

export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  defaultValue,
  disabled,
  title,
  onValueChange,
  onKeyDown,
  onPointerDown,
  onDoubleClick,
  onTouchEnd,
  ...rest
}: RangeSliderProps) {
  const lastInputWasKeyboardRef = useRef(false);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  const resetToDefault = () => {
    if (disabled || defaultValue === undefined) return;
    const clamped = Math.min(max, Math.max(min, defaultValue));
    onValueChange(clamped);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    if (!Number.isFinite(raw)) return;

    if (defaultValue !== undefined && !lastInputWasKeyboardRef.current) {
      const range = Math.max(0, max - min);
      const snapRadius = Math.max(
        step * 0.6,
        Math.min(range * 0.02, step * 5)
      );
      if (Math.abs(raw - defaultValue) <= snapRadius) {
        onValueChange(Math.min(max, Math.max(min, defaultValue)));
        return;
      }
    }

    onValueChange(raw);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    lastInputWasKeyboardRef.current = true;
    onKeyDown?.(e);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    lastInputWasKeyboardRef.current = false;
    onPointerDown?.(e);
  };

  const handleDoubleClick = (e: MouseEvent<HTMLInputElement>) => {
    resetToDefault();
    onDoubleClick?.(e);
  };

  const handleTouchEnd = (e: TouchEvent<HTMLInputElement>) => {
    if (!disabled && defaultValue !== undefined) {
      const touch = e.changedTouches[0];
      if (touch) {
        const now = Date.now();
        const prev = lastTapRef.current;
        if (
          prev &&
          now - prev.time <= 320 &&
          Math.hypot(touch.clientX - prev.x, touch.clientY - prev.y) <= 24
        ) {
          e.preventDefault();
          lastTapRef.current = null;
          resetToDefault();
        } else {
          lastTapRef.current = {
            time: now,
            x: touch.clientX,
            y: touch.clientY,
          };
        }
      }
    }
    onTouchEnd?.(e);
  };

  const resolvedTitle =
    title ??
    (defaultValue !== undefined
      ? 'Double-tap or double-click to reset to default'
      : undefined);

  return (
    <input
      {...rest}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      title={resolvedTitle}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      onTouchEnd={handleTouchEnd}
    />
  );
}

