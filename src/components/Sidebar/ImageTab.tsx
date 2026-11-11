import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  Circle,
  Heart,
  ImagePlus,
  RotateCcw,
  Square,
  Star,
  Upload,
} from 'lucide-react';
import type { CutoutShape, SelectedObjectState } from '../../types/editor';
import { cn } from '../../utils/cn';

interface ImageTabProps {
  selectedObject: SelectedObjectState | null;
  onAddImageFile: (file: File) => void;
  onApplyCutout: (shape: CutoutShape, cornerPercent?: number) => void;
}

const CUTOUT_OPTIONS: {
  id: CutoutShape;
  label: string;
  icon: typeof Circle;
}[] = [
  { id: 'none', label: 'Original', icon: RotateCcw },
  { id: 'circle', label: 'Circle', icon: Circle },
  { id: 'square', label: 'Square', icon: Square },
  { id: 'rounded', label: 'Squircle', icon: Square },
  { id: 'star', label: 'Star', icon: Star },
  { id: 'heart', label: 'Heart', icon: Heart },
];

export function ImageTab({
  selectedObject,
  onAddImageFile,
  onApplyCutout,
}: ImageTabProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const selectedImage =
    selectedObject?.kind === 'image' ? selectedObject : null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onAddImageFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onAddImageFile(file);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
          Insert Image Layer
        </h2>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={cn(
            'flex flex-col items-center justify-center gap-2.5 p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all text-center',
            isDragging
              ? 'border-violet-400 bg-violet-500/15'
              : 'border-zinc-700/90 hover:border-violet-500/60 bg-zinc-900/60 hover:bg-zinc-900'
          )}
        >
          <div className="w-11 h-11 rounded-xl bg-fuchsia-500/15 text-fuchsia-400 flex items-center justify-center">
            <ImagePlus className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-100">
              Click or drop an image
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              PNG, JPG, WebP or SVG
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-800 text-[11px] font-medium text-zinc-200">
            <Upload className="w-3 h-3" />
            Choose File
          </span>
        </div>
      </div>

      <div className="border-t border-zinc-800/80 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Shape Cutout & Mask
          </h2>
          {!selectedImage && (
            <span className="text-[10px] text-zinc-500">Select an image</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {CUTOUT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = selectedImage?.cutoutShape === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={!selectedImage}
                onClick={() => onApplyCutout(opt.id)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border text-[11px] font-medium transition-all',
                  !selectedImage
                    ? 'opacity-40 cursor-not-allowed bg-zinc-900/40 border-zinc-800 text-zinc-500'
                    : active
                      ? 'bg-violet-600/20 border-violet-500 text-white'
                      : 'bg-zinc-900/70 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700'
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4',
                    opt.id === 'rounded' && 'rounded-[4px]'
                  )}
                />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {selectedImage?.cutoutShape === 'rounded' && (
          <div className="mt-4 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-zinc-400">Corner Radius</span>
              <span className="font-mono text-zinc-200">
                {selectedImage.cutoutRadius}%
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={48}
              value={selectedImage.cutoutRadius}
              onChange={(e) =>
                onApplyCutout('rounded', Number(e.target.value))
              }
              className="w-full accent-violet-500"
            />
          </div>
        )}
      </div>
    </div>
  );
}

