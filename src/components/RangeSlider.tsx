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
  onTouchStart,
  onTouchEnd,
  ...rest
}: RangeSliderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastInputWasKeyboardRef = useRef(false);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const ignoreChangeUntilRef = useRef(0);

  const resetToDefault = () => {
    if (disabled || defaultValue === undefined) return;
    const clamped = Math.min(max, Math.max(min, defaultValue));
    ignoreChangeUntilRef.current = Date.now() + 400;
    if (inputRef.current) {
      inputRef.current.value = String(clamped);
      inputRef.current.blur();
    }
    onValueChange(clamped);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (Date.now() < ignoreChangeUntilRef.current) {
      if (defaultValue !== undefined) {
        e.target.value = String(Math.min(max, Math.max(min, defaultValue)));
      }
      return;
    }

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
    ignoreChangeUntilRef.current = 0;
    lastInputWasKeyboardRef.current = true;
    onKeyDown?.(e);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    if (e.pointerType !== 'touch') {
      ignoreChangeUntilRef.current = 0;
    }
    lastInputWasKeyboardRef.current = false;
    onPointerDown?.(e);
  };

  const handleTouchStart = (e: TouchEvent<HTMLInputElement>) => {
    lastInputWasKeyboardRef.current = false;
    if (!disabled && defaultValue !== undefined) {
      const touch = e.touches[0];
      const prev = lastTapRef.current;
      if (
        touch &&
        prev &&
        Date.now() - prev.time <= 320 &&
        Math.hypot(touch.clientX - prev.x, touch.clientY - prev.y) <= 24
      ) {
        // Prevent native range-drag from starting on the 2nd tap so it can't get stuck open.
        e.preventDefault();
        lastTapRef.current = null;
        resetToDefault();
      } else {
        ignoreChangeUntilRef.current = 0;
      }
    }
    onTouchStart?.(e);
  };

  const handleDoubleClick = (e: MouseEvent<HTMLInputElement>) => {
    resetToDefault();
    onDoubleClick?.(e);
  };

  const handleTouchEnd = (e: TouchEvent<HTMLInputElement>) => {
    if (!disabled && defaultValue !== undefined && Date.now() >= ignoreChangeUntilRef.current) {
      const touch = e.changedTouches[0];
      if (touch) {
        lastTapRef.current = {
          time: Date.now(),
          x: touch.clientX,
          y: touch.clientY,
        };
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
      ref={inputRef}
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
      onTouchStart={handleTouchStart}
      onDoubleClick={handleDoubleClick}
      onTouchEnd={handleTouchEnd}
    />
  );
}

