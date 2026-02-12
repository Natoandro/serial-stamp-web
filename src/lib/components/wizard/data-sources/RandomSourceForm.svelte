<script lang="ts">
	import TextInput from '$lib/components/ui/forms/TextInput.svelte';
	import NumberInput from '$lib/components/ui/forms/NumberInput.svelte';
	import type { RandomDataSource } from '$lib/types';

	interface Props {
		onAdd: (source: Omit<RandomDataSource, 'id'>) => void;
	}

	let { onAdd }: Props = $props();

	type CharsetType = 'alphanumeric' | 'numeric' | 'alpha' | 'custom';

	let charset = $state<CharsetType>('alphanumeric');
	let customCharset = $state('');
	let length = $state(8);
	let count = $state(100);

	function getCharsetString(type: CharsetType): string {
		switch (type) {
			case 'numeric':
				return '0123456789';
			case 'alpha':
				return 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
			case 'alphanumeric':
				return 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
			case 'custom':
				return customCharset;
		}
	}

	function handleAdd() {
		onAdd({
			type: 'random',
			charset: getCharsetString(charset),
			length,
			count
		});

		// Reset form
		charset = 'alphanumeric';
		customCharset = '';
		length = 8;
		count = 100;
	}
</script>

<div class="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
	<div>
		<label for="random-charset" class="mb-1 block text-sm font-medium text-gray-700">
			Character Set
		</label>
		<select
			id="random-charset"
			bind:value={charset}
			class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
		>
			<option value="alphanumeric">Alphanumeric (A-Z, 0-9)</option>
			<option value="numeric">Numeric (0-9)</option>
			<option value="alpha">Alphabetic (A-Z)</option>
			<option value="custom">Custom</option>
		</select>
	</div>

	{#if charset === 'custom'}
		<TextInput
			bind:value={customCharset}
			label="Custom Characters"
			placeholder="e.g., ABCD1234"
			hint="Enter the characters to use for generation"
			required
		/>
	{/if}

	<div class="grid grid-cols-2 gap-4">
		<NumberInput
			bind:value={length}
			label="String Length"
			placeholder="8"
			hint="Length of each string"
			min={1}
			required
		/>

		<NumberInput
			bind:value={count}
			label="Count"
			placeholder="100"
			hint="How many to generate"
			min={1}
			required
		/>
	</div>

	<button
		type="button"
		onclick={handleAdd}
		class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
	>
		Add Random Source
	</button>
</div>
