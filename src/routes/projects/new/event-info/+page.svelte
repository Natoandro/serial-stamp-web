<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getContext } from 'svelte';
	import { isValidUUID } from '$lib/utils/uuid';
	import TextInput from '$lib/components/ui/forms/TextInput.svelte';
	import Calendar from '$lib/components/ui/forms/Calendar.svelte';
	import FileUpload from '$lib/components/ui/forms/FileUpload.svelte';
	import { createProject, updateProject } from '$lib/data/projects';
	import type { WizardState } from '$lib/stores/wizard.svelte';

	const wizardState = getContext<WizardState>('wizardState');
	const canProceedContext = getContext<{ value: boolean }>('canProceed');

	const today = new Date().toISOString().split('T')[0];

	const projectIdParam = $page.url.searchParams.get('projectId');
	let projectId = $state<string | null>(
		projectIdParam && isValidUUID(projectIdParam) ? projectIdParam : null
	);
	let isNavigating = $state(false);

	const isValid = $derived(
		wizardState.eventName.trim() !== '' &&
			wizardState.eventDate.trim() !== '' &&
			wizardState.eventOrganizer.trim() !== '' &&
			wizardState.ticketType.trim() !== '' &&
			wizardState.templateImageFile !== null
	);

	$effect(() => {
		canProceedContext.value = isValid && !isNavigating;
	});

	// Override the next button to save the project first
	const onFinishContext = getContext<{ value: (() => void | Promise<void>) | null }>('onFinish');

	$effect(() => {
		onFinishContext.value = handleNext;
		return () => {
			onFinishContext.value = null;
		};
	});

	async function handleNext() {
		if (!isValid || isNavigating || !wizardState.templateImageFile) return;

		isNavigating = true;
		try {
			if (projectId) {
				// Update existing project
				await updateProject(projectId, {
					eventName: wizardState.eventName.trim(),
					eventDate: wizardState.eventDate.trim(),
					eventOrganizer: wizardState.eventOrganizer.trim(),
					ticketType: wizardState.ticketType.trim(),
					templateImage: wizardState.templateImageFile,
					dataSources: wizardState.dataSources,
					stamps: wizardState.stamps
				});
			} else {
				// Create new project
				const project = await createProject({
					eventName: wizardState.eventName.trim(),
					eventDate: wizardState.eventDate.trim(),
					eventOrganizer: wizardState.eventOrganizer.trim(),
					ticketType: wizardState.ticketType.trim(),
					templateImage: wizardState.templateImageFile,
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

	<div class="grid gap-8 lg:grid-cols-2">
		<!-- Left column: Form fields -->
		<div class="space-y-6">
			<TextInput
				bind:value={wizardState.eventName}
				label="Event Name"
				placeholder="e.g., Summer Festival 2024"
				required
			/>

			<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
				<TextInput
					bind:value={wizardState.eventOrganizer}
					label="Event Organizer"
					placeholder="e.g., City Arts Council"
					required
				/>

				<TextInput
					bind:value={wizardState.ticketType}
					label="Ticket Type"
					placeholder="e.g., General Admission, VIP, Student"
					required
				/>
			</div>

			<FileUpload
				bind:file={wizardState.templateImageFile}
				label="Template Image"
				hint="Upload an image that will serve as the base template for your tickets."
				accept="image/*"
				required
				showPreview
			/>
		</div>

		<!-- Right column: Calendar and selected date -->
		<div class="space-y-4">
			<div>
				<div class="mb-2 block text-sm font-medium text-gray-700">
					Event Date <span class="text-red-500">*</span>
				</div>
				<input
					type="text"
					id="selected-date"
					value={wizardState.eventDate
						? new Date(wizardState.eventDate).toLocaleDateString(undefined, {
								weekday: 'long',
								year: 'numeric',
								month: 'long',
								day: 'numeric'
							})
						: 'No date selected'}
					readonly
					class="mb-4 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-center text-sm font-medium text-gray-900 shadow-sm"
				/>
				<Calendar bind:value={wizardState.eventDate} min={today} />
				{#if !wizardState.eventDate}
					<p class="mt-2 text-sm text-gray-500">Please select a date from the calendar.</p>
				{/if}
			</div>
		</div>
	</div>

	{#if isNavigating}
		<div class="mt-6 text-center text-sm text-gray-600">Saving project...</div>
	{/if}
</div>
