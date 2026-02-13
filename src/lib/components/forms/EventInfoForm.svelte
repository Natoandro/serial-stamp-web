<script lang="ts">
	import { createForm } from '@tanstack/svelte-form';
	import TextInput from '$lib/components/ui/forms/TextInput.svelte';
	import Calendar from '$lib/components/ui/forms/Calendar.svelte';
	import ImageUpload from '$lib/components/ui/forms/ImageUpload.svelte';
	import type { ProjectSettings } from '$lib/types';
	import { z } from 'zod';
	import { getFieldError } from '$lib/utils/form';

	interface Props {
		initialData?: Partial<ProjectSettings>;
		currentTemplateImage?: Blob | null;
		onSubmit: (data: ProjectSettings) => void | Promise<void>;
		formId?: string;
		requireImage?: boolean;
		onDirtyChange?: (dirty: boolean) => void;
	}

	let {
		initialData = {},
		currentTemplateImage = null,
		onSubmit,
		formId = 'event-info-form',
		requireImage = true,
		onDirtyChange
	}: Props = $props();

	const today = new Date().toISOString().split('T')[0];

	// Create form with TanStack
	const form = createForm(() => ({
		defaultValues: {
			eventName: initialData.eventName || '',
			eventDate: initialData.eventDate || '',
			eventOrganizer: initialData.eventOrganizer || '',
			ticketType: initialData.ticketType || '',
			templateImage: null
		} as ProjectSettings,
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		}
	}));

	// Expose reactive form state for parent
	const formState = form.useStore((state) => state);
	const isDirty = form.useStore((state) => state.isDirty);

	// Notify parent when dirty state changes
	$effect(() => {
		onDirtyChange?.(isDirty.current);
	});

	// Handle reset
	function handleReset() {
		form.reset();
	}

	// Reset form with current values as new defaults (for after save)
	function handleSaveSuccess() {
		form.reset(form.state.values);
	}

	// Expose reset for parent
	export { handleReset, handleSaveSuccess };

	// Expose submit for parent
	export function submit() {
		form.handleSubmit();
	}
</script>

<form
	id={formId}
	onsubmit={(e) => {
		e.preventDefault();
		e.stopPropagation();
		form.handleSubmit();
	}}
>
	<div class="grid gap-8 lg:grid-cols-2">
		<!-- Left column: Form fields -->
		<div class="space-y-6">
			<form.Field
				name="eventName"
				validators={{
					onChange: z.string().min(1, 'Event name is required')
				}}
			>
				{#snippet children(field)}
					<TextInput
						name={field.name}
						value={field.state.value}
						oninput={(value) => field.handleChange(value)}
						onblur={field.handleBlur}
						label="Event Name"
						placeholder="e.g., Summer Festival 2024"
						required
						error={getFieldError(field)}
					/>
				{/snippet}
			</form.Field>

			<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
				<form.Field
					name="eventOrganizer"
					validators={{
						onChange: z.string().min(1, 'Event organizer is required')
					}}
				>
					{#snippet children(field)}
						<TextInput
							name={field.name}
							value={field.state.value}
							oninput={(value) => field.handleChange(value)}
							onblur={field.handleBlur}
							label="Event Organizer"
							placeholder="e.g., City Arts Council"
							required
							error={getFieldError(field)}
						/>
					{/snippet}
				</form.Field>

				<form.Field
					name="ticketType"
					validators={{
						onChange: z.string().min(1, 'Ticket type is required')
					}}
				>
					{#snippet children(field)}
						<TextInput
							name={field.name}
							value={field.state.value}
							oninput={(value) => field.handleChange(value)}
							onblur={field.handleBlur}
							label="Ticket Type"
							placeholder="e.g., General Admission, VIP, Student"
							required
							error={getFieldError(field)}
						/>
					{/snippet}
				</form.Field>
			</div>

			<form.Field name="templateImage">
				{#snippet children(field)}
					<ImageUpload
						file={field.state.value}
						onchange={(file) => field.handleChange(file)}
						currentImage={currentTemplateImage}
						label="Template Image"
						hint="Upload an image that will serve as the base template for your tickets."
						required={requireImage}
					/>
				{/snippet}
			</form.Field>
		</div>

		<!-- Right column: Calendar -->
		<div class="space-y-4">
			<form.Field
				name="eventDate"
				validators={{
					onChange: z.string().min(1, 'Event date is required')
				}}
			>
				{#snippet children(field)}
					<div>
						<label for={field.name} class="mb-2 block text-sm font-medium text-gray-700">
							Event Date <span class="text-red-500">*</span>
						</label>
						<Calendar
							name={field.name}
							value={field.state.value}
							onchange={(date) => field.handleChange(date)}
							min={today}
							required
						/>
						{#if getFieldError(field)}
							<p class="mt-1 text-sm text-red-600">
								{getFieldError(field)}
							</p>
						{/if}
					</div>
				{/snippet}
			</form.Field>
		</div>
	</div>
</form>
