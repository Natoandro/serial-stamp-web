<script lang="ts">
	import { useProjectsQuery, useDeleteProjectMutation } from '$lib/queries/projects.svelte';
	import type { Project } from '$lib/types';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ModalConfirm from '$lib/components/ui/ModalConfirm.svelte';
	import ProjectCard from '$lib/components/ui/ProjectCard.svelte';
	import IconPlus from '$lib/components/icons/IconPlus.svelte';
	import IconFolder from '$lib/components/icons/IconFolder.svelte';

	const projectsQuery = useProjectsQuery();
	const deleteMutation = useDeleteProjectMutation();

	let projectToDelete = $state<Project | null>(null);
	let showDeleteModal = $state(false);

	const deleteMessage = $derived(
		projectToDelete
			? `Are you sure you want to delete "${projectToDelete.eventName}"? This action cannot be undone.`
			: ''
	);

	function confirmDelete(project: Project) {
		projectToDelete = project;
		showDeleteModal = true;
	}

	async function handleDelete() {
		if (!projectToDelete) return;

		try {
			await deleteMutation.mutateAsync(projectToDelete.id);
			showDeleteModal = false;
			projectToDelete = null;
		} catch (error) {
			console.error('Failed to delete project:', error);
			alert('Failed to delete project. Please try again.');
		}
	}

	function cancelDelete() {
		showDeleteModal = false;
		projectToDelete = null;
	}
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white shadow-sm">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<h1 class="text-3xl font-bold tracking-tight text-gray-900">Serial Stamp</h1>
				<Button href="/projects/new/event-info">
					<IconPlus />
					New Project
				</Button>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		{#if projectsQuery.isLoading}
			<div class="flex items-center justify-center py-12">
				<div class="text-center">
					<div
						class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
					></div>
					<p class="mt-4 text-sm text-gray-600">Loading projects...</p>
				</div>
			</div>
		{:else if projectsQuery.isError}
			<div class="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
				<p class="text-red-600">Failed to load projects. Please try again.</p>
				<Button onclick={() => projectsQuery.refetch()} variant="secondary" class="mt-4">
					Retry
				</Button>
			</div>
		{:else if projectsQuery.data && projectsQuery.data.length === 0}
			<EmptyState
				title="No projects yet"
				description="Create your first ticket project to get started."
			>
				{#snippet icon()}
					<IconFolder class="mx-auto h-12 w-12" />
				{/snippet}
				{#snippet action()}
					<Button href="/projects/new/event-info">
						<IconPlus class="mr-1.5 -ml-0.5 h-5 w-5" />
						New Project
					</Button>
				{/snippet}
			</EmptyState>
		{:else if projectsQuery.data}
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each projectsQuery.data as project (project.id)}
					<ProjectCard {project} onDelete={confirmDelete} />
				{/each}
			</div>
		{/if}
	</main>
</div>

{#if showDeleteModal && projectToDelete}
	<ModalConfirm
		bind:open={showDeleteModal}
		title="Delete Project"
		description={deleteMessage}
		confirmLabel="Delete"
		cancelLabel="Cancel"
		variant="danger"
		onConfirm={handleDelete}
		onCancel={cancelDelete}
	/>
{/if}
