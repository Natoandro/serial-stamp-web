import bwipjs from 'bwip-js';
import type { BarcodeFormat } from '$lib/types';

export interface BarcodeOptions {
	text: string;
	format: BarcodeFormat;
	width: number;
	height: number;
	includeText?: boolean;
	scale?: number;
}

/**
 * Generates a barcode using bwip-js and returns it as a canvas element.
 */
export async function generateBarcode(options: BarcodeOptions): Promise<HTMLCanvasElement> {
	const canvas = document.createElement('canvas');

	try {
		// bwip-js options:
		// bcid: Barcode type
		// text: Text to encode
		// scale: Scaling factor (higher = better quality)
		// height: Height of the barcode in millimeters (if scale is 1)
		// includetext: Whether to show the human-readable text below
		bwipjs.toCanvas(canvas, {
			bcid: options.format,
			text: options.text,
			scale: options.scale ?? 2,
			height: options.height / (options.scale ?? 2),
			includetext: options.includeText ?? false,
			textxalign: 'center',
			textsize: 10
		});

		return canvas;
	} catch (error) {
		console.error('Failed to generate barcode:', error);
		throw error;
	}
}

/**
 * Generates a barcode and returns it as a Data URL.
 */
export async function generateBarcodeDataUrl(options: BarcodeOptions): Promise<string> {
	const canvas = await generateBarcode(options);
	return canvas.toDataURL('image/png');
}
