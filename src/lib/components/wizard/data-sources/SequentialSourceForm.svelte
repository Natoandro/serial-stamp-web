<script lang="ts">
	import { untrack } from 'svelte';
	import { createForm } from '@tanstack/svelte-form';
	import { z } from 'zod';
	import { getFieldError } from '$lib/utils/form';
	import TextInput from '$lib/components/ui/forms/TextInput.svelte';
	import NumberInput from '$lib/components/ui/forms/NumberInput.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { SequentialDataSource } from '$lib/types';

	interface Props {
		initialData?: SequentialDataSource;
		onAdd?: (source: Omit<SequentialDataSource, 'id'>) => void;
		onUpdate?: (source: SequentialDataSource) => void;
	}

	let { initialData, onAdd, onUpdate }: Props = $props();

	const form = createForm(() => ({
		defaultValues: {
			name: initialData?.name ?? '',
			prefix: initialData?.prefix ?? '',
			start: initialData?.start ?? 1,
			end: initialData?.end ?? 100,
			step: initialData?.step ?? 1,
			padLength: initialData?.padLength ?? 0
		},
		onSubmit: async ({ value }) => {
			const sourceData = {
				type: 'sequential' as const,
				name: value.name.trim() || 'number',
				prefix: value.prefix || undefined,
				start: value.start,
				end: value.end,
				step: value.step,
				padLength: value.padLength
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
			const values = {
				name: initialData.name,
				prefix: initialData.prefix ?? '',
				start: initialData.start,
				end: initialData.end,
				step: initialData.step,
				padLength: initialData.padLength
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
				placeholder="e.g., ticket_no"
				hint="Used in templates as {'{{name}}'}"
				required
				error={getFieldError(field)}
			/>
		{/snippet}
	</form.Field>

	<div class="grid grid-cols-2 gap-4">
		<form.Field name="start">
			{#snippet children(field)}
				<NumberInput
					name={field.name}
					value={field.state.value}
					oninput={(val) => field.handleChange(val)}
					onblur={field.handleBlur}
					label="Start Number"
					required
					error={getFieldError(field)}
				/>
			{/snippet}
		</form.Field>

		<form.Field name="end">
			{#snippet children(field)}
				<NumberInput
					name={field.name}
					value={field.state.value}
					oninput={(val) => field.handleChange(val)}
					onblur={field.handleBlur}
					label="End Number"
					required
					error={getFieldError(field)}
				/>
			{/snippet}
		</form.Field>
	</div>

	<div class="grid grid-cols-2 gap-4">
		<form.Field
			name="step"
			validators={{
				onChange: z.number().min(1, 'Step must be at least 1')
			}}
		>
			{#snippet children(field)}
				<NumberInput
					name={field.name}
					value={field.state.value}
					oninput={(val) => field.handleChange(val)}
					onblur={field.handleBlur}
					label="Step"
					min={1}
					required
					error={getFieldError(field)}
				/>
			{/snippet}
		</form.Field>

		<form.Field
			name="padLength"
			validators={{
				onChange: z.number().min(0, 'Padding cannot be negative')
			}}
		>
			{#snippet children(field)}
				<NumberInput
					name={field.name}
					value={field.state.value}
					oninput={(val) => field.handleChange(val)}
					onblur={field.handleBlur}
					label="Padding Length"
					hint="0 = none, 3 = 001"
					min={0}
					error={getFieldError(field)}
				/>
			{/snippet}
		</form.Field>
	</div>

	<form.Field name="prefix">
		{#snippet children(field)}
			<TextInput
				name={field.name}
				value={field.state.value}
				oninput={(val) => field.handleChange(val)}
				onblur={field.handleBlur}
				label="Prefix (optional)"
				placeholder="e.g., TICKET-"
				hint="Text to prepend to each number"
				error={getFieldError(field)}
			/>
		{/snippet}
	</form.Field>

	<div class="pt-2">
		<Button type="submit" class="w-full">
			{initialData ? 'Update Sequential Source' : 'Add Sequential Source'}
		</Button>
	</div>
</form>
