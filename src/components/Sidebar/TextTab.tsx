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
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Featured Fonts
          </h2>
          <span className="text-[10px] text-zinc-500">
            {selectedText ? 'Click to apply' : 'Select text to apply'}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
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
                  'flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all',
                  isActive
                    ? 'bg-violet-600/15 border-violet-500/60 text-white'
                    : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800/70 hover:border-zinc-700'
                )}
              >
                <span
                  className={cn(
                    'truncate',
                    isTallCondensed ? 'text-[26px] leading-none py-0.5' : 'text-base'
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
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0 ml-2">
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
          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-zinc-700 hover:border-violet-500/60 hover:bg-zinc-900 text-xs font-medium text-zinc-300 transition-colors"
        >
          <Upload className="w-3.5 h-3.5 text-violet-400" />
          <span>Load Local Font (.ttf / .otf / .woff2)</span>
        </button>
      </div>
    </div>
  );
}

