import type { DataSource, CsvDataSource, SequentialDataSource, RandomDataSource } from '$lib/types';

/**
 * Ensures all data sources have names. Used for backward compatibility.
 * Mutates the array in place and returns it.
 */
export function ensureDataSourceNames(dataSources: DataSource[]): DataSource[] {
	const usedNames = new Set<string>();

	for (const source of dataSources) {
		// If source already has a name, just track it
		if (source.name) {
			usedNames.add(source.name);
			continue;
		}

		// Generate a default name based on type
		let baseName: string;
		switch (source.type) {
			case 'sequential':
				baseName = 'number';
				break;
			case 'random':
				baseName = 'random';
				break;
			case 'csv':
				baseName = 'csv';
				break;
		}

		// Ensure uniqueness
		let name = baseName;
		let counter = 1;
		while (usedNames.has(name)) {
			name = `${baseName}${counter}`;
			counter++;
		}

		source.name = name;
		usedNames.add(name);
	}

	return dataSources;
}

/**
 * Generates a preview record based on the project's data sources.
 * This is used for the editor preview where we might not have a full dataset yet.
 */
export function generatePreviewRecord(dataSources: DataSource[]): Record<string, string> {
	// Ensure all sources have names for backward compatibility
	ensureDataSourceNames(dataSources);

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
					record[source.name] = (source.prefix || '') + value;
				}
				break;

			case 'random':
				record[source.name] = 'ABC123XYZ'; // Placeholder for preview
				break;
		}
	}

	return record;
}

/**
 * Extracts all unique keys available from all data sources.
 */
export function getAvailableKeys(dataSources: DataSource[]): string[] {
	// Ensure all sources have names for backward compatibility
	ensureDataSourceNames(dataSources);

	const keys = new Set<string>();
	for (const source of dataSources) {
		if (source.type === 'csv') {
			source.columns.forEach((col) => keys.add(col));
		} else if (source.type === 'sequential') {
			keys.add(source.name);
		} else if (source.type === 'random') {
			keys.add(source.name);
		}
	}
	return Array.from(keys);
}

/**
 * Generates all records from all data sources.
 * Merges records from multiple sources into a single array of records.
 */
export function generateRecords(dataSources: DataSource[]): Record<string, string>[] {
	ensureDataSourceNames(dataSources);

	// First, generate records for each source individually
	const sourceRecords = dataSources.map((source) => {
		switch (source.type) {
			case 'csv':
				return generateCsvRecords(source);
			case 'sequential':
				return generateSequentialRecords(source);
			case 'random':
				return generateRandomRecords(source);
			default:
				return [];
		}
	});

	// Determine the maximum number of records
	const maxRecords = Math.max(0, ...sourceRecords.map((r) => r.length));

	// Merge them
	const combinedRecords: Record<string, string>[] = [];
	for (let i = 0; i < maxRecords; i++) {
		const merged: Record<string, string> = {};
		sourceRecords.forEach((records) => {
			if (i < records.length) {
				Object.assign(merged, records[i]);
			}
		});
		combinedRecords.push(merged);
	}

	return combinedRecords;
}

/**
 * Returns records for a CSV data source.
 */
export function generateCsvRecords(source: CsvDataSource): Record<string, string>[] {
	return source.rows;
}

/**
 * Generates records for a sequential data source.
 */
export function generateSequentialRecords(source: SequentialDataSource): Record<string, string>[] {
	const records: Record<string, string>[] = [];
	const { start, end, step, padLength, prefix, name } = source;

	if (step === 0) return [];

	const isIncrementing = step > 0;
	for (let num = start; isIncrementing ? num <= end : num >= end; num += step) {
		const absVal = Math.abs(num);
		const valueStr = absVal.toString().padStart(padLength, '0');
		const value = (prefix || '') + (num < 0 ? '-' : '') + valueStr;
		records.push({ [name]: value });
	}

	return records;
}

/**
 * Generates records for a random data source.
 */
export function generateRandomRecords(source: RandomDataSource): Record<string, string>[] {
	const records: Record<string, string>[] = [];
	const { charset, length, count, name } = source;

	for (let i = 0; i < count; i++) {
		let value = '';
		for (let j = 0; j < length; j++) {
			value += charset.charAt(Math.floor(Math.random() * charset.length));
		}
		records.push({ [name]: value });
	}

	return records;
}
