<script lang="ts">
	import TextInput from '$lib/components/ui/forms/TextInput.svelte';
	import Calendar from '$lib/components/ui/forms/Calendar.svelte';
	import FileUpload from '$lib/components/ui/forms/FileUpload.svelte';
	import type { ProjectSettings } from '$lib/types';

	interface Props {
		initialData?: Partial<ProjectSettings>;
		existingTemplateImage?: Blob | null;
		onSubmit: (data: ProjectSettings) => void | Promise<void>;
		formId?: string;
		requireImage?: boolean;
	}

	let {
		initialData = {},
		existingTemplateImage = null,
		onSubmit,
		formId = 'event-info-form',
		requireImage = true
	}: Props = $props();

	const today = new Date().toISOString().split('T')[0];

	// Only track template file since FileUpload needs binding
	let templateImage = $state<File | null>(null);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);

		const data: ProjectSettings = {
			eventName: formData.get('eventName') as string,
			eventDate: formData.get('eventDate') as string,
			eventOrganizer: formData.get('eventOrganizer') as string,
			ticketType: formData.get('ticketType') as string,
			templateImage
		};

		await onSubmit(data);
	}
</script>

<form id={formId} onsubmit={handleSubmit}>
	<div class="grid gap-8 lg:grid-cols-2">
		<!-- Left column: Form fields -->
		<div class="space-y-6">
			<TextInput
				name="eventName"
				value={initialData.eventName || ''}
				label="Event Name"
				placeholder="e.g., Summer Festival 2024"
				required
			/>

			<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
				<TextInput
					name="eventOrganizer"
					value={initialData.eventOrganizer || ''}
					label="Event Organizer"
					placeholder="e.g., City Arts Council"
					required
				/>

				<TextInput
					name="ticketType"
					value={initialData.ticketType || ''}
					label="Ticket Type"
					placeholder="e.g., General Admission, VIP, Student"
					required
				/>
			</div>

			<FileUpload
				bind:file={templateImage}
				existingImage={existingTemplateImage}
				label="Template Image"
				hint="Upload an image that will serve as the base template for your tickets."
				accept="image/*"
				required={requireImage}
				showPreview
			/>
		</div>

		<!-- Right column: Calendar -->
		<div class="space-y-4">
			<div>
				<label for="eventDate" class="mb-2 block text-sm font-medium text-gray-700">
					Event Date <span class="text-red-500">*</span>
				</label>
				<Calendar name="eventDate" value={initialData.eventDate || ''} min={today} required />
			</div>
		</div>
	</div>
</form>
