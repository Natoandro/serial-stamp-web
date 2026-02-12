<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		data: Record<string, unknown>;
	}

	let { data = $bindable() }: Props = $props();

	const dispatch = createEventDispatcher<{
		validate: { canProceed: boolean };
		data: Record<string, unknown>;
	}>();

	let name = $state((data.name as string) || '');
	let templateImage = $state<File | null>((data.templateImageFile as File) || null);
	let imagePreviewUrl = $state<string | null>((data.imagePreviewUrl as string) || null);

	const isValid = $derived(name.trim() !== '' && templateImage !== null);

	$effect(() => {
		dispatch('validate', { canProceed: isValid });
	});

	$effect(() => {
		if (isValid) {
			dispatch('data', {
				name: name.trim(),
				templateImageFile: templateImage,
				imagePreviewUrl
			});
		}
	});

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (file && file.type.startsWith('image/')) {
			templateImage = file;

			// Create preview URL
			if (imagePreviewUrl) {
				URL.revokeObjectURL(imagePreviewUrl);
			}
			imagePreviewUrl = URL.createObjectURL(file);
		}
	}

	function removeImage() {
		if (imagePreviewUrl) {
			URL.revokeObjectURL(imagePreviewUrl);
		}
		templateImage = null;
		imagePreviewUrl = null;
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white p-8">
	<div class="mb-6">
		<h2 class="text-2xl font-bold text-gray-900">Project Setup</h2>
		<p class="mt-2 text-sm text-gray-600">
			Start by naming your project and uploading a template image for your tickets.
		</p>
	</div>

	<div class="space-y-6">
		<!-- Project Name -->
		<div>
			<label for="project-name" class="block text-sm font-medium text-gray-700">
				Project Name <span class="text-red-500">*</span>
			</label>
			<input
				type="text"
				id="project-name"
				bind:value={name}
				placeholder="e.g., Event Tickets 2024"
				class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
			/>
			{#if name.trim() === ''}
				<p class="mt-1 text-sm text-gray-500">Please enter a name for your project.</p>
			{/if}
		</div>

		<!-- Template Image Upload -->
		<div>
			<label for="template-image" class="block text-sm font-medium text-gray-700">
				Template Image <span class="text-red-500">*</span>
			</label>
			<p class="mt-1 text-sm text-gray-500">
				Upload an image that will serve as the base template for your tickets.
			</p>

			{#if !templateImage}
				<div class="mt-2">
					<label
						for="template-image"
						class="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-12 transition-colors hover:border-gray-400"
					>
						<div class="text-center">
							<svg
								class="mx-auto h-12 w-12 text-gray-400"
								stroke="currentColor"
								fill="none"
								viewBox="0 0 48 48"
							>
								<path
									d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
							<p class="mt-2 text-sm text-gray-600">
								<span class="font-medium text-blue-600">Click to upload</span> or drag and drop
							</p>
							<p class="mt-1 text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
						</div>
					</label>
					<input
						type="file"
						id="template-image"
						accept="image/*"
						onchange={handleFileChange}
						class="sr-only"
					/>
				</div>
			{:else}
				<div class="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
					<div class="flex items-start gap-4">
						{#if imagePreviewUrl}
							<div class="shrink-0">
								<img
									src={imagePreviewUrl}
									alt="Template preview"
									class="h-32 w-32 rounded-lg border border-gray-300 object-contain"
								/>
							</div>
						{/if}
						<div class="min-w-0 flex-1">
							<p class="text-sm font-medium text-gray-900">{templateImage.name}</p>
							<p class="mt-1 text-xs text-gray-500">
								{(templateImage.size / 1024).toFixed(1)} KB
							</p>
							<button
								type="button"
								onclick={removeImage}
								class="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
							>
								Remove
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
