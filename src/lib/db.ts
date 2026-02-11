import Dexie, { type EntityTable } from 'dexie';
import type { Project } from './types';

export class SerialStampDatabase extends Dexie {
	projects!: EntityTable<Project, 'id'>;

	constructor() {
		super('SerialStampDB');
		this.version(1).stores({
			projects: 'id, createdAt'
		});
	}
}

export const db = new SerialStampDatabase();
