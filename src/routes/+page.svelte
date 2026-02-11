<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { listProjects, deleteProject } from '$lib/data/projects';
	import type { Project } from '$lib/types';

	let projects = $state<Project[]>([]);
	let loading = $state(true);
	let projectToDelete = $state<Project | null>(null);

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

	async function handleNewProject() {
		await goto('/projects/new');
	}

	async function handleOpenProject(project: Project) {
		await goto(`/projects/${project.id}`);
	}

	function confirmDelete(project: Project) {
		projectToDelete = project;
	}

	function cancelDelete() {
		projectToDelete = null;
	}

	async function handleDelete() {
		if (!projectToDelete) return;

		try {
			await deleteProject(projectToDelete.id);
			await loadProjects();
			projectToDelete = null;
		} catch (error) {
			console.error('Failed to delete project:', error);
		}
	}

	function formatDate(date: Date): string {
		return new Date(date).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function getThumbnailUrl(blob: Blob): string {
		return URL.createObjectURL(blob);
	}
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white shadow-sm">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<h1 class="text-3xl font-bold tracking-tight text-gray-900">Serial Stamp</h1>
				<button
					onclick={handleNewProject}
					class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
				>
					New Project
				</button>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="text-gray-500">Loading projects...</div>
			</div>
		{:else if projects.length === 0}
			<div class="py-12 text-center">
				<svg
					class="mx-auto h-12 w-12 text-gray-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					aria-hidden="true"
				>
					<path
						vector-effect="non-scaling-stroke"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
					/>
				</svg>
				<h3 class="mt-2 text-sm font-semibold text-gray-900">No projects</h3>
				<p class="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
				<div class="mt-6">
					<button
						onclick={handleNewProject}
						class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
					>
						<svg class="mr-1.5 -ml-0.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
							<path
								d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"
							/>
						</svg>
						New Project
					</button>
				</div>
			</div>
		{:else}
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each projects as project (project.id)}
					<div
						class="group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
						role="button"
						tabindex="0"
						onclick={() => handleOpenProject(project)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								handleOpenProject(project);
							}
						}}
					>
						<div class="aspect-4/3 bg-gray-100">
							<img
								src={getThumbnailUrl(project.templateImage)}
								alt={project.name}
								class="h-full w-full object-contain"
							/>
						</div>
						<div class="flex flex-1 flex-col p-4">
							<h3 class="text-lg font-semibold text-gray-900">{project.name}</h3>
							<div class="mt-2 flex items-center gap-4 text-sm text-gray-500">
								<div class="flex items-center gap-1">
									<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
										/>
									</svg>
									<span>{project.stamps.length} stamps</span>
								</div>
								<div class="flex items-center gap-1">
									<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
										/>
									</svg>
									<span>{project.dataSources.length} sources</span>
								</div>
							</div>
							<p class="mt-2 text-xs text-gray-500">Created {formatDate(project.createdAt)}</p>
						</div>
						<div
							class="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
						>
							<button
								onclick={(e) => {
									e.stopPropagation();
									confirmDelete(project);
								}}
								class="rounded-md bg-white p-2 text-gray-400 shadow-sm hover:text-red-600 focus:outline-none"
								aria-label="Delete project"
							>
								<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									/>
								</svg>
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</main>
</div>

<!-- Delete Confirmation Modal -->
{#if projectToDelete}
	<div class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog">
		<div
			class="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0"
		>
			<button
				class="bg-opacity-75 fixed inset-0 bg-gray-500 transition-opacity"
				onclick={cancelDelete}
				aria-label="Close modal"
			></button>

			<div
				class="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle"
			>
				<div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
					<div class="sm:flex sm:items-start">
						<div
							class="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"
						>
							<svg
								class="h-6 w-6 text-red-600"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
								/>
							</svg>
						</div>
						<div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
							<h3 class="text-base leading-6 font-semibold text-gray-900" id="modal-title">
								Delete project
							</h3>
							<div class="mt-2">
								<p class="text-sm text-gray-500">
									Are you sure you want to delete "{projectToDelete.name}"? This action cannot be
									undone.
								</p>
							</div>
						</div>
					</div>
				</div>
				<div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
					<button
						onclick={handleDelete}
						class="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
					>
						Delete
					</button>
					<button
						onclick={cancelDelete}
						class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset hover:bg-gray-50 sm:mt-0 sm:w-auto"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
