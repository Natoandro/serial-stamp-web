import type { Stamp, TextStamp, BarcodeStamp, QrCodeStamp, DataSource } from '$lib/types';
import { resolveTemplate } from '$lib/engine/template';
import { generateBarcode } from '$lib/services/barcode';
import { generateQrCode } from '$lib/services/qrcode';

export interface TicketRendererOptions {
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	templateImage: ImageBitmap | HTMLImageElement;
	stamps: Stamp[];
	dataSources: DataSource[];
	dpiScale?: number;
}

export class TicketRenderer {
	private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	private templateImage: ImageBitmap | HTMLImageElement;
	private stamps: Stamp[];
	private dataSources: DataSource[];
	private dpiScale: number;

	constructor(options: TicketRendererOptions) {
		this.ctx = options.ctx;
		this.templateImage = options.templateImage;
		this.stamps = options.stamps;
		this.dataSources = options.dataSources;
		this.dpiScale = options.dpiScale || 1;
	}

	/**
	 * Renders a single ticket with the given data record.
	 */
	public async render(record: Record<string, string>): Promise<void> {
		const { ctx, templateImage, stamps, dpiScale } = this;

		// Clear canvas
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

		// Draw template image
		// We assume the canvas size matches the template image size (scaled by DPI)
		ctx.drawImage(templateImage, 0, 0, ctx.canvas.width, ctx.canvas.height);

		// Draw stamps
		for (const stamp of stamps) {
			ctx.save();

			// Scale context for coordinates (which are in template image pixels)
			ctx.scale(dpiScale, dpiScale);

			switch (stamp.type) {
				case 'text':
					this.renderTextStamp(stamp as TextStamp, record);
					break;
				case 'barcode':
					await this.renderBarcodeStamp(stamp as BarcodeStamp, record);
					break;
				case 'qrcode':
					await this.renderQrCodeStamp(stamp as QrCodeStamp, record);
					break;
			}

			ctx.restore();
		}
	}

	private renderTextStamp(stamp: TextStamp, record: Record<string, string>): void {
		const { ctx } = this;
		const text = resolveTemplate(stamp.template, record, this.dataSources);

		ctx.font = `${stamp.fontSize}px ${stamp.fontFamily}`;
		ctx.fillStyle = stamp.color;

		let x = stamp.x;
		let y = stamp.y;

		if (stamp.autoSize) {
			// Auto-size: (x,y) is the anchor point
			ctx.textBaseline = stamp.verticalAlign || 'top';
			ctx.textAlign = stamp.alignment;
		} else {
			// Fixed-size box: (x,y) is top-left corner
			// Horizontal alignment within box
			if (stamp.alignment === 'center') {
				ctx.textAlign = 'center';
				x += stamp.width / 2;
			} else if (stamp.alignment === 'right') {
				ctx.textAlign = 'right';
				x += stamp.width;
			} else {
				ctx.textAlign = 'left';
			}

			// Vertical alignment within box
			if (stamp.verticalAlign === 'middle') {
				ctx.textBaseline = 'middle';
				y += stamp.height / 2;
			} else if (stamp.verticalAlign === 'bottom') {
				ctx.textBaseline = 'bottom';
				y += stamp.height;
			} else {
				ctx.textBaseline = 'top';
			}

			// Clipping only for fixed size
			ctx.beginPath();
			ctx.rect(stamp.x, stamp.y, stamp.width, stamp.height);
			ctx.clip();
		}

		ctx.fillText(text, x, y);
	}

	private async renderBarcodeStamp(
		stamp: BarcodeStamp,
		record: Record<string, string>
	): Promise<void> {
		const { ctx } = this;
		const text = resolveTemplate(stamp.template, record, this.dataSources);

		if (!text) {
			this.renderPlaceholder(stamp, 'Empty Barcode');
			return;
		}

		try {
			const barcodeCanvas = await generateBarcode({
				text,
				format: stamp.format,
				width: stamp.width,
				height: stamp.height,
				scale: 4 // Use high scale for better quality
			});

			ctx.drawImage(barcodeCanvas, stamp.x, stamp.y, stamp.width, stamp.height);
		} catch (error) {
			console.error('Barcode rendering failed:', error);
			this.renderPlaceholder(stamp, 'Error');
		}
	}

	private async renderQrCodeStamp(
		stamp: QrCodeStamp,
		record: Record<string, string>
	): Promise<void> {
		const { ctx } = this;
		const text = resolveTemplate(stamp.template, record, this.dataSources);

		if (!text) {
			this.renderPlaceholder(stamp, 'Empty QR');
			return;
		}

		try {
			const qrCanvas = await generateQrCode({
				text,
				errorCorrection: stamp.errorCorrection,
				width: stamp.width * 2 // Higher resolution for drawing
			});

			ctx.drawImage(qrCanvas, stamp.x, stamp.y, stamp.width, stamp.height);
		} catch (error) {
			console.error('QR rendering failed:', error);
			this.renderPlaceholder(stamp, 'Error');
		}
	}

	private renderPlaceholder(stamp: Stamp, label: string): void {
		const { ctx } = this;

		// Draw bounding box for placeholder
		ctx.strokeStyle = '#cbd5e1'; // gray-300
		ctx.setLineDash([5, 5]);
		ctx.strokeRect(stamp.x, stamp.y, stamp.width, stamp.height);

		// Draw label
		ctx.fillStyle = '#94a3b8'; // gray-400
		ctx.font = '12px sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(label, stamp.x + stamp.width / 2, stamp.y + stamp.height / 2);
	}

	/**
	 * Returns the image data of the current canvas state.
	 * Useful for PDF export (Phase 6).
	 */
	public getImageData(): ImageData {
		return this.ctx.getImageData(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
	}

	/**
	 * Updates the stamps list without re-instantiating.
	 */
	public setStamps(stamps: Stamp[]): void {
		this.stamps = stamps;
	}

	/**
	 * Measures the dimensions of a text stamp.
	 */
	public measureText(
		stamp: TextStamp,
		record: Record<string, string>
	): { width: number; height: number } {
		const { ctx } = this;
		const text = resolveTemplate(stamp.template, record, this.dataSources);

		ctx.save();
		ctx.font = `${stamp.fontSize}px ${stamp.fontFamily}`;
		const metrics = ctx.measureText(text);
		// Use fontSize for height to ensure stable bounding box matching baseline logic
		const height = stamp.fontSize;
		ctx.restore();

		return {
			width: metrics.width,
			height: height
		};
	}
}
