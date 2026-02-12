<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import TextInput from '$lib/components/ui/forms/TextInput.svelte';
	import Calendar from '$lib/components/ui/forms/Calendar.svelte';
	import FileUpload from '$lib/components/ui/forms/FileUpload.svelte';

	interface Props {
		data: Record<string, unknown>;
	}

	let { data = $bindable() }: Props = $props();

	const dispatch = createEventDispatcher<{
		validate: { canProceed: boolean };
		data: Record<string, unknown>;
	}>();

	let eventName = $state((data.eventName as string) || '');
	let eventDate = $state((data.eventDate as string) || '');
	let eventOrganizer = $state((data.eventOrganizer as string) || '');
	let ticketType = $state((data.ticketType as string) || '');
	let templateImage = $state<File | null>((data.templateImageFile as File) || null);

	const isValid = $derived(
		eventName.trim() !== '' &&
			eventDate.trim() !== '' &&
			eventOrganizer.trim() !== '' &&
			ticketType.trim() !== '' &&
			templateImage !== null
	);

	$effect(() => {
		dispatch('validate', { canProceed: isValid });
	});

	$effect(() => {
		if (isValid) {
			dispatch('data', {
				eventName: eventName.trim(),
				eventDate: eventDate.trim(),
				eventOrganizer: eventOrganizer.trim(),
				ticketType: ticketType.trim(),
				templateImageFile: templateImage
			});
		}
	});
</script>

<div class="rounded-lg border border-gray-200 bg-white p-8">
	<div class="mb-6">
		<h2 class="text-2xl font-bold text-gray-900">Event & Ticket Information</h2>
		<p class="mt-2 text-sm text-gray-600">
			Provide details about your event and upload the ticket template image.
		</p>
	</div>

	<div class="space-y-6">
		<TextInput
			bind:value={eventName}
			label="Event Name"
			placeholder="e.g., Summer Festival 2024"
			required
		/>

		<div class="grid gap-6 md:grid-cols-2">
			<TextInput
				bind:value={eventOrganizer}
				label="Event Organizer"
				placeholder="e.g., City Arts Council"
				required
			/>

			<TextInput
				bind:value={ticketType}
				label="Ticket Type"
				placeholder="e.g., General Admission, VIP, Student"
				required
			/>
		</div>

		<div>
			<div class="mb-2 block text-sm font-medium text-gray-700">
				Event Date <span class="text-red-500">*</span>
			</div>
			<Calendar bind:value={eventDate} />
		</div>

		<FileUpload
			bind:file={templateImage}
			label="Template Image"
			hint="Upload an image that will serve as the base template for your tickets."
			accept="image/*"
			required
			showPreview
		/>
	</div>
</div>
