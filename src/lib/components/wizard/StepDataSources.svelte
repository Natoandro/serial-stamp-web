<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { DataSource } from '$lib/types';
	import { v4 as uuidv4 } from 'uuid';
	import SequentialSourceForm from './data-sources/SequentialSourceForm.svelte';
	import RandomSourceForm from './data-sources/RandomSourceForm.svelte';
	import CsvSourceForm from './data-sources/CsvSourceForm.svelte';
	import DataSourceList from './data-sources/DataSourceList.svelte';

	interface Props {
		data: Record<string, unknown>;
	}

	let { data = $bindable() }: Props = $props();

	const dispatch = createEventDispatcher<{
		validate: { canProceed: boolean };
		data: Record<string, unknown>;
	}>();

	type SourceType = 'sequential' | 'random' | 'csv';

	let selectedType = $state<SourceType>('sequential');
	let dataSources = $state<DataSource[]>((data.dataSources as DataSource[]) || []);

	const isValid = $derived(dataSources.length > 0);

	$effect(() => {
		dispatch('validate', { canProceed: isValid });
	});

	$effect(() => {
		if (isValid) {
			dispatch('data', { dataSources });
		}
	});

	function addSource(source: Omit<DataSource, 'id'>) {
		dataSources = [...dataSources, { ...source, id: uuidv4() } as DataSource];
	}

	function removeSource(id: string) {
		dataSources = dataSources.filter((s) => s.id !== id);
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white p-8">
	<div class="mb-6">
		<h2 class="text-2xl font-bold text-gray-900">Data Sources</h2>
		<p class="mt-2 text-sm text-gray-600">
			Configure how data will be generated for your tickets. You can add multiple data sources.
		</p>
	</div>

	<DataSourceList
		sources={dataSources}
		onRemove={removeSource}
		onUpdate={(next) => {
			dataSources = dataSources.map((s) => (s.id === next.id ? next : s));
		}}
	/>

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
		<SequentialSourceForm onAdd={addSource} />
	{:else if selectedType === 'random'}
		<RandomSourceForm onAdd={addSource} />
	{:else if selectedType === 'csv'}
		<CsvSourceForm onAdd={addSource} />
	{/if}

	{#if dataSources.length === 0}
		<p class="mt-4 text-sm text-gray-500">
			Please add at least one data source to continue. Data sources define the values that will be
			used in your stamps.
		</p>
	{/if}
</div>
