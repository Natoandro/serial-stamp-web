// Font loading and caching service

import { AVAILABLE_FONTS } from '$lib/types';

// Cache for loaded font data
const fontCache = new Map<string, ArrayBuffer>();

/**
 * Load a font file and return its bytes as ArrayBuffer
 */
export async function loadFont(fontName: string): Promise<ArrayBuffer> {
	// Check cache first
	if (fontCache.has(fontName)) {
		return fontCache.get(fontName)!;
	}

	// Find font definition
	const fontDef = AVAILABLE_FONTS.find((f) => f.name === fontName);
	if (!fontDef) {
		throw new Error(`Font not found: ${fontName}`);
	}

	// Fetch font file
	const response = await fetch(fontDef.url);
	if (!response.ok) {
		throw new Error(`Failed to load font ${fontName}: ${response.statusText}`);
	}

	const fontData = await response.arrayBuffer();

	// Cache for future use
	fontCache.set(fontName, fontData);

	return fontData;
}

/**
 * Preload all fonts to cache them
 */
export async function preloadAllFonts(): Promise<void> {
	await Promise.all(AVAILABLE_FONTS.map((font) => loadFont(font.name)));
}

/**
 * Get font data from cache (synchronous, returns null if not cached)
 */
export function getCachedFont(fontName: string): ArrayBuffer | null {
	return fontCache.get(fontName) || null;
}

/**
 * Clear font cache
 */
export function clearFontCache(): void {
	fontCache.clear();
}
