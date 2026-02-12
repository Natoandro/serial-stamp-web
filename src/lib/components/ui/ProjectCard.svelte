<script lang="ts">
	import IconTag from '$lib/components/icons/IconTag.svelte';
	import IconDocument from '$lib/components/icons/IconDocument.svelte';
	import IconTrash from '$lib/components/icons/IconTrash.svelte';
	import type { Project } from '$lib/types';

	let {
		project,
		onDelete
	}: {
		project: Project;
		onDelete?: (project: Project) => void;
	} = $props();

	let thumbnailUrl = $state<string>('');

	$effect(() => {
		// Create new URL if we have a valid Blob
		if (
			project.templateImage &&
			project.templateImage instanceof Blob &&
			project.templateImage.size > 0
		) {
			try {
				thumbnailUrl = URL.createObjectURL(project.templateImage);
			} catch (error) {
				console.error('Failed to create thumbnail URL:', error);
				thumbnailUrl = '';
			}
		} else {
			thumbnailUrl = '';
		}

		// Return cleanup function
		return () => {
			if (thumbnailUrl) {
				URL.revokeObjectURL(thumbnailUrl);
			}
		};
	});

	function formatDate(date: Date): string {
		return new Date(date).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function handleDelete(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (onDelete) {
			onDelete(project);
		}
	}
</script>

<a
	href="/projects/{project.id}"
	class="group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
>
	<div class="aspect-4/3 bg-gray-100">
		{#if thumbnailUrl}
			<img src={thumbnailUrl} alt={project.eventName} class="h-full w-full object-contain" />
		{:else}
			<div class="flex h-full w-full items-center justify-center text-gray-400">
				<svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
			</div>
		{/if}
	</div>
	<div class="flex flex-1 flex-col p-4">
		<h3 class="text-lg font-semibold text-gray-900">{project.eventName}</h3>
		<p class="text-sm text-gray-600">{project.eventOrganizer}</p>
		<div class="mt-1 flex items-center gap-2 text-sm text-gray-500">
			<span>{project.ticketType}</span>
			<span>•</span>
			<span>{new Date(project.eventDate).toLocaleDateString()}</span>
		</div>
		<div class="mt-2 flex items-center gap-4 text-sm text-gray-500">
			<div class="flex items-center gap-1">
				<IconTag />
				<span>{project.stamps.length} stamps</span>
			</div>
			<div class="flex items-center gap-1">
				<IconDocument />
				<span>{project.dataSources.length} sources</span>
			</div>
		</div>
		<p class="mt-2 text-xs text-gray-500">Created {formatDate(project.createdAt)}</p>
	</div>
	{#if onDelete}
		<div class="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
			<button
				onclick={handleDelete}
				class="rounded-md bg-white p-2 text-gray-400 shadow-sm hover:text-red-600 focus:outline-none"
				aria-label="Delete project"
			>
				<IconTrash />
			</button>
		</div>
	{/if}
</a>
