<script lang="ts">
	import { page } from '$app/state';
	import { isValidUUID } from '$lib/utils/uuid';
	import { useProjectQuery } from '$lib/queries/projects.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconArrowLeft from '$lib/components/icons/IconArrowLeft.svelte';

	const projectId = $derived(page.params.projectId || '');
	const isValidId = $derived(isValidUUID(projectId));

	const query = $derived(useProjectQuery(isValidId ? projectId : null));
	const project = $derived(query.data);
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white shadow-sm">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<Button href="/" variant="ghost" class="p-2" aria-label="Back to projects">
						<IconArrowLeft />
					</Button>
					<h1 class="text-3xl font-bold tracking-tight text-gray-900">
						{project?.eventName || 'Loading...'}
					</h1>
				</div>
				{#if project}
					<Button href="/projects/{projectId}/sheet">Sheet Layout</Button>
				{/if}
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		{#if query.isLoading}
			<div class="flex items-center justify-center py-12">
				<div class="text-center">
					<div
						class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
					></div>
					<p class="mt-4 text-sm text-gray-600">Loading project...</p>
				</div>
			</div>
		{:else if query.isError || !isValidId}
			<div class="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
				<p class="text-red-600">
					{!isValidId ? 'Invalid project ID' : 'Project not found'}
				</p>
				<Button href="/" variant="secondary" class="mt-4">Back to Projects</Button>
			</div>
		{:else if project}
			<div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
				<p class="text-gray-500">Ticket editor coming soon (Phase 2)</p>
				<div class="mt-4 text-sm text-gray-400">
					<p>Stamps: {project.stamps.length}</p>
					<p>Data sources: {project.dataSources.length}</p>
				</div>
			</div>
		{/if}
	</main>
</div>
