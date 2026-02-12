import type { DataSource, Stamp } from '$lib/types';

export interface WizardData {
	eventName: string;
	eventDate: string;
	eventOrganizer: string;
	ticketType: string;
	templateImageFile: File | null;
	dataSources: DataSource[];
	stamps: Stamp[];
}

export class WizardState {
	eventName = $state('');
	eventDate = $state('');
	eventOrganizer = $state('');
	ticketType = $state('');
	templateImageFile = $state<File | null>(null);
	dataSources = $state<DataSource[]>([]);
	stamps = $state<Stamp[]>([]);

	reset() {
		this.eventName = '';
		this.eventDate = '';
		this.eventOrganizer = '';
		this.ticketType = '';
		this.templateImageFile = null;
		this.dataSources = [];
		this.stamps = [];
	}

	getData(): WizardData {
		return {
			eventName: this.eventName,
			eventDate: this.eventDate,
			eventOrganizer: this.eventOrganizer,
			ticketType: this.ticketType,
			templateImageFile: this.templateImageFile,
			dataSources: this.dataSources,
			stamps: this.stamps
		};
	}

	loadFromProject(project: {
		eventName: string;
		eventDate: string;
		eventOrganizer: string;
		ticketType: string;
		templateImage: Blob;
		dataSources: DataSource[];
		stamps: Stamp[];
	}) {
		this.eventName = project.eventName;
		this.eventDate = project.eventDate;
		this.eventOrganizer = project.eventOrganizer;
		this.ticketType = project.ticketType;
		this.templateImageFile = project.templateImage instanceof File ? project.templateImage : null;
		this.dataSources = project.dataSources;
		this.stamps = project.stamps;
	}
}

export const wizardState = new WizardState();
