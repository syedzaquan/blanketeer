import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { ImagePlus, Plus, Upload, X } from 'lucide-react';
import type { CutoutShape, SelectedObjectState } from '../../types/editor';
import { cn } from '../../utils/cn';
import {
  ImageStyleControls,
  type ImagePropsPatch,
} from '../ImageStyleControls';

interface ImageTabProps {
  selectedObject: SelectedObjectState | null;
  canvasWidth: number;
  canvasHeight: number;
  onAddImageFile: (file: File) => void;
  onApplyCutout: (shape: CutoutShape, cornerPercent?: number) => void;
  onUpdateImageProps: (patch: ImagePropsPatch) => void;
  onReplaceImage?: (file: File) => void;
}

export function ImageTab({
  selectedObject,
  canvasWidth,
  canvasHeight,
  onAddImageFile,
  onApplyCutout,
  onUpdateImageProps,
  onReplaceImage,
}: ImageTabProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  const selectedImage =
    selectedObject?.kind === 'image' ? selectedObject : null;
  const shouldShowUploadSection = !selectedImage || showUploader;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onAddImageFile(file);
      setShowUploader(false);
    }
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onAddImageFile(file);
      setShowUploader(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {selectedImage && !showUploader ? (
        <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-md bg-neutral-900 border border-neutral-800">
          <div className="min-w-0">
            <span className="block text-[11px] text-neutral-500">
              Selected image
            </span>
            <p className="text-xs font-medium text-neutral-200 truncate">
              {selectedImage.name}
            </p>
          </div>
          <button
            id="image-tab-add-another"
            type="button"
            onClick={() => setShowUploader(true)}
            className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Image</span>
          </button>
        </div>
      ) : null}

      {shouldShowUploadSection && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-medium text-neutral-300">
              Add Image
            </h2>
            {selectedImage && (
              <button
                id="image-tab-hide-uploader"
                type="button"
                onClick={() => setShowUploader(false)}
                aria-label="Hide upload section"
                className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Hide</span>
              </button>
            )}
          </div>

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
              'flex flex-row items-center justify-between gap-3 px-3.5 py-2.5 lg:flex-col lg:justify-center lg:gap-2 lg:p-5 rounded-lg lg:rounded-md border border-dashed cursor-pointer transition-colors lg:text-center',
              isDragging
                ? 'border-neutral-400 bg-neutral-900'
                : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/50 hover:bg-neutral-900'
            )}
          >
            <div className="flex items-center gap-2.5 lg:flex-col lg:gap-2 min-w-0">
              <div className="w-8 h-8 rounded-md bg-neutral-800 text-neutral-300 flex items-center justify-center shrink-0">
                <ImagePlus className="w-4 h-4" />
              </div>
              <div className="min-w-0 text-left lg:text-center">
                <p className="text-xs font-medium text-neutral-200 truncate">
                  <span className="lg:hidden">Upload image</span>
                  <span className="hidden lg:inline">Click or drop an image</span>
                </p>
                <p className="hidden lg:block text-[11px] text-neutral-500 mt-0.5">
                  PNG, JPG, WebP, SVG
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 lg:py-1 rounded-md bg-neutral-800 text-xs lg:text-[11px] font-medium text-neutral-200 shrink-0">
              <Upload className="w-3.5 h-3.5 lg:w-3 lg:h-3" />
              Choose File
            </span>
          </div>
        </div>
      )}

      <ImageStyleControls
        selectedImage={selectedImage}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        idPrefix="image-tab"
        onApplyCutout={onApplyCutout}
        onUpdateImageProps={onUpdateImageProps}
        onReplaceImage={onReplaceImage}
      />
    </div>
  );
}
