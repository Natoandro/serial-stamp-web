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

	function getThumbnailUrl(blob: Blob): string {
		return URL.createObjectURL(blob);
	}

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
		<img
			src={getThumbnailUrl(project.templateImage)}
			alt={project.eventName}
			class="h-full w-full object-contain"
		/>
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
