# Zoom Feature Implementation

## Overview

Added comprehensive zoom and pan functionality to the sheet preview, enabling detailed inspection of the generated layout at up to 500% magnification.

## Features

### 1. Mouse Wheel Zoom

- Zoom in/out using the mouse wheel (or trackpad scroll)
- **Zoom is precisely centered on the cursor position** - the point under your mouse stays stationary while zooming
- Smooth, continuous zoom with delta-based scaling
- Prevents page scroll when zooming
- Uses accurate canvas coordinate transformation for perfect centering

### 2. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd +` or `Ctrl/Cmd =` | Zoom in by 10% |
| `Ctrl/Cmd -` | Zoom out by 10% |
| `Ctrl/Cmd 0` | Reset zoom to 100% and center |

### 3. Click and Drag Panning

- Click and hold to pan around the zoomed preview
- Cursor changes to "grab" when idle, "grabbing" when panning
- Works at any zoom level
- Smooth, responsive panning

### 4. UI Controls

- **Zoom In button** (+) - Increase zoom by 10% towards center
- **Zoom percentage display** - Shows current zoom level, click to reset
- **Zoom Out button** (-) - Decrease zoom by 10% from center
- **Fit to Screen button** - Auto-zoom to fit entire canvas with padding
- Positioned in top-right corner of preview
- Always visible, floating above content

### 5. Help Overlay

- Bottom-left corner shows keyboard/mouse shortcuts
- Semi-transparent background for visibility
- Non-intrusive but easily discoverable
- Includes fit-to-screen hint

### 6. Auto Fit on Load

- When preview first loads, automatically fits to screen with 10% padding
- Ensures entire sheet is visible without manual adjustment
- Triggers after canvas is fully rendered (50ms delay)

## Technical Implementation

### State Management

```typescript
// Zoom state (Svelte 5 runes)
let zoom = $state(1);           // Current zoom level (1.0 = 100%)
let panX = $state(0);           // Pan offset X in pixels
let panY = $state(0);           // Pan offset Y in pixels
let isPanning = $state(false);  // Is user currently panning?
```

### Transform Approach

Uses CSS transforms for GPU-accelerated, smooth zooming:

```svelte
<div
  style="transform: translate({panX}px, {panY}px) scale({zoom}); 
         transform-origin: top left;"
>
  <canvas bind:this={canvas} />
</div>
```

**Why CSS transforms?**
- GPU-accelerated (no repaint/reflow)
- Smooth 60fps performance
- Works with any canvas size
- No re-rendering of canvas content

### Zoom Constants

```typescript
const MIN_ZOOM = 0.1;    // 10% minimum
const MAX_ZOOM = 5;      // 500% maximum
const ZOOM_STEP = 0.1;   // 10% increments for keyboard/buttons
```

### Mouse Wheel Zoom Algorithm (Fixed for Accurate Centering)

```typescript
function handleWheel(e: WheelEvent) {
  e.preventDefault();
  
  const containerRect = containerRef.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  
  // Mouse position relative to container
  const mouseX = e.clientX - containerRect.left;
  const mouseY = e.clientY - containerRect.top;
  
  // Canvas position relative to container (accounting for current transform)
  const canvasLeft = canvasRect.left - containerRect.left;
  const canvasTop = canvasRect.top - containerRect.top;
  
  // Point on canvas before zoom (in canvas coordinate space)
  const canvasPointX = (mouseX - canvasLeft) / zoom;
  const canvasPointY = (mouseY - canvasTop) / zoom;
  
  // Calculate new zoom level
  const delta = -e.deltaY * 0.001;
  const newZoom = clamp(zoom + delta, MIN_ZOOM, MAX_ZOOM);
  
  // Calculate new pan to keep the point under the mouse stationary
  panX = mouseX - canvasPointX * newZoom;
  panY = mouseY - canvasPointY * newZoom;
  zoom = newZoom;
}
```

**Key improvement**: Converts mouse position to canvas coordinate space before applying zoom, ensuring the point under the cursor stays perfectly stationary. This fixes issues where zoom would drift away from the cursor position.

### Fit to Screen Algorithm

```typescript
function fitToScreen() {
  const containerRect = containerRef.getBoundingClientRect();
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  // Add 10% padding on each side
  const padding = 0.9;
  const containerWidth = containerRect.width * padding;
  const containerHeight = containerRect.height * padding;
  
  // Calculate scale to fit (maintain aspect ratio)
  const scaleX = containerWidth / canvasWidth;
  const scaleY = containerHeight / canvasHeight;
  const newZoom = Math.min(scaleX, scaleY);
  
  // Center the canvas in the container
  const scaledWidth = canvasWidth * newZoom;
  const scaledHeight = canvasHeight * newZoom;
  panX = (containerRect.width - scaledWidth) / 2;
  panY = (containerRect.height - scaledHeight) / 2;
  zoom = clamp(newZoom, MIN_ZOOM, MAX_ZOOM);
}
```

## UI Components

### Zoom Control Panel

Located in top-right corner:

```svelte
<div class="absolute top-4 right-4 z-20">
  <button>➕ Zoom In</button>
  <button>100% Reset</button>
  <button>➖ Zoom Out</button>
  <button>⛶ Fit to Screen</button>
</div>
```

### Help Overlay

Located in bottom-left corner:

```svelte
<div class="absolute bottom-4 left-4 z-20 bg-white/90">
  <p><strong>Zoom:</strong> Mouse wheel or Ctrl/Cmd +/-</p>
  <p><strong>Pan:</strong> Click and drag</p>
  <p><strong>Fit:</strong> Click fit button or reload preview</p>
</div>
```

## Browser Compatibility

- **Mouse wheel**: All modern browsers
- **Keyboard shortcuts**: All modern browsers (Ctrl on Windows/Linux, Cmd on Mac)
- **CSS transforms**: All browsers supporting Svelte 5
- **Pinch-to-zoom**: Not yet implemented (touch events)

## Performance

- **Zero impact on canvas rendering** - Zoom is pure CSS transform
- **No re-renders** - Canvas content unchanged during zoom/pan
- **GPU-accelerated** - Smooth 60fps on all devices
- **Minimal state** - Only 3 reactive variables (zoom, panX, panY)

## User Experience

### Visual Feedback

- Cursor changes: `grab` → `grabbing` during pan
- Zoom percentage displayed in real-time
- Smooth transitions on canvas opacity during updates
- No jarring jumps or layout shifts
- **Accurate zoom centering** - point under cursor stays stationary
- Auto-fit on load provides immediate context

### Accessibility

- All features keyboard-accessible
- Focus management for tab navigation
- ARIA labels on interactive elements
- Visual help text always visible

## Future Enhancements

- **Touch gestures** - Pinch-to-zoom for mobile/tablet
- **Minimap** - Show zoomed area in context
- **Zoom presets** - Quick buttons for 50%, 100%, 200%
- **Pan limits** - Prevent panning too far off-canvas
- **Mouse button customization** - Middle-click pan, etc.
- **Smooth zoom animations** - Animated transitions for button clicks
- **Keyboard panning** - Arrow keys to pan viewport

## Integration with Preview Optimization

The zoom feature complements the preview optimization:

1. **Direct canvas rendering** - Fast enough for real-time zoom
2. **No re-rendering needed** - CSS transform is instant
3. **Template caching** - Zoom doesn't trigger re-renders
4. **Smooth UX** - Previous preview visible while zooming

Combined, these features provide a professional, responsive preview experience comparable to design tools like Figma or Canva.

## Files Modified

- `src/lib/components/editor/SheetPreview.svelte` - Added zoom/pan logic and UI
- `AGENT.md` - Added zoom functionality rules (section 12)
- `PREVIEW_OPTIMIZATION.md` - Documented zoom integration

## Testing Checklist

- [x] Mouse wheel zoom in/out
- [x] **Zoom precisely centered on cursor position**
- [x] Keyboard shortcuts (Ctrl/Cmd +/-/0)
- [x] Click and drag panning
- [x] UI zoom buttons work (center-based)
- [x] Zoom percentage display updates
- [x] Reset zoom returns to 100% centered
- [x] **Fit to screen button works**
- [x] **Auto-fit on initial load**
- [x] Min/max zoom limits enforced
- [x] Cursor changes during pan
- [x] Help overlay visible with fit hint
- [x] Works with preview updates
- [x] No performance degradation
- [x] Zoom centering uses accurate coordinate transformation