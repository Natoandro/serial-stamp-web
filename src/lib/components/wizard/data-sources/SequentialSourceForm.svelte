<script lang="ts">
	import TextInput from '$lib/components/ui/forms/TextInput.svelte';
	import NumberInput from '$lib/components/ui/forms/NumberInput.svelte';
	import type { SequentialDataSource } from '$lib/types';

	interface Props {
		onAdd: (source: Omit<SequentialDataSource, 'id'>) => void;
	}

	let { onAdd }: Props = $props();

	let name = $state('');
	let prefix = $state('');
	let start = $state(1);
	let end = $state(100);
	let step = $state(1);
	let padLength = $state(0);

	function handleAdd() {
		onAdd({
			type: 'sequential',
			name: name.trim() || 'number',
			prefix: prefix || undefined,
			start,
			end,
			step,
			padLength
		});

		// Reset form
		name = '';
		prefix = '';
		start = 1;
		end = 100;
		step = 1;
		padLength = 0;
	}
</script>

<div class="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
	<TextInput
		bind:value={name}
		label="Variable Name"
		placeholder="e.g., ticket_no"
		hint="Used in templates as {'{{name}}'}. Defaults to 'number' if empty."
		required
	/>

	<div class="grid grid-cols-2 gap-4">
		<NumberInput bind:value={start} label="Start Number" placeholder="1" required />

		<NumberInput bind:value={end} label="End Number" placeholder="100" required />
	</div>

	<div class="grid grid-cols-2 gap-4">
		<NumberInput
			bind:value={step}
			label="Step"
			placeholder="1"
			hint="Increment by this value"
			min={1}
			required
		/>

		<NumberInput
			bind:value={padLength}
			label="Padding Length"
			placeholder="0"
			hint="0 = no padding, 3 = 001"
			min={0}
		/>
	</div>

	<TextInput
		bind:value={prefix}
		label="Prefix (optional)"
		placeholder="e.g., TICKET-"
		hint="Text to prepend to each number"
	/>

	<button
		type="button"
		onclick={handleAdd}
		class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
	>
		Add Sequential Source
	</button>
</div>
