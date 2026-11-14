import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  Download,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  Palette,
  Shapes,
  Share2,
  SlidersHorizontal,
  Type,
  X,
} from 'lucide-react';
import { CanvasViewport } from './components/CanvasViewport';
import { ExportPagesModal } from './components/ExportPagesModal';
import { FullSizePreviewModal } from './components/FullSizePreviewModal';
import { Header } from './components/Header';
import { Inspector } from './components/Inspector';
import { PageStrip } from './components/PageStrip';
import { BackgroundTab } from './components/Sidebar/BackgroundTab';
import { ImageTab } from './components/Sidebar/ImageTab';
import { LayersTab } from './components/Sidebar/LayersTab';
import { ShapesTab } from './components/Sidebar/ShapesTab';
import { TemplatesTab } from './components/Sidebar/TemplatesTab';
import { TextTab } from './components/Sidebar/TextTab';
import { Toolbar } from './components/Toolbar';
import { useFabricCanvas } from './hooks/useFabricCanvas';
import type { ExportImageFormat, SidebarTab } from './types/editor';
import { cn } from './utils/cn';
import { extractImageFileFromClipboardData } from './utils/clipboardImage';
import { sharePngBlob, type ExportPreviewPayload } from './utils/exportCanvas';

const SIDEBAR_TABS: { id: SidebarTab; label: string; icon: typeof Type }[] = [
  { id: 'text', label: 'Text', icon: Type },
  { id: 'image', label: 'Images', icon: ImageIcon },
  { id: 'shapes', label: 'Shapes', icon: Shapes },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'background', label: 'Backdrop', icon: Palette },
  { id: 'layers', label: 'Layers', icon: Layers },
];

type MobileSheetState = 'none' | 'tool' | 'inspector';

export function App() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('text');
  const [mobileSheet, setMobileSheet] = useState<MobileSheetState>('none');
  const [exportPreview, setExportPreview] = useState<ExportPreviewPayload | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showExportPagesModal, setShowExportPagesModal] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const quickImageInputRef = useRef<HTMLInputElement | null>(null);
  const slotImageInputRef = useRef<HTMLInputElement | null>(null);
  const pendingSlotIdRef = useRef<string | null>(null);

  const {
    canvasElRef,
    canvasWidth,
    canvasHeight,
    aspectRatio,
    setAspectRatio,
    selectedObject,
    layers,
    templateSlots,
    photoPalette,
    background,
    availableFonts,
    showSafeArea,
    toggleSafeArea,
    pages,
    activePageId,
    selectPage,
    addPage,
    duplicatePage,
    deletePage,
    exportSelectedPages,
    canUndo,
    canRedo,
    undo,
    redo,
    resetCurrentPage,
    resetProject,
    addText,
    applyTextPreset,
    updateTextProps,
    uploadCustomFont,
    addImageFromFile,
    addBasicShape,
    updateShapeProps,
    setShapeImageFromFile,
    updateShapeImageProps,
    removeShapeImage,
    applyTwoColumnTemplate,
    applyDiagonalTemplate,
    applySplitTemplate,
    applyBentoTemplate,
    fillTemplateSlot,
    replaceActiveImageFromFile,
    cropModeActive,
    cropAspectRatio,
    toggleCropMode,
    setCropAspectRatio,
    exitCropMode,
    updateTemplateSlotCorner,
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
    getTouchHitKind,
    selectObjectAtClientPoint,
    cancelPointerAction,
    getActiveObjectId,
    restoreSelectionById,
    beginObjectPinch,
    updateObjectPinch,
    endObjectPinch,
    selectionBox,
    beginOverflowControlDrag,
    updateOverflowControlDrag,
    endOverflowControlDrag,
    textEditingState,
    applyEditingSelectionStyle,
    selectAllEditingText,
    exitTextEditing,
    exportImage,
    exportProjectJSON,
    importProjectJSON,
  } = useFabricCanvas({
    onRequestFillSlot: (slotId) => {
      pendingSlotIdRef.current = slotId;
      slotImageInputRef.current?.click();
    },
  });

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

  const triggerFillSlot = (slotId: string) => {
    pendingSlotIdRef.current = slotId;
    slotImageInputRef.current?.click();
  };

  const handleSlotImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const slotId = pendingSlotIdRef.current;
    pendingSlotIdRef.current = null;
    if (file && file.type.startsWith('image/') && slotId) {
      void fillTemplateSlot(slotId, file);
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
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          onAddImageFile={(file) => void addImageFromFile(file)}
          onApplyCutout={applyImageCutout}
          onUpdateImageProps={updateImageProps}
          onReplaceImage={(file) => void replaceActiveImageFromFile(file)}
        />
      );
    }
    if (activeTab === 'shapes') {
      return <ShapesTab onAddShape={addBasicShape} />;
    }
    if (activeTab === 'templates') {
      return (
        <TemplatesTab
          templateSlots={templateSlots}
          onApplyTwoColumnTemplate={applyTwoColumnTemplate}
          onApplyDiagonalTemplate={applyDiagonalTemplate}
          onApplySplitTemplate={applySplitTemplate}
          onApplyBentoTemplate={applyBentoTemplate}
          onTriggerFillSlot={triggerFillSlot}
          onSelectSlot={selectLayerById}
        />
      );
    }
    if (activeTab === 'background') {
      return (
        <BackgroundTab
          background={background}
          photoPalette={photoPalette}
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

  useEffect(() => {
    const handleWindowPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (textEditingState) return;
      const imageFile = extractImageFileFromClipboardData(e.clipboardData);
      if (imageFile) {
        e.preventDefault();
        void addImageFromFile(imageFile);
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [addImageFromFile, textEditingState]);

  const closeExportPreview = () => {
    setExportPreview((prev) => {
      if (prev?.blobUrl) {
        URL.revokeObjectURL(prev.blobUrl);
      }
      return null;
    });
  };

  const handleExportImage = async (format: ExportImageFormat = 'png') => {
    try {
      const preview = await exportImage(format);
      if (preview) {
        setExportPreview((prev) => {
          if (prev?.blobUrl) {
            URL.revokeObjectURL(prev.blobUrl);
          }
          return preview;
        });
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('Could not export this image. Please try again.');
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
        onExportImage={(format) => void handleExportImage(format)}
        onOpenExportPages={() => setShowExportPagesModal(true)}
        onAddPage={() => void addPage(true)}
        pageCount={pages.length}
        onExportProjectJSON={exportProjectJSON}
        onImportProjectJSON={(file) => {
          void importProjectJSON(file).catch((err) => {
            console.error('Import failed:', err);
            alert('Invalid template JSON file.');
          });
        }}
      />

      <input
        ref={quickImageInputRef}
        type="file"
        accept="image/*"
        onChange={handleQuickImageChange}
        className="hidden"
      />
      <input
        ref={slotImageInputRef}
        type="file"
        accept="image/*"
        onChange={handleSlotImageChange}
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
            onOpenPreview={() => setShowFullPreview(true)}
            onDeselectAll={() => {
              deselectAll();
              setMobileSheet((prev) => (prev === 'inspector' ? 'none' : prev));
            }}
            onDropImageFile={(file) => void addImageFromFile(file)}
            onAddText={() => void addText('heading')}
            onTriggerImageUpload={() => quickImageInputRef.current?.click()}
            onRecalculateOffset={recalculateOffset}
            onCanPanCanvasAt={canPanCanvasAt}
            onGetTouchHitKind={getTouchHitKind}
            onSelectObjectAtClientPoint={selectObjectAtClientPoint}
            onCancelPointerAction={cancelPointerAction}
            onGetActiveObjectId={getActiveObjectId}
            onRestoreSelectionById={restoreSelectionById}
            onBeginObjectPinch={beginObjectPinch}
            onUpdateObjectPinch={updateObjectPinch}
            onEndObjectPinch={endObjectPinch}
            selectionBox={selectionBox}
            onBeginOverflowControlDrag={beginOverflowControlDrag}
            onUpdateOverflowControlDrag={updateOverflowControlDrag}
            onEndOverflowControlDrag={endOverflowControlDrag}
            textEditingState={textEditingState}
            onApplyEditingStyle={applyEditingSelectionStyle}
            onSelectAllEditingText={selectAllEditingText}
            onExitTextEditing={exitTextEditing}
            selectedObjectLocked={selectedObject ? selectedObject.locked : null}
            onToggleLock={() => {
              if (selectedObject) {
                toggleLayerLock(selectedObject.id);
              }
            }}
            canCropSelectedImage={selectedObject?.kind === 'image'}
            cropModeActive={cropModeActive}
            cropAspectRatio={cropAspectRatio}
            onToggleCropMode={toggleCropMode}
            onChangeCropAspectRatio={setCropAspectRatio}
            onExitCropMode={exitCropMode}
          />

          <PageStrip
            pages={pages}
            activePageId={activePageId}
            onSelectPage={(id) => void selectPage(id)}
            onAddPage={() => void addPage(true)}
            onDuplicatePage={(id) => void duplicatePage(id)}
            onDeletePage={(id) => void deletePage(id)}
          />

          <div className={cn(hasMobileSheet ? 'hidden lg:contents' : 'shrink-0 lg:contents')}>
            <Toolbar
              selectedObject={selectedObject}
              onOpenMobileInspector={() => setMobileSheet('inspector')}
              onTriggerFillSlot={triggerFillSlot}
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
            className="lg:hidden w-full h-[32vh] max-h-[280px] shrink-0 border-t border-neutral-800 bg-[#0f0f0f] flex flex-col overflow-hidden z-20"
          >
            <div className="h-9 px-3 border-b border-neutral-800/80 flex items-center justify-between shrink-0">
              <span className="text-xs font-medium text-neutral-200">
                {activeTabLabel}
              </span>
              <div className="flex items-center gap-1">
                {selectedObject && (
                  <button
                    type="button"
                    onClick={() => setMobileSheet('inspector')}
                    aria-label="Layer properties"
                    title="Layer properties"
                    className="p-1.5 rounded-md bg-neutral-800 text-neutral-100"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMobileSheet('none')}
                  className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800"
                  aria-label="Close tool panel"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3">{renderTabContent()}</div>
          </section>
        )}

        {/* Right Contextual Inspector */}
        <Inspector
          selectedObject={selectedObject}
          availableFonts={availableFonts}
          photoPalette={photoPalette}
          aspectRatio={aspectRatio}
          background={background}
          layerCount={layers.length}
          mobileOpen={showMobileInspector}
          onCloseMobile={() => setMobileSheet('none')}
          onToggleLock={() => {
            if (selectedObject) {
              toggleLayerLock(selectedObject.id);
            }
          }}
          cropModeActive={cropModeActive}
          onToggleCropMode={toggleCropMode}
          onUpdateText={(patch) => void updateTextProps(patch)}
          onApplyTextPreset={(preset) => void applyTextPreset(preset)}
          onApplyCutout={applyImageCutout}
          onUpdateImageProps={updateImageProps}
          onReplaceImage={(file) => void replaceActiveImageFromFile(file)}
          onTriggerFillSlot={triggerFillSlot}
          onUpdateSlotCorner={updateTemplateSlotCorner}
          onUpdateShape={updateShapeProps}
          onSetShapeImage={(file) => void setShapeImageFromFile(file)}
          onUpdateShapeImage={updateShapeImageProps}
          onRemoveShapeImage={removeShapeImage}
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
        className="lg:hidden shrink-0 border-t border-neutral-800 bg-[#0f0f0f] px-2 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] flex items-center justify-around gap-1 z-30"
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
                'flex-1 min-h-[40px] py-1.5 rounded-lg flex items-center justify-center transition-colors',
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
            'relative flex-1 min-h-[40px] py-1.5 rounded-lg flex items-center justify-center transition-colors',
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
            className="w-full max-w-sm rounded-xl bg-[#141414] border border-neutral-800 p-4 flex flex-col gap-3"
          >
            <div>
              <h2 className="text-sm font-medium text-neutral-100">
                Clear or reset canvas?
              </h2>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Choose whether to clear only the current slide or reset all slides back to the starter template.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button
                id="confirm-clear-current-page"
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  resetCurrentPage();
                }}
                className="w-full py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-left transition-colors"
              >
                <div className="text-xs font-medium text-neutral-100">
                  Clear Current Slide
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  Removes all layers and background on this slide only (undoable).
                </div>
              </button>
              <button
                id="confirm-reset-project"
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  void resetProject();
                }}
                className="w-full py-2 px-3 rounded-lg bg-red-600/90 hover:bg-red-500 text-left transition-colors"
              >
                <div className="text-xs font-medium text-white">
                  Reset All Slides
                </div>
                <div className="text-[11px] text-red-100/80 mt-0.5">
                  Restores Slide 1 starter template and clears saved browser draft.
                </div>
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="w-full py-1.5 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-300 transition-colors mt-0.5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showExportPagesModal && (
        <ExportPagesModal
          isOpen={showExportPagesModal}
          pages={pages}
          activePageId={activePageId}
          onClose={() => setShowExportPagesModal(false)}
          onRenderSelectedPages={exportSelectedPages}
        />
      )}
      {showFullPreview && (
        <FullSizePreviewModal
          pages={pages}
          activePageId={activePageId}
          onClose={() => setShowFullPreview(false)}
          onRenderPages={exportSelectedPages}
        />
      )}
    </div>
  );
}

export default App;
