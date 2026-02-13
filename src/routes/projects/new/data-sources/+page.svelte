<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getContext, onMount } from 'svelte';
	import { isValidUUID } from '$lib/utils/uuid';
	import type { WizardState } from '$lib/stores/wizard.svelte';
	import { useProjectQuery, useUpdateProjectMutation } from '$lib/queries/projects.svelte';
	import DataSourcesForm from '$lib/components/forms/DataSourcesForm.svelte';
	import type { DataSource } from '$lib/types';

	const wizardState = getContext<WizardState>('wizardState');
	const canProceedContext = getContext<{ value: boolean }>('canProceed');

	const projectIdParam = page.url.searchParams.get('projectId');
	let projectId = $state<string | null>(
		projectIdParam && isValidUUID(projectIdParam) ? projectIdParam : null
	);
	let isNavigating = $state(false);

	const projectQuery = $derived(useProjectQuery(projectId));
	const updateMutation = useUpdateProjectMutation();

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

	// Always allow proceeding (data sources are optional)
	$effect(() => {
		canProceedContext.value = !isNavigating && !projectQuery.isLoading;
	});

	// Override the next button to submit the form
	const onFinishContext = getContext<{ value: (() => void | Promise<void>) | null }>('onFinish');

	$effect(() => {
		onFinishContext.value = handleNext;
		return () => {
			onFinishContext.value = null;
		};
	});

	function handleNext() {
		// Trigger form submission
		const form = document.getElementById('data-sources-form') as HTMLFormElement;
		form?.requestSubmit();
	}

	async function handleSubmit(dataSources: DataSource[]) {
		if (isNavigating || !projectId) return;

		// Update wizard state
		wizardState.dataSources = dataSources;

		isNavigating = true;
		try {
			await updateMutation.mutateAsync({
				id: projectId,
				data: {
					dataSources
				}
			});

			await goto(`/projects/new/stamps?projectId=${projectId}`);
		} catch (error) {
			console.error('Failed to update project:', error);
			alert('Failed to save data sources. Please try again.');
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
			<h2 class="text-2xl font-bold text-gray-900">Data Sources</h2>
			<p class="mt-2 text-sm text-gray-600">
				Add data sources that will populate your stamps. You can add multiple sources and reference
				them in your stamp templates.
			</p>
		</div>

		<DataSourcesForm initialData={wizardState.dataSources} onSubmit={handleSubmit} />

		{#if isNavigating}
			<div class="mt-6 text-center text-sm text-gray-600">Saving...</div>
		{/if}
	</div>
{/if}
