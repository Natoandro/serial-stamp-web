<script lang="ts">
	import { v4 as uuidv4 } from 'uuid';
	import DataSourceList from '$lib/components/wizard/data-sources/DataSourceList.svelte';
	import SequentialSourceForm from '$lib/components/wizard/data-sources/SequentialSourceForm.svelte';
	import RandomSourceForm from '$lib/components/wizard/data-sources/RandomSourceForm.svelte';
	import CsvSourceForm from '$lib/components/wizard/data-sources/CsvSourceForm.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconPlus from '$lib/components/icons/IconPlus.svelte';
	import { cn } from '$lib/utils/cn';
	import type {
		DataSource,
		SequentialDataSource,
		RandomDataSource,
		CsvDataSource
	} from '$lib/types';

	interface Props {
		initialData?: DataSource[];
		onChange?: (dataSources: DataSource[]) => void | Promise<void>;
	}

	let { initialData = [], onChange }: Props = $props();

	// Internal state
	let dataSources = $state<DataSource[]>([]);
	let selectedType = $state<'sequential' | 'random' | 'csv'>('sequential');
	let isModalOpen = $state(false);
	let editingSource = $state<DataSource | null>(null);

	// Sync local state with prop to handle reactive resets from parent
	$effect(() => {
		dataSources = [...initialData];
	});

	async function handleAddSource(source: Omit<DataSource, 'id'>) {
		const updated = [...dataSources, { ...source, id: uuidv4() } as DataSource];
		dataSources = updated;
		closeModal();
		await onChange?.(updated);
	}

	async function handleUpdateSource(next: DataSource) {
		const updated = dataSources.map((s) => (s.id === next.id ? next : s));
		dataSources = updated;
		closeModal();
		await onChange?.(updated);
	}

	async function handleRemoveSource(id: string) {
		const updated = dataSources.filter((s) => s.id !== id);
		dataSources = updated;
		await onChange?.(updated);
	}

	function openAddModal() {
		editingSource = null;
		isModalOpen = true;
	}

	function handleEditRequest(id: string) {
		const source = dataSources.find((s) => s.id === id);
		if (source) {
			editingSource = source;
			selectedType = source.type;
			isModalOpen = true;
		}
	}

	function closeModal() {
		isModalOpen = false;
		editingSource = null;
	}

	// Expose current data for legacy/wizard access if needed
	export function getDataSources() {
		return dataSources;
	}
</script>

{#snippet typeButton(type: typeof selectedType, label: string)}
	<button
		type="button"
		onclick={() => (selectedType = type)}
		class={cn(
			'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
			selectedType === type
				? 'border-blue-600 bg-blue-600 text-white'
				: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
		)}
	>
		{label}
	</button>
{/snippet}

<div class="space-y-6">
	<div class="mb-6 flex items-start justify-between gap-4">
		<div>
			<h2 class="text-lg font-semibold text-gray-900">Data Sources</h2>
			<p class="mt-1 text-sm text-gray-600">Manage data sources that populate your stamps.</p>
		</div>
		<Button variant="secondary" onclick={openAddModal}>
			<IconPlus class="mr-2 h-4 w-4" />
			Add Source
		</Button>
	</div>

	<DataSourceList sources={dataSources} onRemove={handleRemoveSource} onEdit={handleEditRequest} />
</div>

<Modal
	open={isModalOpen}
	title={editingSource ? 'Edit Data Source' : 'Add Data Source'}
	onClose={closeModal}
>
	<div class="space-y-6">
		{#if !editingSource}
			<div class="space-y-2">
				<div class="block text-sm font-medium text-gray-700">Source Type</div>
				<div class="flex gap-2">
					{@render typeButton('sequential', 'Sequential')}
					{@render typeButton('random', 'Random')}
					{@render typeButton('csv', 'CSV')}
				</div>
			</div>
		{/if}

		<div class="border-t border-gray-100 pt-6">
			{#if selectedType === 'sequential'}
				<SequentialSourceForm
					initialData={editingSource?.type === 'sequential' ? editingSource : undefined}
					onAdd={handleAddSource}
					onUpdate={handleUpdateSource}
				/>
			{:else if selectedType === 'random'}
				<RandomSourceForm
					initialData={editingSource?.type === 'random' ? editingSource : undefined}
					onAdd={handleAddSource}
					onUpdate={handleUpdateSource}
				/>
			{:else if selectedType === 'csv'}
				<CsvSourceForm
					initialData={editingSource?.type === 'csv' ? editingSource : undefined}
					onAdd={handleAddSource}
					onUpdate={handleUpdateSource}
				/>
			{/if}
		</div>
	</div>
</Modal>
