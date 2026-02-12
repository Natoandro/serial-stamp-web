import type { DataSource } from '$lib/types';

export function resolveTemplate(template: string, record: Record<string, string>): string {
	return template.replace(/\{\{(\w+)\}\}/g, (_, key) => record[key] || '');
}

export function extractVariables(template: string): string[] {
	const matches = template.matchAll(/\{\{(\w+)\}\}/g);
	return Array.from(matches, (m) => m[1]);
}

export function getAvailableVariables(dataSources: DataSource[]): string[] {
	const vars = new Set<string>();
	for (const source of dataSources) {
		if (source.type === 'csv') {
			source.columns.forEach((col) => vars.add(col));
		} else if (source.type === 'sequential') {
			vars.add('number');
		} else if (source.type === 'random') {
			vars.add('random');
		}
	}
	return Array.from(vars);
}
