<script lang="ts">
	import { generateWasmPreview } from '$lib/services/wasmPreview';
	import type { Project, SheetLayout } from '$lib/types';

	interface Props {
		project: Project;
		layout: SheetLayout;
	}

	let { project, layout }: Props = $props();

	let previewUrl = $state<string | null>(null);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

	// Generate preview when dependencies change (debounced)
	$effect(() => {
		// Track dependencies
		const deps = {
			templateImage: project.templateImage,
			stamps: project.stamps,
			dataSources: project.dataSources,
			layout: layout
		};

		if (!deps.templateImage) {
			previewUrl = null;
			error = null;
			isLoading = false;
			if (debounceTimeout) clearTimeout(debounceTimeout);
			return;
		}

		// Clear existing timeout
		if (debounceTimeout) {
			clearTimeout(debounceTimeout);
		}

		// Show loading immediately
		isLoading = true;
		error = null;

		// Debounce the actual preview generation
		debounceTimeout = setTimeout(async () => {
			try {
				// All rendering happens in WASM - fast!
				const dataUrl = await generateWasmPreview(project, layout);
				previewUrl = dataUrl;
			} catch (err) {
				console.error('Failed to generate preview:', err);
				error = err instanceof Error ? err.message : 'Failed to generate preview';
				previewUrl = null;
			} finally {
				isLoading = false;
			}
		}, 300); // 300ms debounce
	});
</script>

<div class="flex h-full items-center justify-center bg-gray-100">
	{#if isLoading}
		<div class="flex h-full items-center justify-center">
			<div class="text-center">
				<div
					class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
				></div>
				<p class="mt-4 text-sm text-gray-600">Generating preview...</p>
			</div>
		</div>
	{:else if error}
		<div class="flex h-full items-center justify-center text-red-600">
			<div class="text-center">
				<p class="text-sm font-medium">Preview Error</p>
				<p class="mt-1 text-xs text-gray-600">{error}</p>
			</div>
		</div>
	{:else if previewUrl}
		<img src={previewUrl} alt="Sheet preview" class="h-full w-full object-contain" />
	{:else}
		<div class="flex h-full items-center justify-center text-gray-500">
			<p class="text-sm">No preview available</p>
		</div>
	{/if}
</div>
