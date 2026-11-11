# Role & Objective
You are an expert Frontend Architect specializing in React, TypeScript, Tailwind CSS, and HTML5 Canvas engines (Fabric.js v6). Your task is to build a high-performance, responsive, client-side graphic editor that replicates the core UX of an Instagram Story editor. The app will be deployed as a static Single Page Application (SPA) on GitHub Pages with zero backend dependencies.

---

## 1. Tech Stack & Core Libraries
- **Framework:** React 19 / 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + Lucide React (for UI icons)
- **Canvas Engine:** Fabric.js (`fabric` v6.x)
- **Fonts:** Custom dynamic loader targeting **Fraunces**, **Fedro**, and modern sans-serif fallbacks
- **Deployment:** GitHub Pages via GitHub Actions

---

## 2. Target Deliverables & Feature Checklist

### A. Canvas Architecture & Viewport
- [ ] Native internal render resolution: Default to **1080 × 1920 px (9:16 aspect ratio)**.
- [ ] Viewport auto-scaling: Use CSS `transform: scale(...)` or container flex scaling to fit any window size while keeping the internal buffer at native 1080×1920 for export.
- [ ] Aspect ratio presets switcher:
  - 9:16 (Story: 1080 × 1920)
  - 1:1 (Square: 1080 × 1080)
  - 4:5 (Portrait: 1080 × 1350)
  - Dynamic canvas resizing via `canvas.setDimensions({ width, height })`.

### B. Background Layer System
- [ ] Toggle between **Solid Color / Gradient** and **Background Image**.
- [ ] Color picker for solid background canvas color (`canvas.backgroundColor`).
- [ ] Background image upload via file input:
  - Center and scale to fill/fit (`canvas.backgroundImage`).
  - Controls to adjust background image scale (zoom) and position offset (pan X / pan Y).

### C. Advanced Text Engine (Instagram-Style)
- [ ] Add editable text using `fabric.Textbox` (supports auto-wrapping and draggable width anchors).
- [ ] Font customization:
  - Prioritized fonts: **Fraunces** and **Fedro** (with fallbacks: Inter, Montserrat).
  - Font size (numeric input + slider).
  - Font weight (400, 600, 700, 900).
  - Italic, Underline, Strikethrough toggles.
  - Text alignment: Left, Center, Right, Justify.
  - Text color (Hex picker + quick preset palette).
  - Spacing controls: Line-height (`lineHeight`) and Letter-spacing (`charSpacing`).
- [ ] **Instagram Pill / Line Background:**
  - Standard solid text highlight or custom rounded line backgrounds behind each active line of text.

### D. Image Layer & Cutout / Masking
- [ ] File upload (drag-and-drop or file picker) inserted as `fabric.FabricImage`.
- [ ] Full transform handles: drag, scale, rotate, flip horizontal/vertical.
- [ ] Image aspect ratio / shape masking:
  - Shape cutouts via Fabric `clipPath`: Circle, Square, Rounded Rectangle (Squircle), Star/Heart (SVG path).
  - Ability to reset/remove clip path.

### E. Layering & Object Controls
- [ ] Bring Forward, Send Backward, Bring to Front, Send to Back.
- [ ] Duplicate active object.
- [ ] Delete active object (Delete / Backspace hotkeys support).
- [ ] Deselect on outside canvas click.

### F. High-Resolution Export
- [ ] Deselect active objects to remove bounding boxes before export.
- [ ] Export directly to native resolution PNG (`canvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 })`).
- [ ] Programmatic auto-download (`story-[timestamp].png`).

---

## 3. Recommended Project Structure

```text
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Pages auto-deploy
├── public/
├── src/
│   ├── components/
│   │   ├── CanvasViewport.tsx   # Canvas wrapper with auto-scale logic
│   │   ├── Header.tsx           # Export, undo/redo, aspect ratio picker
│   │   ├── Sidebar/
│   │   │   ├── BackgroundTab.tsx# BG color / image controls
│   │   │   ├── ImageTab.tsx     # Add image, cutout/clip presets
│   │   │   ├── LayersTab.tsx    # Layer ordering & selection
│   │   │   └── TextTab.tsx      # Font, color, style, spacing controls
│   │   └── Toolbar.tsx          # Floating or dock quick actions
│   ├── hooks/
│   │   ├── useFabricCanvas.ts   # Fabric instance initialization & event sync
│   │   └── useWindowSize.ts     # Viewport calculation for CSS scale
│   ├── types/
│   │   └── editor.ts            # Aspect ratio types, layer models
│   ├── utils/
│   │   ├── fonts.ts             # Fraunces, Fedro & Google Fonts loader helper
│   │   └── imageCutouts.ts      # Predefined fabric clip paths (Circle, Rect)
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 4. Key Implementation Details & Code Blueprints

### A. Font Integration (`fonts.ts`)
Integrate dynamic font loading with priority support for **Fraunces** and **Fedro**, ensuring font glyphs are loaded via the `FontFace` API before Fabric recalculates bounding boxes and renders.

```typescript
export interface FontOption {
  name: string;
  family: string;
  source: 'google' | 'custom';
  url?: string;
}

export const SUPPORTED_FONTS: FontOption[] = [
  {
    name: 'Fraunces',
    family: 'Fraunces',
    source: 'google',
    url: '[https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&display=swap](https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&display=swap)',
  },
  {
    name: 'Fedro',
    family: 'Fedro',
    source: 'custom',
    url: '[https://fonts.cdnfonts.com/css/fedro](https://fonts.cdnfonts.com/css/fedro)',
  },
  {
    name: 'Inter',
    family: 'Inter',
    source: 'google',
    url: '[https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap](https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap)',
  },
  {
    name: 'Montserrat',
    family: 'Montserrat',
    source: 'google',
    url: '[https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,700;0,900;1,400&display=swap](https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,700;0,900;1,400&display=swap)',
  },
];

export const loadFont = async (font: FontOption): Promise<void> => {
  if (font.url && !document.querySelector(`link[href="${font.url}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = font.url;
    document.head.appendChild(link);
  }

  if ('fonts' in document) {
    await document.fonts.load(`16px "${font.family}"`);
  }
};
```

---

### B. Viewport Auto-Scaling Math (`CanvasViewport.tsx`)
Keep the canvas internal state at native $1080 \times 1920$ px, but calculate an optimal CSS `scale` factor based on container dimensions so it fits without scrolling:

```tsx
const calculateScale = (
  containerWidth: number,
  containerHeight: number,
  canvasWidth: number,
  canvasHeight: number
) => {
  const padding = 40;
  const availableWidth = containerWidth - padding;
  const availableHeight = containerHeight - padding;
  return Math.min(availableWidth / canvasWidth, availableHeight / canvasHeight, 1);
};
```

---

### C. Fabric React Bridge Rule
Never store the raw `fabric.Canvas` instance directly in React `useState`. Store it in a `useRef<fabric.Canvas | null>(null)` to prevent re-render thrashing during continuous drag/scale events. Only sync high-level active object state to React for driving the inspector panel:

```tsx
canvas.on('selection:created', (e) => setSelectedObject(e.selected?.[0] || null));
canvas.on('selection:updated', (e) => setSelectedObject(e.selected?.[0] || null));
canvas.on('selection:cleared', () => setSelectedObject(null));
```

---

### D. Image Cutout / Masking Logic (`imageCutouts.ts`)

```typescript
import * as fabric from 'fabric';

export const applyCircleMask = (image: fabric.FabricImage) => {
  const radius = Math.min(image.width, image.height) / 2;
  const circle = new fabric.Circle({
    radius,
    originX: 'center',
    originY: 'center',
  });
  image.clipPath = circle;
  image.dirty = true;
};

export const applyRoundedRectMask = (image: fabric.FabricImage, cornerRadius = 60) => {
  const rect = new fabric.Rect({
    width: image.width,
    height: image.height,
    rx: cornerRadius,
    ry: cornerRadius,
    originX: 'center',
    originY: 'center',
  });
  image.clipPath = rect;
  image.dirty = true;
};
```

---

### E. Clean PNG Export Pipeline

```typescript
export const exportCanvasToPNG = (canvas: fabric.Canvas, filename = 'story.png') => {
  canvas.discardActiveObject();
  canvas.renderAll();

  const dataURL = canvas.toDataURL({
    format: 'png',
    multiplier: 1, // Native resolution export
    quality: 1,
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
```

---

## 5. GitHub Pages Deployment Configuration

### `vite.config.ts`
Set the base URL relative so it functions properly under GitHub Pages subpath routing:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Use relative base for sub-path routing on GitHub Pages
  base: './',
});
```

### `.github/workflows/deploy.yml`

```yaml
name: Deploy Story Editor to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Build Application
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload Artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## 6. Execution Instructions for the Agent
1. Scaffold the project using Vite with the `react-ts` template.
2. Install dependencies: `fabric@^6.0.0`, `lucide-react`, `clsx`, `tailwind-merge`, and configure Tailwind CSS.
3. Preload the **Fraunces** and **Fedro** font configurations in `fonts.ts` so they appear at the top of the typography selector.
4. Build the core `useFabricCanvas` hook and test the native 1080×1920 scaling logic inside the viewport.
5. Construct the UI panels:
   - **Header:** Aspect Ratio Switcher (Story, Square, Portrait), Undo/Redo, Export PNG.
   - **Left Sidebar / Drawer:** Add Text, Add Image (Upload + Crop), Canvas Background (Color Picker vs. Image).
   - **Right Inspector:** Contextual controls for active selection (Typography with Fraunces & Fedro, Colors, Spacing, Layer Ordering, Transform reset).
6. Verify production build passes cleanly (`npm run build`) and generates all output inside `dist/`.