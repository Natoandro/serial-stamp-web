<script lang="ts">
	import { cn } from '$lib/utils/cn';

	interface Props {
		id?: string;
		file?: File | null;
		currentImage?: Blob | null;
		required?: boolean;
		disabled?: boolean;
		class?: string;
		label?: string;
		hint?: string;
		error?: string;
		onchange?: (file: File | null) => void;
	}

	let {
		id,
		file = $bindable(null),
		currentImage = null,
		required = false,
		disabled = false,
		class: className = '',
		label,
		hint,
		error,
		onchange,
		...props
	}: Props = $props();

	const inputId = $derived(id || `image-upload-${Math.random().toString(36).slice(2, 9)}`);
	const hasError = $derived(!!error);

	let previewUrl = $state<string | null>(null);
	let currentImageUrl = $state<string | null>(null);

	// Create URL for current image
	$effect(() => {
		if (currentImage) {
			const url = URL.createObjectURL(currentImage);
			currentImageUrl = url;
			return () => {
				URL.revokeObjectURL(url);
			};
		} else {
			currentImageUrl = null;
		}
	});

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const selectedFile = input.files?.[0] || null;

		if (selectedFile) {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
			previewUrl = URL.createObjectURL(selectedFile);
		}

		file = selectedFile;
		onchange?.(selectedFile);
	}

	function removeFile() {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			previewUrl = null;
		}
		file = null;
		onchange?.(null);
	}
</script>

<div class={cn('space-y-1', className)}>
	{#if label}
		<label for={inputId} class="block text-sm font-medium text-gray-700">
			{label}
			{#if required}
				<span class="text-red-500">*</span>
			{/if}
		</label>
	{/if}

	{#if hint}
		<p class="text-sm text-gray-500">{hint}</p>
	{/if}

	{#if !file && !currentImage}
		<label
			for={inputId}
			class={cn(
				'flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 transition-colors',
				hasError ? 'border-red-300 hover:border-red-400' : 'border-gray-300 hover:border-gray-400',
				disabled && 'cursor-not-allowed opacity-50'
			)}
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
			id={inputId}
			accept="image/*"
			onchange={handleFileChange}
			{required}
			{disabled}
			class="sr-only"
			{...props}
		/>
	{:else if file}
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
			<div class="flex items-start gap-4">
				{#if previewUrl}
					<div class="shrink-0">
						<img
							src={previewUrl}
							alt="Preview"
							class="h-32 w-32 rounded-lg border border-gray-300 object-contain"
						/>
					</div>
				{/if}
				<div class="min-w-0 flex-1">
					<p class="text-sm font-medium text-gray-900">{file.name}</p>
					<p class="mt-1 text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
					<button
						type="button"
						onclick={removeFile}
						class="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
					>
						Remove
					</button>
				</div>
			</div>
		</div>
	{:else if currentImage}
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
			<div class="flex items-start gap-4">
				{#if currentImageUrl}
					<div class="shrink-0">
						<img
							src={currentImageUrl}
							alt="Current template"
							class="h-32 w-32 rounded-lg border border-gray-300 object-contain"
						/>
					</div>
				{/if}
				<div class="min-w-0 flex-1">
					<p class="text-sm font-medium text-gray-900">Current template image</p>
					<p class="mt-1 text-xs text-gray-500">{(currentImage.size / 1024).toFixed(1)} KB</p>
					<label
						for={inputId}
						class="mt-2 inline-block cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-500"
					>
						Replace
					</label>
					<input
						type="file"
						id={inputId}
						accept="image/*"
						onchange={handleFileChange}
						{disabled}
						class="sr-only"
						{...props}
					/>
				</div>
			</div>
		</div>
	{/if}

	{#if error}
		<p class="text-sm text-red-600">{error}</p>
	{/if}
</div>
