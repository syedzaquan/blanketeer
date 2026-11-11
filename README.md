# Blanketeer — Story & Graphic Editor

Client-side Instagram Story & graphic editor built with React, TypeScript, Tailwind CSS, and Fabric.js v6, deployable as a static SPA to GitHub Pages.

## Features

- **Multi-Format Canvas:** Native `1080 × 1920` (`9:16` Story), `1080 × 1080` (`1:1` Square), and `1080 × 1350` (`4:5` Portrait) with CSS-scaled responsive viewport.
- **Background Studio:** Solid colors, dual-stop linear gradients with angle control, and background image upload with fill/fit, zoom, and pan controls.
- **Instagram-Style Typography:** Editable `StoryTextbox` layers with bundled **Fraunces** (variable `100–900` weight & italic) and **Fedro** (`300–900` normal & italic), plus **Federo**, **Inter**, **Montserrat**, custom local font upload (`.ttf`/`.otf`/`.woff`/`.woff2`), line height, letter spacing, and **IG Pill** rounded per-line highlights.
- **Image Layers & Shape Cutouts:** Upload or drag-and-drop images with `Circle`, `Square`, `Squircle`, `Star`, and `Heart` clip-path masks, plus flip, rotation, and opacity controls.
- **Layers & History:** Layer stack panel with visibility/lock/ordering, 40-step Undo/Redo, keyboard shortcuts, and native-resolution PNG export.

## Local Development & Mobile QR Testing

```bash
npm install
npm run dev
```

`npm run dev` binds to your local network (`vite --host`) and prints both the `Local` URL (`http://localhost:5173/`) and the `Network` URL along with a scannable QR code in the terminal. Make sure your phone and computer are on the same Wi-Fi network, then scan the QR code with your phone camera.

## Production Build

```bash
npm run lint
npm run build
```
