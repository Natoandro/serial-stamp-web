// Domain types for Serial Stamp application

// ============================================================================
// Fonts
// ============================================================================

export interface FontDefinition {
	name: string;
	displayName: string;
	fileName: string;
	url: string;
}

export const AVAILABLE_FONTS: FontDefinition[] = [
	{
		name: 'Roboto',
		displayName: 'Roboto',
		fileName: 'Roboto-Regular.ttf',
		url: 'https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Regular.ttf'
	},
	{
		name: 'Open Sans',
		displayName: 'Open Sans',
		fileName: 'OpenSans-Regular.ttf',
		url: 'https://github.com/google/fonts/raw/main/apache/opensans/static/OpenSans-Regular.ttf'
	},
	{
		name: 'Lora',
		displayName: 'Lora',
		fileName: 'Lora-Regular.ttf',
		url: 'https://github.com/google/fonts/raw/main/ofl/lora/static/Lora-Regular.ttf'
	},
	{
		name: 'Roboto Mono',
		displayName: 'Roboto Mono',
		fileName: 'RobotoMono-Regular.ttf',
		url: 'https://github.com/google/fonts/raw/main/apache/robotomono/static/RobotoMono-Regular.ttf'
	},
	{
		name: 'Inter',
		displayName: 'Inter',
		fileName: 'Inter-Regular.ttf',
		url: 'https://github.com/google/fonts/raw/main/ofl/inter/static/Inter-Regular.ttf'
	}
];

// ============================================================================
// Stamps
// ============================================================================

export type StampType = 'text' | 'barcode' | 'qrcode';

export interface BaseStamp {
	id: string;
	type: StampType;
	x: number; // Position in template image pixels
	y: number;
	width: number;
	height: number;
}

export interface TextStamp extends BaseStamp {
	type: 'text';
	template: string; // e.g., "{{number}}"
	fontFamily: string;
	fontSize: number;
	color: string;
	alignment: 'left' | 'center' | 'right';
	verticalAlign?: 'top' | 'middle' | 'bottom';
	autoSize?: boolean;
}

export type BarcodeFormat =
	| 'code128'
	| 'code39'
	| 'ean13'
	| 'upca'
	| 'ean8'
	| 'upce'
	| 'code93'
	| 'itf14';

export interface BarcodeStamp extends BaseStamp {
	type: 'barcode';
	template: string;
	format: BarcodeFormat;
}

export type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H';

export interface QrCodeStamp extends BaseStamp {
	type: 'qrcode';
	template: string;
	errorCorrection: QrErrorCorrection;
	moduleSize: number;
}

export type Stamp = TextStamp | BarcodeStamp | QrCodeStamp;

// ============================================================================
// Data Sources
// ============================================================================

export type DataSourceType = 'csv' | 'sequential' | 'random';

export interface BaseDataSource {
	id: string;
	name: string;
	type: DataSourceType;
}

export interface CsvDataSource extends BaseDataSource {
	type: 'csv';
	columns: string[];
	rows: Record<string, string>[];
}

export interface SequentialDataSource extends BaseDataSource {
	type: 'sequential';
	prefix?: string;
	start: number;
	end: number;
	step: number;
	padLength: number;
}

export interface RandomDataSource extends BaseDataSource {
	type: 'random';
	charset: string;
	length: number;
	count: number;
}

export type DataSource = CsvDataSource | SequentialDataSource | RandomDataSource;

// ============================================================================
// Paper & Layout
// ============================================================================

export interface PaperSize {
	name: string;
	widthMm: number;
	heightMm: number;
}

export const PAPER_SIZES: Record<string, PaperSize> = {
	A4: { name: 'A4', widthMm: 210, heightMm: 297 },
	A3: { name: 'A3', widthMm: 297, heightMm: 420 },
	LETTER: { name: 'Letter', widthMm: 215.9, heightMm: 279.4 },
	LEGAL: { name: 'Legal', widthMm: 215.9, heightMm: 355.6 }
};

export interface SheetLayout {
	paperSize: PaperSize;
	orientation: 'portrait' | 'landscape';
	rows: number;
	cols: number;
	marginTop: number; // mm
	marginRight: number; // mm
	marginBottom: number; // mm
	marginLeft: number; // mm
	spacingX: number; // mm
	spacingY: number; // mm
}

// ============================================================================
// Project
// ============================================================================

export interface EventInfo {
	eventName: string;
	eventDate: string;
	eventOrganizer: string;
	ticketType: string;
}

export interface ProjectSettings extends EventInfo {
	templateImage: File | null;
}

export interface Project {
	id: string;
	eventName: string;
	eventDate: string;
	eventOrganizer: string;
	ticketType: string;
	templateImage: Blob;
	stamps: Stamp[];
	dataSources: DataSource[];
	sheetLayout?: SheetLayout;
	createdAt: Date;
	updatedAt: Date;
}
