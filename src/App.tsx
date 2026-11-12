import { useRef, useState, type ChangeEvent } from 'react';
import {
  Download,
  Image as ImageIcon,
  Layers,
  Palette,
  Share2,
  SlidersHorizontal,
  Type,
  X,
} from 'lucide-react';
import { CanvasViewport } from './components/CanvasViewport';
import { Header } from './components/Header';
import { Inspector } from './components/Inspector';
import { BackgroundTab } from './components/Sidebar/BackgroundTab';
import { ImageTab } from './components/Sidebar/ImageTab';
import { LayersTab } from './components/Sidebar/LayersTab';
import { TextTab } from './components/Sidebar/TextTab';
import { Toolbar } from './components/Toolbar';
import { useFabricCanvas } from './hooks/useFabricCanvas';
import type { SidebarTab } from './types/editor';
import { cn } from './utils/cn';
import { sharePngBlob, type ExportPreviewPayload } from './utils/exportCanvas';

const SIDEBAR_TABS: { id: SidebarTab; label: string; icon: typeof Type }[] = [
  { id: 'text', label: 'Text', icon: Type },
  { id: 'image', label: 'Images', icon: ImageIcon },
  { id: 'background', label: 'Backdrop', icon: Palette },
  { id: 'layers', label: 'Layers', icon: Layers },
];

type MobileSheetState = 'none' | 'tool' | 'inspector';

export function App() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('text');
  const [mobileSheet, setMobileSheet] = useState<MobileSheetState>('none');
  const [exportPreview, setExportPreview] = useState<ExportPreviewPayload | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const quickImageInputRef = useRef<HTMLInputElement | null>(null);

  const {
    canvasElRef,
    canvasWidth,
    canvasHeight,
    aspectRatio,
    setAspectRatio,
    selectedObject,
    layers,
    background,
    availableFonts,
    showSafeArea,
    toggleSafeArea,
    canUndo,
    canRedo,
    undo,
    redo,
    resetProject,
    addText,
    applyTextPreset,
    updateTextProps,
    uploadCustomFont,
    addImageFromFile,
    applyImageCutout,
    updateImageProps,
    setBackgroundMode,
    setBackgroundColor,
    setBackgroundGradient,
    setBackgroundImageFromFile,
    updateBackgroundImageConfig,
    removeBackgroundImage,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    duplicateActiveObject,
    deleteActiveObject,
    selectLayerById,
    toggleLayerVisibility,
    toggleLayerLock,
    moveLayer,
    deleteLayerById,
    updateActiveCommonProps,
    deselectAll,
    recalculateOffset,
    canPanCanvasAt,
    cancelPointerAction,
    beginObjectPinch,
    updateObjectPinch,
    endObjectPinch,
    exportPNG,
  } = useFabricCanvas();

  const showMobileInspector = mobileSheet === 'inspector' && Boolean(selectedObject);
  const showMobileToolSheet = mobileSheet === 'tool';
  const hasMobileSheet = showMobileInspector || showMobileToolSheet;
  const activeTabLabel = SIDEBAR_TABS.find((t) => t.id === activeTab)?.label ?? '';

  const handleQuickImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      void addImageFromFile(file);
    }
    e.target.value = '';
  };

  const handleDeleteActiveObject = () => {
    deleteActiveObject();
    setMobileSheet((prev) => (prev === 'inspector' ? 'none' : prev));
  };

  const handleDeleteLayerById = (id: string) => {
    deleteLayerById(id);
    if (selectedObject?.id === id) {
      setMobileSheet((prev) => (prev === 'inspector' ? 'none' : prev));
    }
  };

  const renderTabContent = () => {
    if (activeTab === 'text') {
      return (
        <TextTab
          availableFonts={availableFonts}
          selectedObject={selectedObject}
          onAddText={(preset, fontFamily) => void addText(preset, fontFamily)}
          onApplyTextPreset={(preset) => void applyTextPreset(preset)}
          onApplyFont={(family) => void updateTextProps({ fontFamily: family })}
          onUploadCustomFont={(file) => void uploadCustomFont(file)}
        />
      );
    }
    if (activeTab === 'image') {
      return (
        <ImageTab
          selectedObject={selectedObject}
          onAddImageFile={(file) => void addImageFromFile(file)}
          onApplyCutout={applyImageCutout}
          onUpdateImageProps={updateImageProps}
        />
      );
    }
    if (activeTab === 'background') {
      return (
        <BackgroundTab
          background={background}
          onModeChange={(mode) => void setBackgroundMode(mode)}
          onColorChange={(color) => void setBackgroundColor(color)}
          onGradientChange={(gradient) => void setBackgroundGradient(gradient)}
          onUploadBgImage={(file) => void setBackgroundImageFromFile(file)}
          onUpdateBgImageConfig={(patch) => void updateBackgroundImageConfig(patch)}
          onRemoveBgImage={() => void removeBackgroundImage()}
        />
      );
    }
    return (
      <LayersTab
        layers={layers}
        onSelectLayer={selectLayerById}
        onToggleVisibility={toggleLayerVisibility}
        onToggleLock={toggleLayerLock}
        onMoveLayer={moveLayer}
        onDeleteLayer={handleDeleteLayerById}
      />
    );
  };

  const closeExportPreview = () => {
    setExportPreview((prev) => {
      if (prev?.blobUrl) {
        URL.revokeObjectURL(prev.blobUrl);
      }
      return null;
    });
  };

  const handleExportPNG = async () => {
    const preview = await exportPNG();
    if (preview) {
      setExportPreview((prev) => {
        if (prev?.blobUrl) {
          URL.revokeObjectURL(prev.blobUrl);
        }
        return preview;
      });
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0a0a0a] text-neutral-200 overflow-hidden">
      <Header
        aspectRatio={aspectRatio}
        onAspectRatioChange={(ratio) => void setAspectRatio(ratio)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => void undo()}
        onRedo={() => void redo()}
        onResetProject={() => setShowResetConfirm(true)}
        onExportPNG={() => void handleExportPNG()}
      />

      <input
        ref={quickImageInputRef}
        type="file"
        accept="image/*"
        onChange={handleQuickImageChange}
        className="hidden"
      />

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Desktop Left Sidebar */}
        <div className="hidden lg:flex shrink-0 border-r border-neutral-800/80 bg-[#0f0f0f] z-20">
          <nav
            aria-label="Desktop editor tools"
            className="w-12 shrink-0 border-r border-neutral-800/80 py-2.5 px-1.5 flex flex-col items-center gap-1.5"
          >
            {SIDEBAR_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-label={tab.label}
                  title={tab.label}
                  className={cn(
                    'w-full py-2.5 rounded-md flex items-center justify-center transition-colors',
                    active
                      ? 'bg-neutral-700 text-white'
                      : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/80'
                  )}
                >
                  <Icon className="w-[18px] h-[18px] stroke-[1.75]" />
                </button>
              );
            })}
          </nav>

          <div className="w-64 p-3.5 overflow-y-auto bg-[#0f0f0f]">
            {renderTabContent()}
          </div>
        </div>

        {/* Central Viewport */}
        <main className="relative flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          <CanvasViewport
            canvasElRef={canvasElRef}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            showSafeArea={showSafeArea}
            selectedTextFontSize={
              selectedObject?.kind === 'text' ? selectedObject.fontSize : null
            }
            onChangeTextFontSize={(fontSize) =>
              void updateTextProps({ fontSize })
            }
            onToggleSafeArea={toggleSafeArea}
            onDeselectAll={() => {
              deselectAll();
              setMobileSheet((prev) => (prev === 'inspector' ? 'none' : prev));
            }}
            onDropImageFile={(file) => void addImageFromFile(file)}
            onRecalculateOffset={recalculateOffset}
            onCanPanCanvasAt={canPanCanvasAt}
            onCancelPointerAction={cancelPointerAction}
            onBeginObjectPinch={beginObjectPinch}
            onUpdateObjectPinch={updateObjectPinch}
            onEndObjectPinch={endObjectPinch}
          />

          <div className={cn(hasMobileSheet ? 'hidden lg:contents' : 'shrink-0 lg:contents')}>
            <Toolbar
              selectedObject={selectedObject}
              onOpenMobileInspector={() => setMobileSheet('inspector')}
              onAddText={() => void addText('heading')}
              onTriggerImageUpload={() => quickImageInputRef.current?.click()}
              onBringForward={bringForward}
              onSendBackward={sendBackward}
              onBringToFront={bringToFront}
              onSendToBack={sendToBack}
              onDuplicate={() => void duplicateActiveObject()}
              onDelete={handleDeleteActiveObject}
            />
          </div>
        </main>

        {/* Mobile / Tablet Tool Sheet */}
        {showMobileToolSheet && (
          <section
            aria-label={`${activeTabLabel} panel`}
            className="lg:hidden w-full h-[44vh] max-h-[420px] shrink-0 border-t border-neutral-800 bg-[#0f0f0f] flex flex-col overflow-hidden z-20"
          >
            <div className="h-11 px-4 border-b border-neutral-800/80 flex items-center justify-between shrink-0">
              <span className="text-sm font-medium text-neutral-200">
                {activeTabLabel}
              </span>
              <div className="flex items-center gap-1.5">
                {selectedObject && (
                  <button
                    type="button"
                    onClick={() => setMobileSheet('inspector')}
                    aria-label="Layer properties"
                    title="Layer properties"
                    className="p-2 rounded-lg bg-neutral-800 text-neutral-100"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMobileSheet('none')}
                  className="p-2 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800"
                  aria-label="Close tool panel"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4">{renderTabContent()}</div>
          </section>
        )}

        {/* Right Contextual Inspector */}
        <Inspector
          selectedObject={selectedObject}
          availableFonts={availableFonts}
          aspectRatio={aspectRatio}
          background={background}
          layerCount={layers.length}
          mobileOpen={showMobileInspector}
          onCloseMobile={() => setMobileSheet('none')}
          onUpdateText={(patch) => void updateTextProps(patch)}
          onApplyTextPreset={(preset) => void applyTextPreset(preset)}
          onApplyCutout={applyImageCutout}
          onUpdateImageProps={updateImageProps}
          onUpdateCommon={updateActiveCommonProps}
          onBringForward={bringForward}
          onSendBackward={sendBackward}
          onBringToFront={bringToFront}
          onSendToBack={sendToBack}
          onDuplicate={() => void duplicateActiveObject()}
          onDelete={handleDeleteActiveObject}
        />
      </div>

      {/* Mobile / Tablet Bottom Navigation Dock */}
      <nav
        aria-label="Mobile editor tools"
        className="lg:hidden shrink-0 border-t border-neutral-800 bg-[#0f0f0f] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around gap-1.5 z-30"
      >
        {SIDEBAR_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = showMobileToolSheet && activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (mobileSheet === 'tool' && activeTab === tab.id) {
                  setMobileSheet('none');
                } else {
                  setActiveTab(tab.id);
                  setMobileSheet('tool');
                }
              }}
              aria-label={tab.label}
              title={tab.label}
              className={cn(
                'flex-1 min-h-[48px] py-2 rounded-lg flex items-center justify-center transition-colors',
                active
                  ? 'bg-neutral-700 text-white'
                  : 'text-neutral-400 hover:text-neutral-100'
              )}
            >
              <Icon className="w-5 h-5 stroke-[1.75]" />
            </button>
          );
        })}

        <button
          type="button"
          disabled={!selectedObject}
          onClick={() => {
            if (!selectedObject) return;
            setMobileSheet((prev) => (prev === 'inspector' ? 'none' : 'inspector'));
          }}
          aria-label="Edit selected layer properties"
          title={selectedObject ? 'Edit selected layer properties' : 'Select a layer to edit'}
          className={cn(
            'relative flex-1 min-h-[48px] py-2 rounded-lg flex items-center justify-center transition-colors',
            !selectedObject
              ? 'text-neutral-700 cursor-not-allowed'
              : showMobileInspector
                ? 'bg-neutral-100 text-neutral-950'
                : 'text-neutral-200 bg-neutral-800/80 hover:bg-neutral-700'
          )}
        >
          <SlidersHorizontal className="w-5 h-5 stroke-[1.75]" />
        </button>
      </nav>

      {/* iOS Safari Export Preview Modal (used when native Share Sheet needs a fresh gesture or isn't supported) */}
      {exportPreview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Exported image"
          onClick={closeExportPreview}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg bg-[#141414] border border-neutral-800 p-3.5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-200">
                Save or Share Image
              </span>
              <button
                type="button"
                onClick={closeExportPreview}
                aria-label="Close export modal"
                className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-md bg-neutral-950 border border-neutral-800 p-2 flex items-center justify-center max-h-[55vh] overflow-hidden">
              <img
                src={exportPreview.dataURL}
                alt="Exported story preview"
                className="max-h-[50vh] w-auto object-contain rounded select-auto"
              />
            </div>

            <p className="text-[11px] text-neutral-400 text-center">
              Tap Save / Share below, or touch and hold the image to Save to Photos.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={async () => {
                  const res = await sharePngBlob(
                    exportPreview.blob,
                    exportPreview.filename
                  );
                  if (res === 'unsupported') {
                    window.open(exportPreview.blobUrl, '_blank', 'noopener');
                  }
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-neutral-100 hover:bg-white text-neutral-950 text-xs font-medium transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Save / Share</span>
              </button>
              <a
                href={exportPreview.blobUrl}
                download={exportPreview.filename}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Reset Project Confirmation Modal */}
      {showResetConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Reset canvas confirmation"
          onClick={() => setShowResetConfirm(false)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-lg bg-[#141414] border border-neutral-800 p-4 flex flex-col gap-3"
          >
            <div>
              <h2 className="text-sm font-medium text-neutral-100">
                Reset canvas?
              </h2>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                This restores the starter template and clears your saved draft from this browser.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="py-1.5 px-3 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-200 transition-colors"
              >
                Cancel
              </button>
              <button
                id="confirm-reset-project"
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  void resetProject();
                }}
                className="py-1.5 px-3 rounded-md bg-red-600 hover:bg-red-500 text-xs font-medium text-white transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
