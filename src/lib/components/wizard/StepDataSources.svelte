<script lang="ts">
	import { v4 as uuidv4 } from 'uuid';
	import DataSourceList from './data-sources/DataSourceList.svelte';
	import SequentialSourceForm from './data-sources/SequentialSourceForm.svelte';
	import RandomSourceForm from './data-sources/RandomSourceForm.svelte';
	import CsvSourceForm from './data-sources/CsvSourceForm.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconPlus from '$lib/components/icons/IconPlus.svelte';
	import { cn } from '$lib/utils/cn';
	import type { DataSource } from '$lib/types';

	interface Props {
		initialData?: DataSource[];
		onNext: (data: DataSource[]) => void;
		onBack: () => void;
	}

	let { initialData = [], onNext, onBack }: Props = $props();

	// Internal state
	let dataSources = $state<DataSource[]>([]);
	let selectedType = $state<'sequential' | 'random' | 'csv'>('sequential');
	let isModalOpen = $state(false);
	let editingSource = $state<DataSource | null>(null);

	// Sync local state with prop
	$effect(() => {
		dataSources = [...initialData];
	});

	async function handleAddSource(source: Omit<DataSource, 'id'>) {
		dataSources = [...dataSources, { ...source, id: uuidv4() } as DataSource];
		closeModal();
	}

	async function handleUpdateSource(next: DataSource) {
		dataSources = dataSources.map((s) => (s.id === next.id ? next : s));
		closeModal();
	}

	function handleRemoveSource(id: string) {
		dataSources = dataSources.filter((s) => s.id !== id);
	}

	function handleEditRequest(id: string) {
		const source = dataSources.find((s) => s.id === id);
		if (source) {
			editingSource = source;
			selectedType = source.type;
			isModalOpen = true;
		}
	}

	function openAddModal() {
		editingSource = null;
		isModalOpen = true;
	}

	function closeModal() {
		isModalOpen = false;
		editingSource = null;
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

<div class="space-y-8">
	<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
		<div class="mb-6 flex items-center justify-between">
			<div>
				<h3 class="text-sm font-medium text-gray-900">Configured Data Sources</h3>
				<p class="text-xs text-gray-500">Add sequential numbers, random codes, or upload a CSV.</p>
			</div>
			<Button variant="secondary" size="sm" onclick={openAddModal}>
				<IconPlus class="mr-2 h-4 w-4" />
				Add Source
			</Button>
		</div>

		<DataSourceList
			sources={dataSources}
			onRemove={handleRemoveSource}
			onEdit={handleEditRequest}
		/>

		{#if dataSources.length === 0}
			<div class="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
				<p class="text-sm text-gray-500">No data sources added yet.</p>
				<button
					type="button"
					onclick={openAddModal}
					class="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500"
				>
					Add your first source
				</button>
			</div>
		{/if}
	</div>

	<div class="flex justify-between pt-4">
		<Button variant="secondary" onclick={onBack}>Back</Button>
		<Button onclick={() => onNext(dataSources)} disabled={dataSources.length === 0}>
			Next: Configure Stamps
		</Button>
	</div>
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
