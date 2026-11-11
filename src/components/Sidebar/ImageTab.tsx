import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { ImagePlus, Upload } from 'lucide-react';
import type { CutoutShape, SelectedObjectState } from '../../types/editor';
import { cn } from '../../utils/cn';
import {
  ImageStyleControls,
  type ImagePropsPatch,
} from '../ImageStyleControls';

interface ImageTabProps {
  selectedObject: SelectedObjectState | null;
  onAddImageFile: (file: File) => void;
  onApplyCutout: (shape: CutoutShape, cornerPercent?: number) => void;
  onUpdateImageProps: (patch: ImagePropsPatch) => void;
}

export function ImageTab({
  selectedObject,
  onAddImageFile,
  onApplyCutout,
  onUpdateImageProps,
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

      <ImageStyleControls
        selectedImage={selectedImage}
        idPrefix="image-tab"
        onApplyCutout={onApplyCutout}
        onUpdateImageProps={onUpdateImageProps}
      />
    </div>
  );
}

