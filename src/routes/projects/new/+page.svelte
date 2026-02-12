<script lang="ts">
	import { goto } from '$app/navigation';
	import Wizard from '$lib/components/wizard/Wizard.svelte';
	import StepNameAndImage from '$lib/components/wizard/StepNameAndImage.svelte';
	import StepDataSources from '$lib/components/wizard/StepDataSources.svelte';
	import StepStamps from '$lib/components/wizard/StepStamps.svelte';
	import { createProject } from '$lib/data/projects';
	import type { DataSource, Stamp } from '$lib/types';
	import type { Component } from 'svelte';

	const steps: Array<{ label: string; component: Component }> = [
		{
			label: 'Project Info',
			component: StepNameAndImage as unknown as Component
		},
		{
			label: 'Data Sources',
			component: StepDataSources as unknown as Component
		},
		{
			label: 'Stamps',
			component: StepStamps as unknown as Component
		}
	];

	async function handleComplete(formData: Record<string, unknown>) {
		// Convert File to Blob for storage
		const templateImageBlob = formData.templateImageFile as Blob;

		const project = await createProject({
			eventName: formData.eventName as string,
			eventDate: formData.eventDate as string,
			ticketType: formData.ticketType as string,
			templateImage: templateImageBlob,
			dataSources: (formData.dataSources || []) as DataSource[],
			stamps: (formData.stamps || []) as Stamp[]
		});

		// Navigate to the project editor
		void goto(`/projects/${project.id}`);
	}

	function handleCancel() {
		void goto('/');
	}
</script>

<Wizard {steps} onComplete={handleComplete} onCancel={handleCancel} />
