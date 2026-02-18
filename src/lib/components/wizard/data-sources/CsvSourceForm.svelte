<script lang="ts">
	import { untrack } from 'svelte';
	import { createForm } from '@tanstack/svelte-form';
	import Papa from 'papaparse';
	import { z } from 'zod';
	import { getFieldError } from '$lib/utils/form';
	import TextInput from '$lib/components/ui/forms/TextInput.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { CsvDataSource } from '$lib/types';

	interface Props {
		initialData?: CsvDataSource;
		onAdd?: (source: Omit<CsvDataSource, 'id'>) => void;
		onUpdate?: (source: CsvDataSource) => void;
	}

	let { initialData, onAdd, onUpdate }: Props = $props();

	let fileError = $state<string | null>(null);

	const form = createForm(() => ({
		defaultValues: {
			name: initialData?.name ?? '',
			columns: (initialData?.columns ?? []) as string[],
			rows: (initialData?.rows ?? []) as Record<string, string>[]
		},
		onSubmit: async ({ value }) => {
			if (value.columns.length === 0 || value.rows.length === 0) {
				fileError = 'Please upload a CSV file first.';
				return;
			}

			const sourceData = {
				type: 'csv' as const,
				name: value.name.trim() || 'csv',
				columns: value.columns,
				rows: value.rows
			};

			if (initialData && onUpdate) {
				onUpdate({ ...sourceData, id: initialData.id });
			} else if (onAdd) {
				onAdd(sourceData);
			}
		}
	}));

	// Sync form state if initialData changes reactively
	$effect(() => {
		if (initialData) {
			const values = {
				name: initialData.name,
				columns: initialData.columns,
				rows: initialData.rows
			};

			untrack(() => {
				form.reset(values);
			});
		}
	});

	function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) return;

		fileError = null;

		Papa.parse(file, {
			header: true,
			skipEmptyLines: true,
			complete: (results) => {
				const headers = (results.meta.fields || []) as string[];
				const rows = results.data as Record<string, string>[];

				if (headers.length === 0 || rows.length === 0) {
					fileError = 'CSV file must contain at least a header and one data row.';
					return;
				}

				form.setFieldValue('columns', headers);
				form.setFieldValue('rows', rows);
			},
			error: (err: any) => {
				console.error('CSV parse error:', err);
				fileError = 'Failed to parse CSV file.';
			}
		});
	}
</script>

<form
	onsubmit={(e) => {
		e.preventDefault();
		e.stopPropagation();
		form.handleSubmit();
	}}
	class="space-y-4"
>
	<form.Field
		name="name"
		validators={{
			onChange: z.string().min(1, 'Source name is required')
		}}
	>
		{#snippet children(field)}
			<TextInput
				name={field.name}
				value={field.state.value}
				oninput={(val) => field.handleChange(val)}
				onblur={field.handleBlur}
				label="Source Name"
				placeholder="e.g., attendees"
				hint="Used in templates as {'{{name.field}}'}"
				required
				error={getFieldError(field)}
			/>
		{/snippet}
	</form.Field>

	<div class="space-y-1">
		<label for="csv-file" class="block text-sm font-medium text-gray-700">CSV File</label>
		<input
			type="file"
			id="csv-file"
			accept=".csv,text/csv"
			onchange={handleFileUpload}
			class="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
		/>
		<p class="text-xs text-gray-500">
			{initialData
				? 'Optionally upload a new CSV file to replace data.'
				: 'Upload a CSV file with headers.'}
		</p>
	</div>

	{#if fileError}
		<div class="rounded-md bg-red-50 p-3">
			<p class="text-sm text-red-800">{fileError}</p>
		</div>
	{/if}

	<form.Subscribe
		selector={(state) => ({ columns: state.values.columns, rows: state.values.rows })}
	>
		{#snippet children(state)}
			{#if state.columns.length > 0}
				<div class="space-y-2">
					<p class="text-sm font-medium text-gray-700">Preview ({state.rows.length} rows)</p>
					<div class="max-h-48 overflow-auto rounded-md border border-gray-200 shadow-sm">
						<table class="min-w-full divide-y divide-gray-200 text-sm">
							<thead class="bg-gray-50">
								<tr>
									{#each state.columns as column (column)}
										<th class="px-3 py-2 text-left font-medium text-gray-600">{column}</th>
									{/each}
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-100 bg-white">
								{#each state.rows.slice(0, 5) as row, rowIndex (rowIndex)}
									<tr>
										{#each state.columns as column (column)}
											<td class="px-3 py-2 whitespace-nowrap text-gray-600">{row[column]}</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					{#if state.rows.length > 5}
						<p class="text-xs text-gray-400 italic">Showing first 5 rows of {state.rows.length}</p>
					{/if}
				</div>
			{/if}
		{/snippet}
	</form.Subscribe>

	<div class="pt-4">
		<Button type="submit" class="w-full">
			{initialData ? 'Update CSV Source' : 'Add CSV Source'}
		</Button>
	</div>
</form>
