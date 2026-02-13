<script lang="ts">
	import type { DataSource } from '$lib/types';
	import { getAvailableVariables } from '$lib/engine/template';

	interface Props {
		dataSources: DataSource[];
	}

	let { dataSources }: Props = $props();

	const variables = $derived(getAvailableVariables(dataSources));
	const hasVariables = $derived(variables.length > 0);
	const csvSources = $derived(dataSources.filter((s) => s.type === 'csv'));
	const hasOnlyCsvSource = $derived(csvSources.length === 1 && dataSources.length === 1);
</script>

{#if hasVariables}
	<div class="rounded-md border border-blue-200 bg-blue-50 p-4">
		<h4 class="mb-2 text-sm font-semibold text-blue-900">Available Variables</h4>
		<div class="mb-3 space-y-1 text-xs text-blue-800">
			<p>Use double curly braces to insert dynamic data:</p>
			<ul class="ml-4 list-disc space-y-0.5">
				<li>
					<code class="rounded bg-blue-100 px-1 py-0.5">{'{{name}}'}</code> for scalar sources (sequential,
					random)
				</li>
				<li>
					<code class="rounded bg-blue-100 px-1 py-0.5">{'{{source.field}}'}</code> for CSV fields
				</li>
				{#if hasOnlyCsvSource}
					<li>
						<code class="rounded bg-blue-100 px-1 py-0.5">{'{{.field}}'}</code> shorthand when only one
						CSV source
					</li>
				{/if}
			</ul>
		</div>

		<div class="max-h-48 space-y-2 overflow-y-auto">
			{#each variables as variable (variable.syntax)}
				<div class="rounded bg-white px-3 py-2 shadow-sm">
					<div class="flex items-center justify-between">
						<code class="font-mono text-xs font-semibold text-blue-700">{variable.syntax}</code>
						<span class="text-xs text-gray-500">{variable.source}</span>
					</div>
					<p class="mt-0.5 text-xs text-gray-600">{variable.description}</p>
				</div>
			{/each}
		</div>
	</div>
{:else}
	<div class="rounded-md border border-gray-200 bg-gray-50 p-4">
		<p class="text-sm text-gray-600">
			No data sources configured. Add data sources to use variables in your stamps.
		</p>
	</div>
{/if}
