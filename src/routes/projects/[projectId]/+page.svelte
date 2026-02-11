<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { getProject } from '$lib/data/projects';
	import type { Project } from '$lib/types';
	import Button from '$lib/components/ui/Button.svelte';
	import IconArrowLeft from '$lib/components/icons/IconArrowLeft.svelte';

	let project = $state<Project | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	const projectId = $derived($page.params.projectId || '');

	onMount(async () => {
		await loadProject();
	});

	async function loadProject() {
		loading = true;
		error = null;

		if (!projectId) {
			error = 'Invalid project ID';
			loading = false;
			return;
		}

		try {
			const p = await getProject(projectId);
			if (!p) {
				error = 'Project not found';
			} else {
				project = p;
			}
		} catch (err) {
			console.error('Failed to load project:', err);
			error = 'Failed to load project';
		} finally {
			loading = false;
		}
	}
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
						{project?.name || 'Loading...'}
					</h1>
				</div>
				{#if project}
					<Button href="/projects/{projectId}/sheet">Sheet Layout</Button>
				{/if}
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="text-gray-500">Loading project...</div>
			</div>
		{:else if error}
			<div class="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
				<p class="text-red-600">{error}</p>
				<Button href="/" variant="secondary" class="mt-4">Back to Projects</Button>
			</div>
		{:else}
			<div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
				<p class="text-gray-500">Ticket editor coming soon (Phase 2)</p>
				<div class="mt-4 text-sm text-gray-400">
					<p>Stamps: {project?.stamps.length || 0}</p>
					<p>Data sources: {project?.dataSources.length || 0}</p>
				</div>
			</div>
		{/if}
	</main>
</div>
