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
    <div className="fixed inset-0 flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      <Header
        aspectRatio={aspectRatio}
        onAspectRatioChange={(ratio) => void setAspectRatio(ratio)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => void undo()}
        onRedo={() => void redo()}
        onExportPNG={exportPNG}
      />

      <input
        ref={quickImageInputRef}
        type="file"
        accept="image/*"
        onChange={handleQuickImageChange}
        className="hidden"
      />

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Desktop Left Navigation Rail + Tab Drawer */}
        <div className="hidden lg:flex shrink-0 border-r border-zinc-800/80 bg-zinc-950 z-20">
          <nav
            aria-label="Desktop editor tools"
            className="w-16 shrink-0 border-r border-zinc-800/70 py-3 flex flex-col items-center gap-1.5"
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
                    'w-12 py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all',
                    active
                      ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40'
                      : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="w-72 p-4 overflow-y-auto bg-zinc-950/95">
            {renderTabContent()}
          </div>
        </div>

        {/* Central Auto-Scaled Viewport */}
        <main className="relative flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          <CanvasViewport
            canvasElRef={canvasElRef}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            showSafeArea={showSafeArea}
            onToggleSafeArea={toggleSafeArea}
            onDeselectAll={() => {
              deselectAll();
              setMobileSheet((prev) => (prev === 'inspector' ? 'none' : prev));
            }}
            onDropImageFile={(file) => void addImageFromFile(file)}
            onRecalculateOffset={recalculateOffset}
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

        {/* Mobile / Tablet In-Flow Tool Sheet (keeps canvas preview visible above) */}
        {showMobileToolSheet && (
          <section
            aria-label={`${activeTabLabel} panel`}
            className="lg:hidden w-full h-[38vh] max-h-[340px] shrink-0 border-t border-zinc-800/80 bg-zinc-950/95 flex flex-col overflow-hidden z-20"
          >
            <div className="h-10 px-4 border-b border-zinc-800/70 flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {activeTabLabel}
              </span>
              <div className="flex items-center gap-2">
                {selectedObject && (
                  <button
                    type="button"
                    onClick={() => setMobileSheet('inspector')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/40 text-xs font-medium"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Edit Style</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMobileSheet('none')}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700"
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

        {/* Right Contextual Inspector (Desktop sidebar / Mobile bottom sheet) */}
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
          onUpdateCommon={updateActiveCommonProps}
          onBringForward={bringForward}
          onSendBackward={sendBackward}
          onBringToFront={bringToFront}
          onSendToBack={sendToBack}
          onDuplicate={() => void duplicateActiveObject()}
          onDelete={handleDeleteActiveObject}
        />
      </div>

      {/* Mobile / Tablet Bottom Navigation Dock (respects iOS safe-area-inset-bottom) */}
      <nav
        aria-label="Mobile editor tools"
        className="lg:hidden shrink-0 border-t border-zinc-800/90 bg-zinc-950/95 backdrop-blur-md px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around gap-1 z-30"
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
                'flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all',
                active
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              )}
            >
              <Icon className="w-4 h-4" />
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
            'relative flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all border',
            !selectedObject
              ? 'text-zinc-600 border-transparent opacity-50 cursor-not-allowed'
              : showMobileInspector
                ? 'bg-violet-600 text-white border-violet-400/50'
                : 'text-violet-300 bg-violet-600/10 border-violet-500/30 hover:bg-violet-600/20'
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="text-[10px] font-medium leading-tight">Edit</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
