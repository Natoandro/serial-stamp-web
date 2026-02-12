<script lang="ts">
	import type { CsvDataSource } from '$lib/types';

	interface Props {
		onAdd: (source: Omit<CsvDataSource, 'id'>) => void;
	}

	let { onAdd }: Props = $props();

	let columns = $state<string[]>([]);
	let rows = $state<Record<string, string>[]>([]);
	let error = $state<string | null>(null);

	async function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) return;

		error = null;

		try {
			const text = await file.text();
			const lines = text.split('\n').filter((line) => line.trim());

			if (lines.length < 2) {
				error = 'CSV file must contain at least a header and one data row.';
				return;
			}

			// Simple CSV parsing (no quotes, commas only)
			const headers = lines[0].split(',').map((h) => h.trim());
			const parsedRows: Record<string, string>[] = [];

			for (let i = 1; i < lines.length; i++) {
				const values = lines[i].split(',').map((v) => v.trim());
				const row: Record<string, string> = {};
				headers.forEach((header, index) => {
					row[header] = values[index] || '';
				});
				parsedRows.push(row);
			}

			columns = headers;
			rows = parsedRows;
		} catch {
			error = 'Failed to parse CSV file.';
		}
	}

	function handleAdd() {
		if (columns.length === 0 || rows.length === 0) return;

		onAdd({
			type: 'csv',
			columns,
			rows
		});

		// Reset form
		columns = [];
		rows = [];
		error = null;
	}
</script>

<div class="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
	<div>
		<label for="csv-file" class="mb-1 block text-sm font-medium text-gray-700">CSV File</label>
		<input
			type="file"
			id="csv-file"
			accept=".csv,text/csv"
			onchange={handleFileUpload}
			class="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
		/>
		<p class="mt-1 text-xs text-gray-500">Upload a CSV file with headers.</p>
	</div>

	{#if error}
		<div class="rounded-md bg-red-50 p-3">
			<p class="text-sm text-red-800">{error}</p>
		</div>
	{/if}

	{#if columns.length > 0}
		<div>
			<p class="text-sm font-medium text-gray-700">Preview ({rows.length} rows)</p>
			<div class="mt-2 max-h-48 overflow-auto rounded-md border border-gray-300">
				<table class="min-w-full divide-y divide-gray-200 text-sm">
					<thead class="bg-gray-100">
						<tr>
							{#each columns as column (column)}
								<th class="px-3 py-2 text-left font-medium text-gray-700">{column}</th>
							{/each}
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each rows.slice(0, 5) as row, rowIndex (rowIndex)}
							<tr>
								{#each columns as column (column)}
									<td class="px-3 py-2 text-gray-900">{row[column]}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if rows.length > 5}
				<p class="mt-1 text-xs text-gray-500">Showing first 5 rows of {rows.length}</p>
			{/if}
		</div>
		<button
			type="button"
			onclick={handleAdd}
			class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
		>
			Add CSV Source
		</button>
	{/if}
</div>
