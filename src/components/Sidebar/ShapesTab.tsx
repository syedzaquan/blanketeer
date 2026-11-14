import {
  Circle,
  Minus,
  RectangleHorizontal,
  Square,
  Star,
  Triangle,
} from 'lucide-react';
import type { BasicShapeKind } from '../../types/editor';

interface ShapesTabProps {
  onAddShape: (shape: BasicShapeKind) => void;
}

const SHAPE_OPTIONS: {
  id: BasicShapeKind;
  label: string;
  icon: typeof Square;
}[] = [
  { id: 'rect', label: 'Square', icon: Square },
  { id: 'rounded', label: 'Rounded', icon: RectangleHorizontal },
  { id: 'circle', label: 'Circle', icon: Circle },
  { id: 'triangle', label: 'Triangle', icon: Triangle },
  { id: 'star', label: 'Star', icon: Star },
  { id: 'line', label: 'Line', icon: Minus },
];

export function ShapesTab({ onAddShape }: ShapesTabProps) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-xs font-medium text-neutral-300 mb-2">
          Basic Shapes
        </h2>
        <div className="grid grid-cols-2 gap-2 lg:gap-1.5">
          {SHAPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onAddShape(opt.id)}
                className="flex flex-col items-center justify-center gap-1.5 py-4 px-3 lg:py-3.5 rounded-lg lg:rounded-md bg-neutral-800/70 hover:bg-neutral-700/80 border border-neutral-700/80 hover:border-neutral-500 text-neutral-200 hover:text-white transition-colors"
              >
                <Icon
                  className={
                    opt.id === 'rounded'
                      ? 'w-5 h-5 rounded-[4px]'
                      : 'w-5 h-5'
                  }
                />
                <span className="text-xs lg:text-[11px] font-medium">
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-[11px] text-neutral-500 leading-relaxed">
        Tap a shape to add it to the canvas, then customize fill color or image, border, and corner radius in Properties.
      </p>
    </div>
  );
}

