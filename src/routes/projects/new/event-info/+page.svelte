<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getContext } from 'svelte';
	import { isValidUUID } from '$lib/utils/uuid';
	import EventInfoForm from '$lib/components/forms/EventInfoForm.svelte';
	import { createProject, updateProject } from '$lib/data/projects';
	import type { WizardState } from '$lib/stores/wizard.svelte';
	import type { ProjectSettings } from '$lib/types';

	const wizardState = getContext<WizardState>('wizardState');
	const canProceedContext = getContext<{ value: boolean }>('canProceed');

	const projectIdParam = page.url.searchParams.get('projectId');
	let projectId = $state<string | null>(
		projectIdParam && isValidUUID(projectIdParam) ? projectIdParam : null
	);
	let isNavigating = $state(false);

	$effect(() => {
		canProceedContext.value = !isNavigating;
	});

	// Override the next button to submit the form
	const onFinishContext = getContext<{ value: (() => void | Promise<void>) | null }>('onFinish');

	$effect(() => {
		onFinishContext.value = handleNext;
		return () => {
			onFinishContext.value = null;
		};
	});

	function handleNext() {
		// Trigger form submission
		const form = document.getElementById('event-info-form') as HTMLFormElement;
		form?.requestSubmit();
	}

	async function handleSubmit(data: ProjectSettings) {
		if (isNavigating) return;

		// Update wizard state
		wizardState.eventName = data.eventName;
		wizardState.eventDate = data.eventDate;
		wizardState.eventOrganizer = data.eventOrganizer;
		wizardState.ticketType = data.ticketType;
		if (data.templateImage) {
			wizardState.templateImageFile = data.templateImage;
		}

		isNavigating = true;
		try {
			if (projectId) {
				// Update existing project
				const updateData: any = {
					eventName: data.eventName,
					eventDate: data.eventDate,
					eventOrganizer: data.eventOrganizer,
					ticketType: data.ticketType,
					dataSources: wizardState.dataSources,
					stamps: wizardState.stamps
				};

				// Only update template image if a new one was uploaded
				if (data.templateImage) {
					updateData.templateImage = data.templateImage;
				}

				await updateProject(projectId, updateData);
			} else {
				// Create new project
				const project = await createProject({
					eventName: data.eventName,
					eventDate: data.eventDate,
					eventOrganizer: data.eventOrganizer,
					ticketType: data.ticketType,
					templateImage: (data.templateImage || wizardState.templateImageFile)!,
					dataSources: wizardState.dataSources,
					stamps: wizardState.stamps
				});
				projectId = project.id;
			}

			// Navigate to next step with project ID
			await goto(`/projects/new/data-sources?projectId=${projectId}`);
		} catch (error) {
			console.error('Failed to save project:', error);
			alert('Failed to save project. Please try again.');
		} finally {
			isNavigating = false;
		}
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white p-8">
	<div class="mb-6">
		<h2 class="text-2xl font-bold text-gray-900">Event & Ticket Information</h2>
		<p class="mt-2 text-sm text-gray-600">
			Provide details about your event and upload the ticket template image.
		</p>
	</div>

	<EventInfoForm
		initialData={{
			eventName: wizardState.eventName,
			eventDate: wizardState.eventDate,
			eventOrganizer: wizardState.eventOrganizer,
			ticketType: wizardState.ticketType
		}}
		onSubmit={handleSubmit}
	/>

	{#if isNavigating}
		<div class="mt-6 text-center text-sm text-gray-600">Saving project...</div>
	{/if}
</div>
