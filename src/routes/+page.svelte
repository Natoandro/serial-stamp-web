<script lang="ts">
	import { onMount } from 'svelte';
	import { listProjects, deleteProject } from '$lib/data/projects';
	import type { Project } from '$lib/types';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ProjectCard from '$lib/components/ui/ProjectCard.svelte';
	import IconPlus from '$lib/components/icons/IconPlus.svelte';
	import IconFolder from '$lib/components/icons/IconFolder.svelte';
	import IconWarning from '$lib/components/icons/IconWarning.svelte';

	let projects = $state<Project[]>([]);
	let loading = $state(true);
	let projectToDelete = $state<Project | null>(null);
	let showDeleteModal = $state(false);

	onMount(async () => {
		await loadProjects();
	});

	async function loadProjects() {
		loading = true;
		try {
			projects = await listProjects();
		} catch (error) {
			console.error('Failed to load projects:', error);
		} finally {
			loading = false;
		}
	}

	function confirmDelete(project: Project) {
		projectToDelete = project;
		showDeleteModal = true;
	}

	function cancelDelete() {
		projectToDelete = null;
		showDeleteModal = false;
	}

	async function handleDelete() {
		if (!projectToDelete) return;

		try {
			await deleteProject(projectToDelete.id);
			await loadProjects();
			cancelDelete();
		} catch (error) {
			console.error('Failed to delete project:', error);
		}
	}
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white shadow-sm">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<h1 class="text-3xl font-bold tracking-tight text-gray-900">Serial Stamp</h1>
				<Button href="/projects/new">New Project</Button>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="text-gray-500">Loading projects...</div>
			</div>
		{:else if projects.length === 0}
			<EmptyState title="No projects" description="Get started by creating a new project.">
				{#snippet icon()}
					<IconFolder class="mx-auto h-12 w-12" />
				{/snippet}
				{#snippet action()}
					<Button href="/projects/new">
						<IconPlus class="mr-1.5 -ml-0.5 h-5 w-5" />
						New Project
					</Button>
				{/snippet}
			</EmptyState>
		{:else}
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each projects as project (project.id)}
					<ProjectCard {project} onDelete={confirmDelete} />
				{/each}
			</div>
		{/if}
	</main>
</div>

<Modal bind:open={showDeleteModal} title="Delete project" onClose={cancelDelete}>
	<div class="sm:flex sm:items-start">
		<div
			class="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"
		>
			<IconWarning class="h-6 w-6 text-red-600" />
		</div>
		<div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
			<p class="text-sm text-gray-500">
				Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be undone.
			</p>
		</div>
	</div>

	{#snippet actions()}
		<Button variant="danger" onclick={handleDelete}>Delete</Button>
		<Button variant="secondary" onclick={cancelDelete}>Cancel</Button>
	{/snippet}
</Modal>
