import { useRef, useState, type ChangeEvent } from 'react';
import {
  Image as ImageIcon,
  Layers,
  Palette,
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
    addText,
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
          onAddText={(preset) => void addText(preset)}
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

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0a0a0a] text-neutral-200 overflow-hidden">
      <Header
        aspectRatio={aspectRatio}
        onAspectRatioChange={(ratio) => void setAspectRatio(ratio)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => void undo()}
        onRedo={() => void redo()}
        onExportPNG={() => void exportPNG()}
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
            className="w-14 shrink-0 border-r border-neutral-800/80 py-2.5 px-1.5 flex flex-col items-center gap-1"
          >
            {SIDEBAR_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full py-2 rounded-md flex flex-col items-center justify-center gap-1 transition-colors',
                    active
                      ? 'bg-neutral-800 text-neutral-100'
                      : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900'
                  )}
                >
                  <Icon className="w-4 h-4 stroke-[1.75]" />
                  <span className="text-[10px] font-medium">{tab.label}</span>
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
              onAddText={() => void addText('headline')}
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
            className="lg:hidden w-full h-[38vh] max-h-[340px] shrink-0 border-t border-neutral-800 bg-[#0f0f0f] flex flex-col overflow-hidden z-20"
          >
            <div className="h-9 px-3.5 border-b border-neutral-800/80 flex items-center justify-between shrink-0">
              <span className="text-xs font-medium text-neutral-300">
                {activeTabLabel}
              </span>
              <div className="flex items-center gap-1.5">
                {selectedObject && (
                  <button
                    type="button"
                    onClick={() => setMobileSheet('inspector')}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-neutral-800 text-neutral-100 text-xs font-medium"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Properties</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMobileSheet('none')}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800"
                  aria-label="Close tool panel"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Done</span>
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3.5">{renderTabContent()}</div>
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
        className="lg:hidden shrink-0 border-t border-neutral-800 bg-[#0f0f0f] px-2 pt-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] flex items-center justify-around gap-1 z-30"
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
              className={cn(
                'flex-1 py-1.5 rounded-md flex flex-col items-center justify-center gap-0.5 transition-colors',
                active
                  ? 'bg-neutral-800 text-neutral-100'
                  : 'text-neutral-500 hover:text-neutral-200'
              )}
            >
              <Icon className="w-4 h-4 stroke-[1.75]" />
              <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
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
          title={selectedObject ? 'Edit selected layer properties' : 'Select a layer to edit'}
          className={cn(
            'relative flex-1 py-1.5 rounded-md flex flex-col items-center justify-center gap-0.5 transition-colors',
            !selectedObject
              ? 'text-neutral-700 cursor-not-allowed'
              : showMobileInspector
                ? 'bg-neutral-100 text-neutral-950'
                : 'text-neutral-300 bg-neutral-900 hover:bg-neutral-800'
          )}
        >
          <SlidersHorizontal className="w-4 h-4 stroke-[1.75]" />
          <span className="text-[10px] font-medium leading-tight">Edit</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
