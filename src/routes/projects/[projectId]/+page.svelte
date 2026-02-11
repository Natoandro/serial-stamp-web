<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getProject } from '$lib/data/projects';
	import type { Project } from '$lib/types';

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

	async function handleBack() {
		await goto('/');
	}

	async function handleSheetLayout() {
		await goto(`/projects/${projectId}/sheet`);
	}
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white shadow-sm">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<button
						onclick={handleBack}
						class="rounded-md p-2 text-gray-400 hover:text-gray-600"
						aria-label="Back to projects"
					>
						<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 19l-7-7m0 0l7-7m-7 7h18"
							/>
						</svg>
					</button>
					<h1 class="text-3xl font-bold tracking-tight text-gray-900">
						{project?.name || 'Loading...'}
					</h1>
				</div>
				{#if project}
					<button
						onclick={handleSheetLayout}
						class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
					>
						Sheet Layout
					</button>
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
				<button
					onclick={handleBack}
					class="mt-4 rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-red-300 ring-inset hover:bg-gray-50"
				>
					Back to Projects
				</button>
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
