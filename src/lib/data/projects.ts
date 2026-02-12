import { db } from '$lib/db';
import { v4 as uuidv4 } from 'uuid';
import type { Project } from '$lib/types';

// Deep clone and sanitize data for IndexedDB
function sanitizeForIndexedDB(data: any): any {
	if (data === null || data === undefined) {
		return data;
	}

	// Handle File/Blob
	if (data instanceof File) {
		return new Blob([data], { type: data.type });
	}

	if (data instanceof Blob) {
		return data;
	}

	// Handle Date
	if (data instanceof Date) {
		return data;
	}

	// Handle Array
	if (Array.isArray(data)) {
		return data.map((item) => sanitizeForIndexedDB(item));
	}

	// Handle plain objects
	if (typeof data === 'object') {
		const sanitized: any = {};
		for (const key in data) {
			if (Object.prototype.hasOwnProperty.call(data, key)) {
				sanitized[key] = sanitizeForIndexedDB(data[key]);
			}
		}
		return sanitized;
	}

	// Primitives (string, number, boolean)
	return data;
}

export async function createProject(
	data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Project> {
	const now = new Date();

	try {
		// Sanitize all data for IndexedDB
		const sanitizedData = sanitizeForIndexedDB(data);

		const project: Project = {
			...sanitizedData,
			id: uuidv4(),
			createdAt: now,
			updatedAt: now
		};

		await db.projects.add(project);
		return project;
	} catch (error) {
		console.error('Failed to create project:', error);
		console.error(
			'Project data:',
			JSON.stringify(
				data,
				(key, value) => {
					if (value instanceof File) return `[File: ${value.name}]`;
					if (value instanceof Blob) return `[Blob: ${value.size} bytes]`;
					return value;
				},
				2
			)
		);
		throw error;
	}
}

export async function getProject(id: string): Promise<Project | undefined> {
	return await db.projects.get(id);
}

export async function listProjects(): Promise<Project[]> {
	return await db.projects.orderBy('createdAt').reverse().toArray();
}

export async function updateProject(
	id: string,
	patch: Partial<Omit<Project, 'id' | 'createdAt'>>
): Promise<void> {
	try {
		// Sanitize all data for IndexedDB
		const sanitizedPatch = sanitizeForIndexedDB(patch);

		await db.projects.update(id, { ...sanitizedPatch, updatedAt: new Date() });
	} catch (error) {
		console.error('Failed to update project:', error);
		console.error(
			'Update data:',
			JSON.stringify(
				patch,
				(key, value) => {
					if (value instanceof File) return `[File: ${value.name}]`;
					if (value instanceof Blob) return `[Blob: ${value.size} bytes]`;
					return value;
				},
				2
			)
		);
		throw error;
	}
}

export async function deleteProject(id: string): Promise<void> {
	await db.projects.delete(id);
}
