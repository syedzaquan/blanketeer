import { useRef, type ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import type { SelectedObjectState } from '../../types/editor';
import type { FontOption } from '../../utils/fonts';
import { cn } from '../../utils/cn';

interface TextTabProps {
  availableFonts: FontOption[];
  selectedObject: SelectedObjectState | null;
  onAddText: (preset: 'headline' | 'pill' | 'body') => void;
  onApplyFont: (family: string) => void;
  onUploadCustomFont: (file: File) => void;
}

export function TextTab({
  availableFonts,
  selectedObject,
  onAddText,
  onApplyFont,
  onUploadCustomFont,
}: TextTabProps) {
  const fontInputRef = useRef<HTMLInputElement | null>(null);
  const selectedText = selectedObject?.kind === 'text' ? selectedObject : null;

  const handleFontFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadCustomFont(file);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-medium text-neutral-300">
            Fonts
          </h2>
          <span className="text-[11px] text-neutral-500">
            {selectedText ? 'Click to apply' : 'Click to add'}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          {availableFonts.map((font) => {
            const lowerFamily = font.family.toLowerCase();
            const isActive =
              selectedText?.fontFamily.toLowerCase() === lowerFamily;
            const isTallCondensed =
              lowerFamily === 'humane' || lowerFamily === 'morganite';
            return (
              <button
                key={font.family}
                type="button"
                onClick={() => {
                  if (selectedText) {
                    onApplyFont(font.family);
                  } else {
                    onAddText('headline');
                    window.setTimeout(() => onApplyFont(font.family), 60);
                  }
                }}
                className={cn(
                  'flex items-center justify-between px-2.5 py-2 rounded-md border text-left transition-colors',
                  isActive
                    ? 'bg-neutral-800 border-neutral-600 text-neutral-100'
                    : 'bg-neutral-900/60 border-neutral-800/80 text-neutral-300 hover:bg-neutral-800/60 hover:border-neutral-700'
                )}
              >
                <span
                  className={cn(
                    'truncate',
                    isTallCondensed ? 'text-[26px] leading-none py-0.5' : 'text-[15px]'
                  )}
                  style={
                    lowerFamily === 'fraunces'
                      ? {
                          fontFamily: `"${font.family}", serif`,
                          fontWeight: 600,
                          fontOpticalSizing: 'none',
                          fontVariationSettings: "'opsz' 36, 'wght' 600, 'SOFT' 100, 'WONK' 0",
                        }
                      : { fontFamily: `"${font.family}", serif` }
                  }
                >
                  {font.name}
                </span>
                <span className="text-[10px] text-neutral-500 shrink-0 ml-2">
                  {font.categoryLabel}
                </span>
              </button>
            );
          })}
        </div>

        <input
          ref={fontInputRef}
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          onChange={handleFontFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fontInputRef.current?.click()}
          className="mt-2.5 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-800 hover:border-neutral-700 bg-neutral-900 hover:bg-neutral-800/80 text-xs font-medium text-neutral-300 transition-colors"
        >
          <Upload className="w-3.5 h-3.5 text-neutral-400" />
          <span>Upload Font (.ttf, .otf, .woff2)</span>
        </button>
      </div>
    </div>
  );
}
