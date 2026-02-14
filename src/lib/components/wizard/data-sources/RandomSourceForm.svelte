<script lang="ts">
	import { untrack } from 'svelte';
	import { createForm } from '@tanstack/svelte-form';
	import { z } from 'zod';
	import { getFieldError } from '$lib/utils/form';
	import TextInput from '$lib/components/ui/forms/TextInput.svelte';
	import NumberInput from '$lib/components/ui/forms/NumberInput.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { RandomDataSource } from '$lib/types';

	interface Props {
		initialData?: RandomDataSource;
		onAdd?: (source: Omit<RandomDataSource, 'id'>) => void;
		onUpdate?: (source: RandomDataSource) => void;
	}

	let { initialData, onAdd, onUpdate }: Props = $props();

	type CharsetType = 'alphanumeric' | 'numeric' | 'alpha' | 'custom';

	const charsets: Record<string, CharsetType> = {
		'0123456789': 'numeric',
		ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz: 'alpha',
		ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789: 'alphanumeric'
	};

	function getCharsetType(charsetStr: string): CharsetType {
		return charsets[charsetStr] || 'custom';
	}

	function getCharsetString(type: CharsetType, customValue: string): string {
		switch (type) {
			case 'numeric':
				return '0123456789';
			case 'alpha':
				return 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
			case 'alphanumeric':
				return 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
			case 'custom':
				return customValue;
		}
	}

	const form = createForm(() => ({
		defaultValues: {
			name: initialData?.name ?? '',
			charsetType: (initialData
				? getCharsetType(initialData.charset)
				: 'alphanumeric') as CharsetType,
			customCharset:
				initialData && getCharsetType(initialData.charset) === 'custom' ? initialData.charset : '',
			length: initialData?.length ?? 8,
			count: initialData?.count ?? 100
		},
		onSubmit: async ({ value }) => {
			const sourceData = {
				type: 'random' as const,
				name: value.name.trim() || 'random',
				charset: getCharsetString(value.charsetType, value.customCharset),
				length: value.length,
				count: value.count
			};

			if (initialData && onUpdate) {
				onUpdate({ ...sourceData, id: initialData.id });
			} else if (onAdd) {
				onAdd(sourceData);
			}
		}
	}));

	// Sync form state if initialData changes reactively
	$effect(() => {
		if (initialData) {
			const type = getCharsetType(initialData.charset);
			const values = {
				name: initialData.name,
				charsetType: type,
				customCharset: type === 'custom' ? initialData.charset : '',
				length: initialData.length,
				count: initialData.count
			};

			untrack(() => {
				form.reset(values);
			});
		}
	});
</script>

<form
	onsubmit={(e) => {
		e.preventDefault();
		e.stopPropagation();
		form.handleSubmit();
	}}
	class="space-y-4"
>
	<form.Field
		name="name"
		validators={{
			onChange: z.string().min(1, 'Variable name is required')
		}}
	>
		{#snippet children(field)}
			<TextInput
				name={field.name}
				value={field.state.value}
				oninput={(val) => field.handleChange(val)}
				onblur={field.handleBlur}
				label="Variable Name"
				placeholder="e.g., code"
				hint="Used in templates as {'{{name}}'}"
				required
				error={getFieldError(field)}
			/>
		{/snippet}
	</form.Field>

	<form.Field name="charsetType">
		{#snippet children(field)}
			<div>
				<label for={field.name} class="mb-1 block text-sm font-medium text-gray-700">
					Character Set
				</label>
				<select
					id={field.name}
					value={field.state.value}
					onchange={(e) => field.handleChange((e.target as HTMLSelectElement).value as CharsetType)}
					onblur={field.handleBlur}
					class="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				>
					<option value="alphanumeric">Alphanumeric (A-Z, 0-9)</option>
					<option value="numeric">Numeric (0-9)</option>
					<option value="alpha">Alphabetic (A-Z)</option>
					<option value="custom">Custom</option>
				</select>
			</div>
		{/snippet}
	</form.Field>

	<form.Subscribe selector={(state) => state.values.charsetType}>
		{#snippet children(type)}
			{#if type === 'custom'}
				<form.Field
					name="customCharset"
					validators={{
						onChange: z.string().min(1, 'Custom character set cannot be empty')
					}}
				>
					{#snippet children(field)}
						<TextInput
							name={field.name}
							value={field.state.value}
							oninput={(val) => field.handleChange(val)}
							onblur={field.handleBlur}
							label="Custom Characters"
							placeholder="e.g., ABCD1234"
							hint="Enter the characters to use for generation"
							required
							error={getFieldError(field)}
						/>
					{/snippet}
				</form.Field>
			{/if}
		{/snippet}
	</form.Subscribe>

	<div class="grid grid-cols-2 gap-4">
		<form.Field
			name="length"
			validators={{
				onChange: z.number().min(1, 'Length must be at least 1')
			}}
		>
			{#snippet children(field)}
				<NumberInput
					name={field.name}
					value={field.state.value}
					oninput={(val) => field.handleChange(val)}
					onblur={field.handleBlur}
					label="String Length"
					min={1}
					required
					error={getFieldError(field)}
				/>
			{/snippet}
		</form.Field>

		<form.Field
			name="count"
			validators={{
				onChange: z.number().min(1, 'Count must be at least 1')
			}}
		>
			{#snippet children(field)}
				<NumberInput
					name={field.name}
					value={field.state.value}
					oninput={(val) => field.handleChange(val)}
					onblur={field.handleBlur}
					label="Count"
					min={1}
					required
					error={getFieldError(field)}
				/>
			{/snippet}
		</form.Field>
	</div>

	<div class="pt-2">
		<Button type="submit" class="w-full">
			{initialData ? 'Update Random Source' : 'Add Random Source'}
		</Button>
	</div>
</form>
