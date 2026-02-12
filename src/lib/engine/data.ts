import type { DataSource } from '$lib/types';

/**
 * Generates a preview record based on the project's data sources.
 * This is used for the editor preview where we might not have a full dataset yet.
 */
export function generatePreviewRecord(dataSources: DataSource[]): Record<string, string> {
	const record: Record<string, string> = {};

	for (const source of dataSources) {
		switch (source.type) {
			case 'csv':
				if (source.rows.length > 0) {
					// Use the first row for preview
					Object.assign(record, source.rows[0]);
				} else {
					// Fallback: use column names as values
					source.columns.forEach((col) => {
						record[col] = `[${col}]`;
					});
				}
				break;

			case 'sequential':
				{
					const value = source.start.toString().padStart(source.padLength, '0');
					record['number'] = (source.prefix || '') + value;
				}
				break;

			case 'random':
				record['random'] = 'ABC123XYZ'; // Placeholder for preview
				break;
		}
	}

	return record;
}

/**
 * Extracts all unique keys available from all data sources.
 */
export function getAvailableKeys(dataSources: DataSource[]): string[] {
	const keys = new Set<string>();
	for (const source of dataSources) {
		if (source.type === 'csv') {
			source.columns.forEach((col) => keys.add(col));
		} else if (source.type === 'sequential') {
			keys.add('number');
		} else if (source.type === 'random') {
			keys.add('random');
		}
	}
	return Array.from(keys);
}
