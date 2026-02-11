import { db } from '$lib/db';
import { v4 as uuidv4 } from 'uuid';
import type { Project } from '$lib/types';

export async function createProject(
	data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Project> {
	const now = new Date();
	const project: Project = {
		...data,
		id: uuidv4(),
		createdAt: now,
		updatedAt: now
	};
	await db.projects.add(project);
	return project;
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
	await db.projects.update(id, { ...patch, updatedAt: new Date() });
}

export async function deleteProject(id: string): Promise<void> {
	await db.projects.delete(id);
}
