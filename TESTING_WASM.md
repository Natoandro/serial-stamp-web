# Testing Guide: WASM-Based Rendering

## Quick Test Checklist

After implementing WASM-based rendering, verify the following:

### 1. Basic Preview Generation ✓

**Test:** Load a project with a template image and navigate to the sheet preview page.

**Expected:**
- Preview loads within 1-2 seconds
- No JavaScript errors in console
- Image displays correctly
- White background with tickets arranged in grid

**How to test:**
1. Create a new project
2. Upload a template image
3. Add at least one data source (e.g., Sequential 1-10)
4. Navigate to "Sheet Layout" page
5. Preview should appear automatically

### 2. QR Code Rendering ✓

**Test:** Add a QR code stamp and verify it renders.

**Expected:**
- QR code appears as black/white modules
- Code is scannable (test with phone)
- Scales correctly to specified dimensions

**How to test:**
1. Open ticket editor
2. Add QR code stamp with template `{{number}}`
3. Set size to 50×50px
4. Navigate to sheet preview
5. QR codes should be visible on tickets

### 3. Text Stamps (Placeholder) 🚧

**Test:** Add a text stamp.

**Expected:**
- Bounding box outline appears at correct position
- No crash or error
- (Full text rendering coming in next iteration)

**How to test:**
1. Add text stamp with template `Ticket #{{number}}`
2. Sheet preview should show outline boxes where text will appear

### 4. Barcode Stamps (Placeholder) 🚧

**Test:** Add a barcode stamp.

**Expected:**
- Simple bar pattern appears at correct position
- No crash or error
- (Full barcode generation coming in next iteration)

**How to test:**
1. Add barcode stamp (Code128) with template `{{number}}`
2. Sheet preview should show striped placeholder pattern

### 5. Real-Time Preview Updates ✓

**Test:** Change form values and observe preview updates.

**Expected:**
- Preview regenerates automatically
- Update completes in < 100ms (check console timing)
- No lag or freezing

**How to test:**
1. Open Sheet Layout page
2. Change grid rows/cols
3. Change margins
4. Change spacing
5. Preview should update immediately for each change

### 6. Large Sheets (Performance Test) ✓

**Test:** Create a large grid (e.g., 10×10 = 100 tickets).

**Expected:**
- Preview still generates in < 500ms
- No browser freezing
- Smooth scrolling/zooming

**How to test:**
1. Set grid to 10 rows × 10 cols
2. Ensure you have 100+ data records
3. Monitor performance in browser DevTools

### 7. Different Paper Sizes ✓

**Test:** Try various paper sizes and orientations.

**Expected:**
- A4 portrait (210×297mm)
- A4 landscape (297×210mm)
- Letter (216×279mm)
- Custom sizes
- All render without dimension errors

**How to test:**
1. Change paper size in sheet layout form
2. Toggle orientation
3. Preview should recalculate and display correctly

### 8. Zero Margins ✓

**Test:** Set all margins to 0.

**Expected:**
- Tickets start at edge (0,0)
- No automatic padding added
- First ticket should touch top-left corner

**How to test:**
1. Set all margins (top, right, bottom, left) to 0
2. Preview should show tickets flush with edges

### 9. Aspect Ratio Preservation ✓

**Test:** Use template image with extreme aspect ratio (e.g., 1000×100px banner).

**Expected:**
- Template scales uniformly (no distortion)
- Fits within target cell dimensions
- Maintains original proportions

**How to test:**
1. Upload a wide/tall template image
2. Set small ticket dimensions
3. Template should scale down without stretching

### 10. Error Handling ✓

**Test:** Trigger various error conditions.

**Expected errors and messages:**

#### Missing Template
- Remove template image → "No template image available"

#### Invalid Grid
- Set rows=0 or cols=0 → "Invalid grid layout"

#### Dimension Mismatch
- (This should never happen now, but if it does):
  - Error message shows expected vs actual dimensions
  - Indicates calculation mismatch

**How to test:**
1. Try creating preview without template
2. Try invalid grid configurations
3. Verify error messages are user-friendly

---

## Performance Benchmarks

### Expected Timings (A4, 5×8 grid, 40 tickets)

| Operation | Target Time | Notes |
|-----------|-------------|-------|
| WASM initialization | < 100ms | Only on first call |
| Template conversion | < 50ms | Blob → RGBA |
| WASM render | < 50ms | Main rendering |
| Canvas display | < 20ms | ImageData → canvas |
| **Total** | **< 200ms** | End-to-end |

### Measuring Performance

Add this to your component for timing:

```javascript
console.time('preview-generation');
const dataUrl = await generateWasmPreview(project, layout);
console.timeEnd('preview-generation');
```

Or use browser DevTools Performance tab.

---

## Known Limitations (Current Implementation)

### Text Rendering
- ❌ Shows bounding box only (no actual text)
- ✅ Position and size are correct
- 🔄 **Next:** Implement font rasterization

### Barcodes
- ❌ Shows striped placeholder pattern
- ✅ Position and size are correct
- 🔄 **Next:** Implement barcode encoders

### Multi-Page
- ❌ Only renders first page
- 🔄 **Next:** Add pagination support

---

## Browser Compatibility

### Tested Browsers
- ✅ Chrome 120+ (full support)
- ✅ Firefox 120+ (full support)
- ✅ Safari 17+ (full support)
- ⚠️ Edge 120+ (should work, not tested)

### Required Features
- WebAssembly (all modern browsers)
- OffscreenCanvas (all modern browsers)
- ImageData (all browsers)

---

## Debugging Tips

### Console Errors

#### "Invalid config JSON"
- Check that all layout values are valid numbers
- Ensure paper size object has `widthMm` and `heightMm`

#### "Failed to create template image from raw data"
- Template data length doesn't match width × height × 4
- Check template conversion step

#### "IndexSizeError: input data length not equal to (4 * width * height)"
- Dimension calculation mismatch between TS and Rust
- Verify both use `.round()` consistently
- See WASM_RENDERING.md troubleshooting section

### Performance Issues

#### Preview takes > 1 second
- Check if WASM is being reinitialized (should be lazy-loaded once)
- Profile with browser DevTools
- Check for memory leaks (recreating large arrays)

#### Browser freezes
- Ensure WASM is returning data correctly
- Check for infinite loops in reactive effects
- Consider debouncing form updates

### Memory Issues

#### "Out of memory" errors
- Very large images (> 10MB template)
- Very high DPI (> 600)
- Very large grids (> 200 tickets)

**Solutions:**
- Reduce template image size before upload
- Lower preview DPI (use 150 instead of 300)
- Limit grid size or paginate

---

## Regression Testing

Before committing changes to WASM code:

1. ✅ Run `cd src-wasm && cargo check`
2. ✅ Run `pnpm run build:wasm`
3. ✅ Run `pnpm run check` (TypeScript)
4. ✅ Test basic preview generation
5. ✅ Test QR code rendering
6. ✅ Test real-time updates
7. ✅ Test zero margins
8. ✅ Test different paper sizes

---

## Next Steps After Testing

Once basic rendering is confirmed working:

### Phase 1: Complete Rendering
1. Implement text rendering with fonts
2. Implement full barcode generation
3. Add progress indicators for large sheets

### Phase 2: Polish
1. Add debounced preview updates (200ms delay)
2. Add "Generating preview..." loading state
3. Optimize memory usage
4. Add retry logic for failed renders

### Phase 3: Advanced Features
1. Multi-page preview
2. PDF export using same WASM pipeline
3. Download preview as PNG
4. Print-ready CMYK support

---

## Questions to Answer During Testing

- [ ] Is the preview fast enough for real-time updates?
- [ ] Are QR codes scannable?
- [ ] Do zero margins actually produce zero margins?
- [ ] Does uniform scaling work correctly for all aspect ratios?
- [ ] Are there any memory leaks over time?
- [ ] Does it work on all target browsers?
- [ ] Are error messages helpful?
- [ ] Can users understand what placeholders mean?

---

## Reporting Issues

If you find bugs, include:

1. Browser and version
2. Project configuration (paper size, grid, margins)
3. Template image dimensions
4. Console errors (full stack trace)
5. Expected vs actual behavior
6. Steps to reproduce

File issues in the project repository with label `wasm-rendering`.