<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getContext, onMount } from 'svelte';
	import { isValidUUID } from '$lib/utils/uuid';
	import { v4 as uuidv4 } from 'uuid';
	import type { WizardState } from '$lib/stores/wizard.svelte';
	import { updateProject, getProject } from '$lib/data/projects';
	import DataSourceList from '$lib/components/wizard/data-sources/DataSourceList.svelte';
	import SequentialSourceForm from '$lib/components/wizard/data-sources/SequentialSourceForm.svelte';
	import RandomSourceForm from '$lib/components/wizard/data-sources/RandomSourceForm.svelte';
	import CsvSourceForm from '$lib/components/wizard/data-sources/CsvSourceForm.svelte';
	import type { SequentialDataSource, RandomDataSource, CsvDataSource } from '$lib/types';

	const wizardState = getContext<WizardState>('wizardState');
	const canProceedContext = getContext<{ value: boolean }>('canProceed');

	let selectedType = $state<'sequential' | 'random' | 'csv'>('sequential');

	const projectIdParam = $page.url.searchParams.get('projectId');
	let projectId = $state<string | null>(
		projectIdParam && isValidUUID(projectIdParam) ? projectIdParam : null
	);
	let isNavigating = $state(false);
	let isLoading = $state(false);

	onMount(async () => {
		if (!projectId) {
			// No project ID - redirect to step 1
			await goto('/projects/new/event-info');
			return;
		}

		isLoading = true;
		try {
			const project = await getProject(projectId);
			if (project) {
				wizardState.loadFromProject(project);
			} else {
				// Project not found - redirect to step 1
				await goto('/projects/new/event-info');
			}
		} catch (error) {
			console.error('Failed to load project:', error);
			await goto('/projects/new/event-info');
		} finally {
			isLoading = false;
		}
	});

	// Always allow proceeding (data sources are optional)
	$effect(() => {
		canProceedContext.value = !isNavigating && !isLoading;
	});

	// Override the next button to save the project
	const onFinishContext = getContext<{ value: (() => void | Promise<void>) | null }>('onFinish');

	$effect(() => {
		onFinishContext.value = handleNext;
		return () => {
			onFinishContext.value = null;
		};
	});

	async function handleNext() {
		if (isNavigating || !projectId) return;

		isNavigating = true;
		try {
			await updateProject(projectId, {
				dataSources: wizardState.dataSources
			});

			await goto(`/projects/new/stamps?projectId=${projectId}`);
		} catch (error) {
			console.error('Failed to update project:', error);
			alert('Failed to save data sources. Please try again.');
		} finally {
			isNavigating = false;
		}
	}

	function handleAddSequential(source: Omit<SequentialDataSource, 'id'>) {
		wizardState.dataSources = [...wizardState.dataSources, { ...source, id: uuidv4() }];
	}

	function handleAddRandom(source: Omit<RandomDataSource, 'id'>) {
		wizardState.dataSources = [...wizardState.dataSources, { ...source, id: uuidv4() }];
	}

	function handleAddCsv(source: Omit<CsvDataSource, 'id'>) {
		wizardState.dataSources = [...wizardState.dataSources, { ...source, id: uuidv4() }];
	}

	function handleRemoveSource(id: string) {
		wizardState.dataSources = wizardState.dataSources.filter((s) => s.id !== id);
	}
</script>

{#if isLoading}
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

		<DataSourceList sources={wizardState.dataSources} onRemove={handleRemoveSource} />

		<!-- Source Type Selector -->
		<div class="mb-6">
			<div class="block text-sm font-medium text-gray-700">Add Data Source</div>
			<div class="mt-2 flex gap-2">
				<button
					type="button"
					onclick={() => (selectedType = 'sequential')}
					class="rounded-md px-4 py-2 text-sm font-medium transition-colors
						{selectedType === 'sequential'
						? 'bg-blue-600 text-white'
						: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
				>
					Sequential
				</button>
				<button
					type="button"
					onclick={() => (selectedType = 'random')}
					class="rounded-md px-4 py-2 text-sm font-medium transition-colors
						{selectedType === 'random'
						? 'bg-blue-600 text-white'
						: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
				>
					Random
				</button>
				<button
					type="button"
					onclick={() => (selectedType = 'csv')}
					class="rounded-md px-4 py-2 text-sm font-medium transition-colors
						{selectedType === 'csv' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
				>
					CSV
				</button>
			</div>
		</div>

		<!-- Source Forms -->
		{#if selectedType === 'sequential'}
			<SequentialSourceForm onAdd={handleAddSequential} />
		{:else if selectedType === 'random'}
			<RandomSourceForm onAdd={handleAddRandom} />
		{:else if selectedType === 'csv'}
			<CsvSourceForm onAdd={handleAddCsv} />
		{/if}

		{#if isNavigating}
			<div class="mt-6 text-center text-sm text-gray-600">Saving...</div>
		{/if}
	</div>
{/if}
