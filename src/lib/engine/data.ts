import type { DataSource } from '$lib/types';

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
