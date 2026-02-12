<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Stamp } from '$lib/types';

	interface Props {
		data: Record<string, unknown>;
	}

	let { data = $bindable() }: Props = $props();

	const dispatch = createEventDispatcher<{
		validate: { canProceed: boolean };
		data: Record<string, unknown>;
	}>();

	let stamps = $state<Stamp[]>((data.stamps as Stamp[]) || []);

	// Always valid - stamps are optional
	const isValid = $derived(true);

	$effect(() => {
		dispatch('validate', { canProceed: isValid });
	});

	$effect(() => {
		dispatch('data', { stamps });
	});
</script>

<div class="rounded-lg border border-gray-200 bg-white p-8">
	<div class="mb-6">
		<h2 class="text-2xl font-bold text-gray-900">Stamps (Optional)</h2>
		<p class="mt-2 text-sm text-gray-600">
			You can skip this step for now and add stamps later in the editor. The full stamp editor with
			drag-and-drop positioning will be available after project creation.
		</p>
	</div>

	{#if stamps.length > 0}
		<div class="mb-6">
			<h3 class="text-sm font-medium text-gray-700">Configured Stamps</h3>
			<ul class="mt-2 space-y-2">
				{#each stamps as stamp (stamp.id)}
					<li
						class="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
					>
						<div>
							<p class="text-sm font-medium text-gray-900">
								{stamp.type === 'text'
									? stamp.template
									: stamp.type === 'barcode'
										? `Barcode (${stamp.format})`
										: 'QR Code'}
							</p>
							<p class="text-xs text-gray-500 capitalize">{stamp.type}</p>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div
			class="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center"
		>
			<svg
				class="mx-auto h-12 w-12 text-gray-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
				/>
			</svg>
			<h3 class="mt-2 text-sm font-medium text-gray-900">No stamps yet</h3>
			<p class="mt-1 text-sm text-gray-500">
				You can add stamps in the ticket editor after creating your project.
			</p>
		</div>
	{/if}

	<div class="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
		<div class="flex">
			<svg class="h-5 w-5 shrink-0 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
				<path
					fill-rule="evenodd"
					d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
					clip-rule="evenodd"
				/>
			</svg>
			<div class="ml-3">
				<h3 class="text-sm font-medium text-blue-800">Full stamp editor coming next</h3>
				<p class="mt-1 text-sm text-blue-700">
					After creating your project, you'll have access to a full ticket editor where you can add
					text stamps, barcodes, and QR codes with drag-and-drop positioning on your template image.
				</p>
			</div>
		</div>
	</div>
</div>
