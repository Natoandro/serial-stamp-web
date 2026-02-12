import type { Stamp, TextStamp } from '$lib/types';
import { resolveTemplate } from '$lib/engine/template';

export interface TicketRendererOptions {
	ctx: CanvasRenderingContext2D;
	templateImage: ImageBitmap | HTMLImageElement;
	stamps: Stamp[];
	dpiScale?: number;
}

export class TicketRenderer {
	private ctx: CanvasRenderingContext2D;
	private templateImage: ImageBitmap | HTMLImageElement;
	private stamps: Stamp[];
	private dpiScale: number;

	constructor(options: TicketRendererOptions) {
		this.ctx = options.ctx;
		this.templateImage = options.templateImage;
		this.stamps = options.stamps;
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
					// Phase 3: Barcode implementation
					this.renderPlaceholder(stamp, 'Barcode');
					break;
				case 'qrcode':
					// Phase 3: QR code implementation
					this.renderPlaceholder(stamp, 'QR Code');
					break;
			}

			ctx.restore();
		}
	}

	private renderTextStamp(stamp: TextStamp, record: Record<string, string>): void {
		const { ctx } = this;
		const text = resolveTemplate(stamp.template, record);

		ctx.font = `${stamp.fontSize}px ${stamp.fontFamily}`;
		ctx.fillStyle = stamp.color;
		ctx.textBaseline = 'top';

		let x = stamp.x;
		const y = stamp.y;

		if (stamp.alignment === 'center') {
			ctx.textAlign = 'center';
			x += stamp.width / 2;
		} else if (stamp.alignment === 'right') {
			ctx.textAlign = 'right';
			x += stamp.width;
		} else {
			ctx.textAlign = 'left';
		}

		// Ensure text stays within stamp bounds if possible (basic clipping)
		ctx.beginPath();
		ctx.rect(stamp.x, stamp.y, stamp.width, stamp.height);
		ctx.clip();

		ctx.fillText(text, x, y);
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
}
