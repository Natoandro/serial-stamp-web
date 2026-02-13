<script lang="ts">
	import { v4 as uuidv4 } from 'uuid';
	import DataSourceList from '$lib/components/wizard/data-sources/DataSourceList.svelte';
	import SequentialSourceForm from '$lib/components/wizard/data-sources/SequentialSourceForm.svelte';
	import RandomSourceForm from '$lib/components/wizard/data-sources/RandomSourceForm.svelte';
	import CsvSourceForm from '$lib/components/wizard/data-sources/CsvSourceForm.svelte';
	import type {
		DataSource,
		SequentialDataSource,
		RandomDataSource,
		CsvDataSource
	} from '$lib/types';

	interface Props {
		initialData?: DataSource[];
		onSubmit: (dataSources: DataSource[]) => void | Promise<void>;
		formId?: string;
	}

	let { initialData = [], onSubmit, formId = 'data-sources-form' }: Props = $props();

	// Internal state
	let dataSources = $state<DataSource[]>([]);
	let selectedType = $state<'sequential' | 'random' | 'csv'>('sequential');

	// Load initial values
	$effect(() => {
		dataSources = [...initialData];
	});

	function handleAddSequential(source: Omit<SequentialDataSource, 'id'>) {
		dataSources = [...dataSources, { ...source, id: uuidv4() }];
	}

	function handleAddRandom(source: Omit<RandomDataSource, 'id'>) {
		dataSources = [...dataSources, { ...source, id: uuidv4() }];
	}

	function handleAddCsv(source: Omit<CsvDataSource, 'id'>) {
		dataSources = [...dataSources, { ...source, id: uuidv4() }];
	}

	function handleRemoveSource(id: string) {
		dataSources = dataSources.filter((s) => s.id !== id);
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		await onSubmit(dataSources);
	}

	// Expose current data
	export function getDataSources() {
		return dataSources;
	}
</script>

<form id={formId} onsubmit={handleSubmit}>
	<div class="space-y-6">
		<DataSourceList sources={dataSources} onRemove={handleRemoveSource} />

		<!-- Source Type Selector -->
		<div>
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

		<!-- Hidden submit button for form.requestSubmit() -->
		<button type="submit" class="sr-only" tabindex="-1" aria-hidden="true">Submit</button>
	</div>
</form>
