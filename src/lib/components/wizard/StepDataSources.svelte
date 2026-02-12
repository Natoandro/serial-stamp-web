<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { DataSource } from '$lib/types';
	import { v4 as uuidv4 } from 'uuid';

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

	// Sequential form state
	let seqPrefix = $state('');
	let seqStart = $state(1);
	let seqEnd = $state(100);
	let seqStep = $state(1);
	let seqPadLength = $state(0);

	// Random form state
	let randomCharset = $state<'alphanumeric' | 'numeric' | 'alpha' | 'custom'>('alphanumeric');
	let randomCustomCharset = $state('');
	let randomLength = $state(8);
	let randomCount = $state(100);

	// CSV form state
	let csvColumns = $state<string[]>([]);
	let csvRows = $state<Record<string, string>[]>([]);
	let csvError = $state<string | null>(null);

	const isValid = $derived(dataSources.length > 0);

	$effect(() => {
		dispatch('validate', { canProceed: isValid });
	});

	$effect(() => {
		if (isValid) {
			dispatch('data', { dataSources });
		}
	});

	function getCharsetString(type: typeof randomCharset): string {
		switch (type) {
			case 'numeric':
				return '0123456789';
			case 'alpha':
				return 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
			case 'alphanumeric':
				return 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
			case 'custom':
				return randomCustomCharset;
		}
	}

	function addSequentialSource() {
		const source: DataSource = {
			id: uuidv4(),
			type: 'sequential',
			prefix: seqPrefix || undefined,
			start: seqStart,
			end: seqEnd,
			step: seqStep,
			padLength: seqPadLength
		};
		dataSources = [...dataSources, source];

		// Reset form
		seqPrefix = '';
		seqStart = 1;
		seqEnd = 100;
		seqStep = 1;
		seqPadLength = 0;
	}

	function addRandomSource() {
		const source: DataSource = {
			id: uuidv4(),
			type: 'random',
			charset: getCharsetString(randomCharset),
			length: randomLength,
			count: randomCount
		};
		dataSources = [...dataSources, source];

		// Reset form
		randomCharset = 'alphanumeric';
		randomCustomCharset = '';
		randomLength = 8;
		randomCount = 100;
	}

	async function handleCsvUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) return;

		csvError = null;

		try {
			const text = await file.text();
			const lines = text.split('\n').filter((line) => line.trim());

			if (lines.length < 2) {
				csvError = 'CSV file must contain at least a header and one data row.';
				return;
			}

			// Simple CSV parsing (no quotes, commas only)
			const headers = lines[0].split(',').map((h) => h.trim());
			const rows: Record<string, string>[] = [];

			for (let i = 1; i < lines.length; i++) {
				const values = lines[i].split(',').map((v) => v.trim());
				const row: Record<string, string> = {};
				headers.forEach((header, index) => {
					row[header] = values[index] || '';
				});
				rows.push(row);
			}

			csvColumns = headers;
			csvRows = rows;
		} catch {
			csvError = 'Failed to parse CSV file.';
		}
	}

	function addCsvSource() {
		if (csvColumns.length === 0 || csvRows.length === 0) return;

		const source: DataSource = {
			id: uuidv4(),
			type: 'csv',
			columns: csvColumns,
			rows: csvRows
		};
		dataSources = [...dataSources, source];

		// Reset form
		csvColumns = [];
		csvRows = [];
		csvError = null;
	}

	function removeSource(id: string) {
		dataSources = dataSources.filter((s) => s.id !== id);
	}

	function getSourceLabel(source: DataSource): string {
		switch (source.type) {
			case 'sequential':
				return `Sequential: ${source.prefix || ''}${source.start}-${source.end} (step ${source.step})`;
			case 'random':
				return `Random: ${source.count} strings (length ${source.length})`;
			case 'csv':
				return `CSV: ${source.rows.length} rows, ${source.columns.length} columns`;
		}
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white p-8">
	<div class="mb-6">
		<h2 class="text-2xl font-bold text-gray-900">Data Sources</h2>
		<p class="mt-2 text-sm text-gray-600">
			Configure how data will be generated for your tickets. You can add multiple data sources.
		</p>
	</div>

	<!-- Added Data Sources -->
	{#if dataSources.length > 0}
		<div class="mb-6">
			<h3 class="text-sm font-medium text-gray-700">Configured Sources</h3>
			<ul class="mt-2 space-y-2">
				{#each dataSources as source (source.id)}
					<li
						class="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
					>
						<div>
							<p class="text-sm font-medium text-gray-900">{getSourceLabel(source)}</p>
							<p class="text-xs text-gray-500 capitalize">{source.type}</p>
						</div>
						<button
							type="button"
							onclick={() => removeSource(source.id)}
							class="text-sm font-medium text-red-600 hover:text-red-500"
						>
							Remove
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

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

	<!-- Sequential Form -->
	{#if selectedType === 'sequential'}
		<div class="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="seq-start" class="block text-sm font-medium text-gray-700">
						Start Number
					</label>
					<input
						type="number"
						id="seq-start"
						bind:value={seqStart}
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					/>
				</div>
				<div>
					<label for="seq-end" class="block text-sm font-medium text-gray-700">End Number</label>
					<input
						type="number"
						id="seq-end"
						bind:value={seqEnd}
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					/>
				</div>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="seq-step" class="block text-sm font-medium text-gray-700">Step</label>
					<input
						type="number"
						id="seq-step"
						bind:value={seqStep}
						min="1"
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					/>
				</div>
				<div>
					<label for="seq-pad" class="block text-sm font-medium text-gray-700">
						Padding Length
					</label>
					<input
						type="number"
						id="seq-pad"
						bind:value={seqPadLength}
						min="0"
						placeholder="0 = no padding"
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					/>
				</div>
			</div>
			<div>
				<label for="seq-prefix" class="block text-sm font-medium text-gray-700">
					Prefix (optional)
				</label>
				<input
					type="text"
					id="seq-prefix"
					bind:value={seqPrefix}
					placeholder="e.g., TICKET-"
					class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				/>
			</div>
			<button
				type="button"
				onclick={addSequentialSource}
				class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
			>
				Add Sequential Source
			</button>
		</div>
	{/if}

	<!-- Random Form -->
	{#if selectedType === 'random'}
		<div class="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
			<div>
				<label for="random-charset" class="block text-sm font-medium text-gray-700">
					Character Set
				</label>
				<select
					id="random-charset"
					bind:value={randomCharset}
					class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				>
					<option value="alphanumeric">Alphanumeric (A-Z, 0-9)</option>
					<option value="numeric">Numeric (0-9)</option>
					<option value="alpha">Alphabetic (A-Z)</option>
					<option value="custom">Custom</option>
				</select>
			</div>
			{#if randomCharset === 'custom'}
				<div>
					<label for="random-custom" class="block text-sm font-medium text-gray-700">
						Custom Characters
					</label>
					<input
						type="text"
						id="random-custom"
						bind:value={randomCustomCharset}
						placeholder="e.g., ABCD1234"
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					/>
				</div>
			{/if}
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="random-length" class="block text-sm font-medium text-gray-700">
						String Length
					</label>
					<input
						type="number"
						id="random-length"
						bind:value={randomLength}
						min="1"
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					/>
				</div>
				<div>
					<label for="random-count" class="block text-sm font-medium text-gray-700"> Count </label>
					<input
						type="number"
						id="random-count"
						bind:value={randomCount}
						min="1"
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					/>
				</div>
			</div>
			<button
				type="button"
				onclick={addRandomSource}
				class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
			>
				Add Random Source
			</button>
		</div>
	{/if}

	<!-- CSV Form -->
	{#if selectedType === 'csv'}
		<div class="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
			<div>
				<label for="csv-file" class="block text-sm font-medium text-gray-700">CSV File</label>
				<input
					type="file"
					id="csv-file"
					accept=".csv,text/csv"
					onchange={handleCsvUpload}
					class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
				/>
				<p class="mt-1 text-xs text-gray-500">Upload a CSV file with headers.</p>
			</div>

			{#if csvError}
				<div class="rounded-md bg-red-50 p-3">
					<p class="text-sm text-red-800">{csvError}</p>
				</div>
			{/if}

			{#if csvColumns.length > 0}
				<div>
					<p class="text-sm font-medium text-gray-700">Preview ({csvRows.length} rows)</p>
					<div class="mt-2 max-h-48 overflow-auto rounded-md border border-gray-300">
						<table class="min-w-full divide-y divide-gray-200 text-sm">
							<thead class="bg-gray-100">
								<tr>
									{#each csvColumns as column (column)}
										<th class="px-3 py-2 text-left font-medium text-gray-700">{column}</th>
									{/each}
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-200 bg-white">
								{#each csvRows.slice(0, 5) as row, rowIndex (rowIndex)}
									<tr>
										{#each csvColumns as column (column)}
											<td class="px-3 py-2 text-gray-900">{row[column]}</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					{#if csvRows.length > 5}
						<p class="mt-1 text-xs text-gray-500">Showing first 5 rows of {csvRows.length}</p>
					{/if}
				</div>
				<button
					type="button"
					onclick={addCsvSource}
					class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
				>
					Add CSV Source
				</button>
			{/if}
		</div>
	{/if}

	{#if dataSources.length === 0}
		<p class="mt-4 text-sm text-gray-500">
			Please add at least one data source to continue. Data sources define the values that will be
			used in your stamps.
		</p>
	{/if}
</div>
