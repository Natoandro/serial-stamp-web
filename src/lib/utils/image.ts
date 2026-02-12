/**
 * Loads a Blob (or File) into an ImageBitmap.
 * ImageBitmap is preferred for canvas rendering as it is more performant
 * and can be easily transferred between threads.
 */
export async function blobToImageBitmap(blob: Blob): Promise<ImageBitmap> {
	return await createImageBitmap(blob);
}

/**
 * Loads a Blob (or File) into an HTMLImageElement.
 * Useful if ImageBitmap is not suitable for a specific use case.
 */
export function blobToImageElement(blob: Blob): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(blob);
		const img = new Image();
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve(img);
		};
		img.onerror = (err) => {
			URL.revokeObjectURL(url);
			reject(err);
		};
		img.src = url;
	});
}

/**
 * Gets the dimensions of an image blob.
 */
export async function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
	const bitmap = await blobToImageBitmap(blob);
	const dimensions = { width: bitmap.width, height: bitmap.height };
	bitmap.close();
	return dimensions;
}
