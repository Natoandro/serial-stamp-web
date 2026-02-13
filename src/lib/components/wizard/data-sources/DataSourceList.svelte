<script lang="ts">
	import type { DataSource } from '$lib/types';

	interface Props {
		sources: DataSource[];
		onRemove: (id: string) => void;
		onUpdate: (next: DataSource) => void;
	}

	let { sources, onRemove, onUpdate }: Props = $props();

	let editId = $state<string | null>(null);
	let draftName = $state('');
	let draftValid = $state(true);

	function startEdit(source: DataSource) {
		editId = source.id;
		draftName = source.name;
		draftValid = isNameAvailable(source.id, draftName);
	}

	function cancelEdit() {
		editId = null;
		draftName = '';
		draftValid = true;
	}

	function isNameAvailable(id: string, nextName: string): boolean {
		const trimmed = nextName.trim();
		if (!trimmed) return false;

		return !sources.some(
			(s) => s.id !== id && s.name.trim().toLowerCase() === trimmed.toLowerCase()
		);
	}

	function updateDraftName(value: string) {
		draftName = value;
		if (!editId) return;
		draftValid = isNameAvailable(editId, draftName);
	}

	function saveEdit(source: DataSource) {
		if (!editId) return;
		if (!draftValid) return;

		const nextName = draftName.trim();
		if (!nextName) return;

		onUpdate({ ...source, name: nextName });
		cancelEdit();
	}

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
					class="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
				>
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							{#if editId === source.id}
								<div class="flex items-center gap-2">
									<input
										type="text"
										value={draftName}
										oninput={(e) => updateDraftName((e.target as HTMLInputElement).value)}
										class="w-48 rounded-md border border-gray-300 px-2 py-1 text-sm shadow-sm transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
										aria-label="Source name"
									/>
									<span class="text-xs text-gray-500">{getSourceType(source)}</span>
								</div>
							{:else}
								<code class="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
									{source.name}
								</code>
								<span class="text-xs text-gray-500">{getSourceType(source)}</span>
							{/if}
						</div>

						{#if editId === source.id && !draftValid}
							<p class="mt-1 text-xs text-red-600">Name must be non-empty and unique.</p>
						{/if}

						<p class="mt-1 truncate text-sm text-gray-700">{getSourceLabel(source)}</p>
					</div>

					<div class="flex items-center gap-3">
						{#if editId === source.id}
							<button
								type="button"
								onclick={() => saveEdit(source)}
								disabled={!draftValid}
								class="text-sm font-medium text-blue-700 hover:text-blue-600 disabled:cursor-not-allowed disabled:text-gray-400"
							>
								Save
							</button>
							<button
								type="button"
								onclick={cancelEdit}
								class="text-sm font-medium text-gray-700 hover:text-gray-600"
							>
								Cancel
							</button>
						{:else}
							<button
								type="button"
								onclick={() => startEdit(source)}
								class="text-sm font-medium text-gray-700 hover:text-gray-600"
							>
								Edit
							</button>
							<button
								type="button"
								onclick={() => onRemove(source.id)}
								class="text-sm font-medium text-red-600 hover:text-red-500"
							>
								Remove
							</button>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	</div>
{/if}
