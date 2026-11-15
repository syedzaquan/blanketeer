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
  const detentStateRef = useRef<'idle' | 'holding' | 'passed'>('idle');
  const prevRawRef = useRef<number>(value);

  const resetToDefault = () => {
    if (disabled || defaultValue === undefined) return;
    const clamped = Math.min(max, Math.max(min, defaultValue));
    ignoreChangeUntilRef.current = Date.now() + 400;
    detentStateRef.current = 'holding';
    prevRawRef.current = clamped;
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

    const prevRaw = prevRawRef.current;
    prevRawRef.current = raw;

    if (defaultValue !== undefined && !lastInputWasKeyboardRef.current) {
      const clampedDefault = Math.min(max, Math.max(min, defaultValue));
      const range = Math.max(0, max - min);
      const detentRadius = Math.max(
        step * 1.2,
        Math.min(range * 0.025, step * 4)
      );
      const state = detentStateRef.current;

      if (state === 'holding') {
        if (Math.abs(raw - clampedDefault) <= detentRadius) {
          e.target.value = String(clampedDefault);
          onValueChange(clampedDefault);
          return;
        }
        detentStateRef.current = 'passed';
        onValueChange(raw);
        return;
      }

      if (state === 'idle') {
        const hitDefault = Math.abs(raw - clampedDefault) < step * 0.5;
        const crossedDefault =
          (prevRaw < clampedDefault && raw >= clampedDefault) ||
          (prevRaw > clampedDefault && raw <= clampedDefault);
        if (hitDefault || crossedDefault) {
          detentStateRef.current = 'holding';
          e.target.value = String(clampedDefault);
          onValueChange(clampedDefault);
          return;
        }
      } else if (
        state === 'passed' &&
        Math.abs(raw - clampedDefault) > detentRadius * 1.5
      ) {
        detentStateRef.current = 'idle';
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
    prevRawRef.current = value;
    detentStateRef.current =
      defaultValue !== undefined && Math.abs(value - defaultValue) < step * 0.5
        ? 'holding'
        : 'idle';
    onPointerDown?.(e);
  };

  const handleTouchStart = (e: TouchEvent<HTMLInputElement>) => {
    lastInputWasKeyboardRef.current = false;
    prevRawRef.current = value;
    detentStateRef.current =
      defaultValue !== undefined && Math.abs(value - defaultValue) < step * 0.5
        ? 'holding'
        : 'idle';
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

