<script lang="ts">
	import { goto } from '$app/navigation';

	async function handleCancel() {
		await goto('/');
	}
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white shadow-sm">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<h1 class="text-3xl font-bold tracking-tight text-gray-900">New Project</h1>
				<button
					onclick={handleCancel}
					class="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
				>
					Cancel
				</button>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
		<div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
			<p class="text-gray-500">Project wizard coming soon (Phase 1)</p>
		</div>
	</main>
</div>
