<script lang="ts">
	import type { DataSource } from '$lib/types';
	import IconTrash from '$lib/components/icons/IconTrash.svelte';
	import IconSettings from '$lib/components/icons/IconSettings.svelte';
	import ModalConfirm from '$lib/components/ui/ModalConfirm.svelte';

	interface Props {
		sources: DataSource[];
		onRemove: (id: string) => void;
		onEdit: (id: string) => void;
	}

	let { sources, onRemove, onEdit }: Props = $props();

	let sourceToDelete = $state<DataSource | null>(null);
	let showConfirm = $state(false);

	function requestDelete(source: DataSource) {
		sourceToDelete = source;
		showConfirm = true;
	}

	function confirmDelete() {
		if (sourceToDelete) {
			onRemove(sourceToDelete.id);
		}
		showConfirm = false;
	}

	function getSourceLabel(source: DataSource): string {
		switch (source.type) {
			case 'sequential':
				const paddingText = source.padLength > 0 ? `, pad ${source.padLength}` : '';
				return `${source.prefix || ''}${source.start}-${source.end} (step ${source.step}${paddingText})`;
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

{#snippet actionButton(label: string, colorClass: string, Icon: any, onclick: () => void)}
	<button
		type="button"
		{onclick}
		class="inline-flex items-center gap-1.5 text-sm font-medium transition-colors {colorClass}"
	>
		<Icon class="h-4 w-4" />
		<span>{label}</span>
	</button>
{/snippet}

{#if sources.length > 0}
	<ul class="space-y-2">
		{#each sources as source (source.id)}
			<li
				class="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 transition-colors hover:border-gray-300"
			>
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<code class="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
							{source.name}
						</code>
						<span class="text-xs font-medium tracking-wider text-gray-500 uppercase">
							{getSourceType(source)}
						</span>
					</div>
					<p class="mt-1 truncate text-sm text-gray-600">
						{getSourceLabel(source)}
					</p>
				</div>

				<div class="flex items-center gap-6">
					{@render actionButton('Edit', 'text-blue-600 hover:text-blue-700', IconSettings, () =>
						onEdit(source.id)
					)}

					{@render actionButton('Remove', 'text-gray-400 hover:text-red-600', IconTrash, () =>
						requestDelete(source)
					)}
				</div>
			</li>
		{/each}
	</ul>
{/if}

<ModalConfirm
	bind:open={showConfirm}
	title="Remove Data Source"
	description="Are you sure you want to remove the '{sourceToDelete?.name}' data source? This cannot be undone."
	confirmLabel="Remove"
	onConfirm={confirmDelete}
/>
