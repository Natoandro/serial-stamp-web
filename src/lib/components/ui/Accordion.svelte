<script lang="ts">
	import { slide } from 'svelte/transition';
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		expanded?: boolean;
		showChevron?: boolean;
		onToggle?: (expanded: boolean) => void;
		children?: Snippet;
	}

	let { title, expanded = false, showChevron = true, onToggle, children }: Props = $props();

	let isExpanded = $state(expanded);

	function toggle() {
		isExpanded = !isExpanded;
		onToggle?.(isExpanded);
	}
</script>

<div class="rounded-md border border-gray-200 bg-white">
	<button
		type="button"
		onclick={toggle}
		class="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
	>
		<span class="text-sm font-semibold text-gray-900">{title}</span>
		{#if showChevron}
			<svg
				class="h-5 w-5 text-gray-600 transition-transform {isExpanded ? 'rotate-180' : ''}"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		{/if}
	</button>

	{#if isExpanded}
		<div transition:slide={{ duration: 200 }} class="border-t border-gray-200 px-4 pt-3 pb-4">
			{#if children}
				{@render children()}
			{/if}
		</div>
	{/if}
</div>
