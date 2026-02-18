<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getContext, onMount } from 'svelte';
	import { isValidUUID } from '$lib/utils/uuid';
	import { wizardState } from '$lib/stores/wizard.svelte';
	import { useProjectQuery } from '$lib/queries/projects.svelte';

	const canProceedContext = getContext<{ value: boolean }>('canProceed');

	const projectIdParam = page.url.searchParams.get('projectId');
	let projectId = $state<string | null>(
		projectIdParam && isValidUUID(projectIdParam) ? projectIdParam : null
	);
	let isNavigating = $state(false);

	const projectQuery = $derived(useProjectQuery(projectId));

	onMount(async () => {
		if (!projectId) {
			// No project ID - redirect to step 1
			await goto('/projects/new/event-info');
			return;
		}
	});

	// Load project data into wizard state when query succeeds
	$effect(() => {
		if (projectQuery.data) {
			wizardState.loadFromProject(projectQuery.data);
		} else if (projectQuery.isError) {
			// Project not found - redirect to step 1
			void goto('/projects/new/event-info');
		}
	});

	$effect(() => {
		canProceedContext.value = projectId !== null && !isNavigating && !projectQuery.isLoading;
	});

	const onFinishContext = getContext<{ value: (() => void | Promise<void>) | null }>('onFinish');

	$effect(() => {
		onFinishContext.value = handleFinish;
		return () => {
			onFinishContext.value = null;
		};
	});

	async function handleFinish() {
		if (!projectId || isNavigating) return;

		isNavigating = true;
		try {
			// Reset wizard state
			wizardState.reset();

			// Navigate to the project editor
			await goto(`/projects/${projectId}`);
		} catch (error) {
			console.error('Navigation error:', error);
		} finally {
			isNavigating = false;
		}
	}
</script>

{#if projectQuery.isLoading}
	<div class="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-8">
		<div class="text-center">
			<div
				class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
			></div>
			<p class="mt-4 text-sm text-gray-600">Loading project...</p>
		</div>
	</div>
{:else}
	<div class="rounded-lg border border-gray-200 bg-white p-8">
		<div class="mb-6">
			<h2 class="text-2xl font-bold text-gray-900">Stamps</h2>
			<p class="mt-2 text-sm text-gray-600">
				You can add stamps later in the ticket editor. Click "Create Project" to continue.
			</p>
		</div>

		<div class="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
			<svg
				class="mx-auto h-12 w-12 text-gray-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
				/>
			</svg>
			<h3 class="mt-2 text-sm font-medium text-gray-900">Stamp Editor</h3>
			<p class="mt-1 text-sm text-gray-500">
				Stamps will be added in the next phase using the visual editor.
			</p>
		</div>

		{#if isNavigating}
			<div class="mt-6 text-center text-sm text-gray-600">Opening project...</div>
		{/if}
	</div>
{/if}
