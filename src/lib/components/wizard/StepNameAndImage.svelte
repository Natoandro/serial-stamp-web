<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import TextInput from '$lib/components/ui/forms/TextInput.svelte';
	import DateInput from '$lib/components/ui/forms/DateInput.svelte';
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
	let ticketType = $state((data.ticketType as string) || '');
	let templateImage = $state<File | null>((data.templateImageFile as File) || null);

	const isValid = $derived(
		eventName.trim() !== '' &&
			eventDate.trim() !== '' &&
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
		<div class="grid gap-6 md:grid-cols-2">
			<TextInput
				bind:value={eventName}
				label="Event Name"
				placeholder="e.g., Summer Festival 2024"
				required
			/>

			<DateInput bind:value={eventDate} label="Event Date" required />
		</div>

		<TextInput
			bind:value={ticketType}
			label="Ticket Type"
			placeholder="e.g., General Admission, VIP, Student"
			hint="What kind of ticket is this?"
			required
		/>

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
