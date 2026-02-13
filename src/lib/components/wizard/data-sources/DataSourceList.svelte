<script lang="ts">
	import type { DataSource } from '$lib/types';

	interface Props {
		sources: DataSource[];
		onRemove: (id: string) => void;
	}

	let { sources, onRemove }: Props = $props();

	function getSourceLabel(source: DataSource): string {
		switch (source.type) {
			case 'sequential':
				return `${source.prefix || ''}${source.start}-${source.end} (step ${source.step})`;
			case 'random':
				return `${source.count} strings (length ${source.length})`;
			case 'csv':
				return `${source.rows.length} rows, ${source.columns.length} columns`;
		}
	}

	function getSourceType(source: DataSource): string {
		return source.type.charAt(0).toUpperCase() + source.type.slice(1);
	}
</script>

{#if sources.length > 0}
	<div class="mb-6">
		<h3 class="text-sm font-medium text-gray-700">Configured Sources</h3>
		<ul class="mt-2 space-y-2">
			{#each sources as source (source.id)}
				<li
					class="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
				>
					<div>
						<div class="flex items-center gap-2">
							<code class="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
								{source.name}
							</code>
							<span class="text-xs text-gray-500">{getSourceType(source)}</span>
						</div>
						<p class="mt-1 text-sm text-gray-700">{getSourceLabel(source)}</p>
					</div>
					<button
						type="button"
						onclick={() => onRemove(source.id)}
						class="text-sm font-medium text-red-600 hover:text-red-500"
					>
						Remove
					</button>
				</li>
			{/each}
		</ul>
	</div>
{/if}
