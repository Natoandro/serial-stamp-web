<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		void goto('/projects/new/event-info', { replaceState: true });
	});
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50">
	<div class="text-center">
		<div
			class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
		></div>
		<p class="mt-4 text-sm text-gray-600">Loading wizard...</p>
	</div>
</div>
