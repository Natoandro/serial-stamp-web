import QRCode from 'qrcode';
import type { QrErrorCorrection } from '$lib/types';

export interface QrOptions {
	text: string;
	errorCorrection?: QrErrorCorrection;
	margin?: number;
	width?: number;
	color?: {
		dark: string;
		light: string;
	};
}

/**
 * Generates a QR code using the qrcode package and returns it as a canvas element.
 */
export async function generateQrCode(options: QrOptions): Promise<HTMLCanvasElement> {
	const canvas = document.createElement('canvas');

	try {
		await QRCode.toCanvas(canvas, options.text, {
			errorCorrectionLevel: options.errorCorrection || 'M',
			margin: options.margin ?? 2,
			width: options.width,
			color: options.color
		});

		return canvas;
	} catch (error) {
		console.error('Failed to generate QR code:', error);
		throw error;
	}
}

/**
 * Generates a QR code and returns it as a Data URL.
 */
export async function generateQrCodeDataUrl(options: QrOptions): Promise<string> {
	try {
		return await QRCode.toDataURL(options.text, {
			errorCorrectionLevel: options.errorCorrection || 'M',
			margin: options.margin ?? 2,
			width: options.width,
			color: options.color
		});
	} catch (error) {
		console.error('Failed to generate QR code data URL:', error);
		throw error;
	}
}
