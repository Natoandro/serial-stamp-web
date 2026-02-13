import type { DataSource } from '$lib/types';
import { ensureDataSourceNames } from './data';

/**
 * Resolves a template string with data from a record and named sources.
 * Supports:
 * - {{name}} for scalar sources (sequential, random) or single CSV source
 * - {{source.field}} for CSV fields with named source
 * - {{.field}} for CSV fields when there's only one CSV source
 */
export function resolveTemplate(
	template: string,
	record: Record<string, string>,
	dataSources: DataSource[]
): string {
	// Ensure all sources have names for backward compatibility
	ensureDataSourceNames(dataSources);

	return template.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
		const trimmed = expression.trim();

		// Handle {{source.field}} syntax
		if (trimmed.includes('.')) {
			const parts = trimmed.split('.');
			if (parts.length === 2) {
				const [sourceName, fieldName] = parts;

				// Handle {{.field}} - use the only CSV source
				if (sourceName === '') {
					const csvSources = dataSources.filter((s) => s.type === 'csv');
					if (csvSources.length === 1 && csvSources[0].type === 'csv') {
						return record[fieldName] || '';
					}
					return '';
				}

				// Handle {{source.field}} - find named source
				const source = dataSources.find((s) => s.name === sourceName && s.type === 'csv');
				if (source) {
					return record[fieldName] || '';
				}
			}
			return '';
		}

		// Handle {{name}} - direct lookup for scalar sources or CSV columns
		return record[trimmed] || '';
	});
}

/**
 * Extracts all variables from a template.
 * Returns an array of objects describing each variable.
 */
export function extractVariables(
	template: string
): Array<{ raw: string; sourceName?: string; fieldName: string }> {
	const matches = template.matchAll(/\{\{([^}]+)\}\}/g);
	const variables: Array<{ raw: string; sourceName?: string; fieldName: string }> = [];

	for (const match of matches) {
		const expression = match[1].trim();

		if (expression.includes('.')) {
			const parts = expression.split('.');
			if (parts.length === 2) {
				const [sourceName, fieldName] = parts;
				variables.push({
					raw: expression,
					sourceName: sourceName || undefined,
					fieldName
				});
			}
		} else {
			variables.push({
				raw: expression,
				fieldName: expression
			});
		}
	}

	return variables;
}

/**
 * Gets all available variables based on the data sources.
 * Returns an array of variable descriptors for documentation.
 */
export function getAvailableVariables(dataSources: DataSource[]): Array<{
	syntax: string;
	description: string;
	source: string;
}> {
	// Ensure all sources have names for backward compatibility
	ensureDataSourceNames(dataSources);

	const variables: Array<{ syntax: string; description: string; source: string }> = [];
	const csvSources = dataSources.filter((s) => s.type === 'csv');
	const hasOnlyCsvSource = csvSources.length === 1 && dataSources.length === 1;

	for (const source of dataSources) {
		switch (source.type) {
			case 'csv':
				// Add {{source.field}} syntax for each column
				if (source.columns.length > 0) {
					source.columns.forEach((col) => {
						variables.push({
							syntax: `{{${source.name}.${col}}}`,
							description: `Field "${col}" from CSV "${source.name}"`,
							source: source.name
						});

						// Add {{.field}} syntax if this is the only CSV source
						if (hasOnlyCsvSource) {
							variables.push({
								syntax: `{{.${col}}}`,
								description: `Field "${col}" (shorthand)`,
								source: source.name
							});
						}
					});
				}
				break;

			case 'sequential':
				variables.push({
					syntax: `{{${source.name}}}`,
					description: `Sequential number${source.prefix ? ` with prefix "${source.prefix}"` : ''} (${source.start}-${source.end})`,
					source: source.name
				});
				break;

			case 'random':
				variables.push({
					syntax: `{{${source.name}}}`,
					description: `Random string (${source.length} chars)`,
					source: source.name
				});
				break;
		}
	}

	return variables;
}
