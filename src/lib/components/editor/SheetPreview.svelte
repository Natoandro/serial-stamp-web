<script lang="ts">
	import { renderWasmPreviewToCanvas, clearTemplateCache } from '$lib/services/wasmPreview';
	import type { Project, SheetLayout } from '$lib/types';

	interface Props {
		project: Project;
		layout: SheetLayout;
	}

	let { project, layout }: Props = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
	let isFirstRender = $state(true);

	// Generate preview when dependencies change (debounced, direct canvas rendering)
	$effect(() => {
		// Track dependencies
		const deps = {
			templateImage: project.templateImage,
			stamps: project.stamps,
			dataSources: project.dataSources,
			layout: layout
		};

		if (!deps.templateImage || !canvas) {
			error = null;
			isLoading = false;
			if (debounceTimeout) clearTimeout(debounceTimeout);
			return;
		}

		// Clear existing timeout
		if (debounceTimeout) {
			clearTimeout(debounceTimeout);
		}

		// Only show loading spinner on first render
		if (isFirstRender) {
			isLoading = true;
		}
		error = null;

		// Debounce the actual preview generation (reduced to 100ms for snappier feel)
		debounceTimeout = setTimeout(async () => {
			try {
				// Render directly to canvas - no PNG encoding overhead!
				await renderWasmPreviewToCanvas(project, layout, canvas!);
				isFirstRender = false;
			} catch (err) {
				console.error('Failed to generate preview:', err);
				error = err instanceof Error ? err.message : 'Failed to generate preview';
			} finally {
				isLoading = false;
			}
		}, 100); // Reduced from 300ms to 100ms - WASM is fast enough
	});

	// Track template changes to clear cache
	let previousTemplate = $state<Blob | null>(null);
	$effect(() => {
		if (project.templateImage !== previousTemplate) {
			clearTemplateCache();
			previousTemplate = project.templateImage;
		}
	});
</script>

<div class="flex h-full items-center justify-center bg-gray-100">
	{#if isLoading && isFirstRender}
		<!-- Only show spinner on first load, not on updates -->
		<div class="absolute inset-0 z-10 flex items-center justify-center bg-gray-100">
			<div class="text-center">
				<div
					class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
				></div>
				<p class="mt-4 text-sm text-gray-600">Generating preview...</p>
			</div>
		</div>
	{/if}

	{#if error}
		<div class="absolute inset-0 z-10 flex items-center justify-center bg-gray-100 text-red-600">
			<div class="text-center">
				<p class="text-sm font-medium">Preview Error</p>
				<p class="mt-1 text-xs text-gray-600">{error}</p>
			</div>
		</div>
	{/if}

	<!-- Canvas is always visible - shows previous preview while new one renders -->
	<canvas
		bind:this={canvas}
		class="h-full w-full object-contain"
		class:opacity-50={isLoading && !isFirstRender}
		style="image-rendering: auto;"
	></canvas>
</div>
