import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ChevronDown, Plus, Upload } from 'lucide-react';
import type { SelectedObjectState } from '../../types/editor';
import { groupFontEntries, type FontOption } from '../../utils/fonts';
import {
  TEXT_STYLE_PRESETS,
  findMatchingTextPreset,
  type TextStylePresetId,
} from '../../utils/textPresets';
import { cn } from '../../utils/cn';

interface TextTabProps {
  availableFonts: FontOption[];
  selectedObject: SelectedObjectState | null;
  onAddText: (preset: TextStylePresetId, fontFamily?: string) => void;
  onApplyTextPreset: (preset: TextStylePresetId) => void;
  onApplyFont: (family: string) => void;
  onUploadCustomFont: (file: File) => void;
}

export function TextTab({
  availableFonts,
  selectedObject,
  onAddText,
  onApplyTextPreset,
  onApplyFont,
  onUploadCustomFont,
}: TextTabProps) {
  const fontInputRef = useRef<HTMLInputElement | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const selectedText = selectedObject?.kind === 'text' ? selectedObject : null;
  const activeStyleId = selectedText
    ? findMatchingTextPreset(
        selectedText.fontSize,
        selectedText.fontWeight,
        selectedText.fill
      )
    : null;

  const fontEntries = useMemo(
    () => groupFontEntries(availableFonts),
    [availableFonts]
  );

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const handleSelectFont = (family: string) => {
    if (selectedText) {
      onApplyFont(family);
    } else {
      onAddText('heading', family);
    }
  };

  const handleFontFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadCustomFont(file);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Text Hierarchy Presets */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-medium text-neutral-300">
            Text Style
          </h2>
          <span className="text-[11px] text-neutral-500">
            {selectedText ? 'Tap to apply · + to add' : 'Tap to add'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:gap-1.5">
          {TEXT_STYLE_PRESETS.map((preset) => {
            const isActive = activeStyleId === preset.id;
            return (
              <div
                key={preset.id}
                className={cn(
                  'relative flex items-stretch rounded-lg lg:rounded-md border transition-colors overflow-hidden',
                  isActive
                    ? 'bg-neutral-700 border-neutral-500 text-white'
                    : 'bg-neutral-800/75 border-neutral-700/80 text-neutral-200 hover:bg-neutral-800 hover:border-neutral-600'
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (selectedText) {
                      onApplyTextPreset(preset.id);
                    } else {
                      onAddText(preset.id);
                    }
                  }}
                  className="flex-1 min-w-0 px-3 py-2.5 lg:px-2.5 lg:py-2 text-left flex flex-col gap-0.5"
                >
                  <span
                    className="block truncate leading-tight"
                    style={{
                      fontWeight: preset.fontWeight,
                      fontSize:
                        preset.id === 'heading'
                          ? '15px'
                          : preset.id === 'subheading'
                            ? '13px'
                            : preset.id === 'body'
                              ? '12px'
                              : '11px',
                    }}
                  >
                    {preset.label}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-400">
                    <span
                      className="w-2 h-2 rounded-full border border-white/25 shrink-0"
                      style={{ backgroundColor: preset.fill }}
                    />
                    <span>
                      {preset.fontWeight} · {preset.fontSize}px
                    </span>
                  </span>
                </button>

                {selectedText && (
                  <button
                    type="button"
                    onClick={() => onAddText(preset.id, selectedText.fontFamily)}
                    aria-label={`Add new ${preset.label}`}
                    title={`Add new ${preset.label}`}
                    className="px-2 lg:px-1.5 border-l border-neutral-700/80 text-neutral-400 hover:text-white hover:bg-neutral-600/50 flex items-center justify-center transition-colors shrink-0"
                  >
                    <Plus className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fonts */}
      <div className="border-t border-neutral-800/80 pt-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-medium text-neutral-300">
            Fonts
          </h2>
          <span className="text-[11px] text-neutral-500">
            {selectedText ? 'Tap to apply' : 'Tap to add'}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          {fontEntries.map((entry) => {
            if (entry.kind === 'single') {
              const font = entry.font;
              const lowerFamily = font.family.toLowerCase();
              const isActive =
                selectedText?.fontFamily.toLowerCase() === lowerFamily;
              const isTallCondensed =
                lowerFamily === 'humane' || lowerFamily === 'morganite';
              return (
                <button
                  key={font.family}
                  type="button"
                  onClick={() => handleSelectFont(font.family)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2.5 lg:px-2.5 lg:py-2 rounded-lg lg:rounded-md border text-left transition-colors',
                    isActive
                      ? 'bg-neutral-700 border-neutral-500 text-white'
                      : 'bg-neutral-800/70 border-neutral-700/80 text-neutral-200 hover:bg-neutral-800 hover:border-neutral-600'
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
            }

            const { groupName, fonts } = entry;
            const isOpen = Boolean(openGroups[groupName]);
            const activeFontInGroup = fonts.find(
              (f) => selectedText?.fontFamily.toLowerCase() === f.family.toLowerCase()
            );
            const leadFont = fonts[0];

            return (
              <div
                key={`group-${groupName}`}
                className={cn(
                  'rounded-lg lg:rounded-md border overflow-hidden transition-colors',
                  activeFontInGroup
                    ? 'border-neutral-500 bg-neutral-800/90'
                    : 'border-neutral-700/80 bg-neutral-800/70'
                )}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => toggleGroup(groupName)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 lg:px-2.5 lg:py-2 text-left transition-colors',
                    activeFontInGroup
                      ? 'bg-neutral-700 text-white'
                      : 'text-neutral-200 hover:bg-neutral-800'
                  )}
                >
                  <span
                    className="truncate text-[15px]"
                    style={
                      leadFont
                        ? { fontFamily: `"${leadFont.family}", serif` }
                        : undefined
                    }
                  >
                    {groupName}
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-[10px] text-neutral-400">
                      {activeFontInGroup
                        ? activeFontInGroup.name.replace(`${groupName} `, '')
                        : `${fonts.length} styles`}
                    </span>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 lg:w-3.5 lg:h-3.5 text-neutral-400 transition-transform duration-150',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-neutral-700/70 bg-neutral-900/60 p-1.5 flex flex-col gap-1">
                    {fonts.map((font) => {
                      const isActive =
                        selectedText?.fontFamily.toLowerCase() ===
                        font.family.toLowerCase();
                      return (
                        <button
                          key={font.family}
                          type="button"
                          onClick={() => handleSelectFont(font.family)}
                          className={cn(
                            'flex items-center justify-between px-2.5 py-2 lg:py-1.5 rounded-md border text-left transition-colors',
                            isActive
                              ? 'bg-neutral-700 border-neutral-500 text-white'
                              : 'bg-neutral-800/70 border-neutral-700/60 text-neutral-200 hover:bg-neutral-800 hover:border-neutral-600'
                          )}
                        >
                          <span
                            className="truncate text-[15px]"
                            style={{ fontFamily: `"${font.family}", serif` }}
                          >
                            {font.name}
                          </span>
                          {font.badge ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-700/80 text-neutral-300 shrink-0 ml-2">
                              {font.badge}
                            </span>
                          ) : (
                            <span className="text-[10px] text-neutral-500 shrink-0 ml-2">
                              {font.categoryLabel}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
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
          className="mt-2.5 w-full flex items-center justify-center gap-1.5 px-3 py-2.5 lg:py-1.5 rounded-lg lg:rounded-md border border-neutral-700 hover:border-neutral-600 bg-neutral-800/80 hover:bg-neutral-700 text-sm lg:text-xs font-medium text-neutral-200 transition-colors"
        >
          <Upload className="w-4 h-4 lg:w-3.5 lg:h-3.5 text-neutral-400" />
          <span>Upload Font (.ttf, .otf, .woff2)</span>
        </button>
      </div>
    </div>
  );
}
