<script lang="ts">
	import { untrack } from 'svelte';
	import { createForm } from '@tanstack/svelte-form';
	import { z } from 'zod';
	import { PAPER_SIZES, type SheetLayout, type PaperSize } from '$lib/types';
	import NumberInput from '$lib/components/ui/forms/NumberInput.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { getFieldError } from '$lib/utils/form';

	interface Props {
		initialData?: SheetLayout;
		onSubmit: (data: SheetLayout) => void | Promise<void>;
		onDirtyChange?: (isDirty: boolean) => void;
	}

	let { initialData, onSubmit, onDirtyChange }: Props = $props();

	const defaultLayout: SheetLayout = {
		paperSize: PAPER_SIZES.A4,
		rows: 1,
		cols: 1,
		marginTop: 10,
		marginRight: 10,
		marginBottom: 10,
		marginLeft: 10,
		spacingX: 0,
		spacingY: 0
	};

	const form = createForm(() => ({
		defaultValues: initialData || defaultLayout,
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		}
	}));

	// Track dirty state
	$effect(() => {
		onDirtyChange?.(form.state.isDirty);
	});

	// Sync with initialData changes
	$effect(() => {
		if (initialData) {
			untrack(() => {
				form.reset(initialData);
			});
		}
	});

	function handlePaperSizeChange(key: string) {
		const size = PAPER_SIZES[key];
		if (size) {
			form.setFieldValue('paperSize', size);
		}
	}
</script>

<form
	onsubmit={(e) => {
		e.preventDefault();
		e.stopPropagation();
		form.handleSubmit();
	}}
	class="space-y-8"
>
	<div class="grid gap-6 md:grid-cols-2">
		<!-- Paper Selection -->
		<div class="space-y-4">
			<h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider">Paper Size</h3>
			<div class="space-y-1">
				<label for="paper-size" class="block text-sm font-medium text-gray-700">Format</label>
				<select
					id="paper-size"
					class="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
					value={Object.keys(PAPER_SIZES).find(
						(k) => PAPER_SIZES[k].name === form.state.values.paperSize.name
					)}
					onchange={(e) => handlePaperSizeChange(e.currentTarget.value)}
				>
					{#each Object.entries(PAPER_SIZES) as [key, size]}
						<option value={key}>{size.name} ({size.widthMm} x {size.heightMm} mm)</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Grid Layout -->
		<div class="space-y-4">
			<h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider">Grid Layout</h3>
			<div class="grid grid-cols-2 gap-4">
				<form.Field name="rows" validators={{ onChange: z.number().min(1) }}>
					{#snippet children(field)}
						<NumberInput
							label="Rows"
							value={field.state.value}
							oninput={(val) => field.handleChange(val)}
							onblur={field.handleBlur}
							min={1}
							error={getFieldError(field)}
						/>
					{/snippet}
				</form.Field>
				<form.Field name="cols" validators={{ onChange: z.number().min(1) }}>
					{#snippet children(field)}
						<NumberInput
							label="Columns"
							value={field.state.value}
							oninput={(val) => field.handleChange(val)}
							onblur={field.handleBlur}
							min={1}
							error={getFieldError(field)}
						/>
					{/snippet}
				</form.Field>
			</div>
		</div>

		<!-- Margins -->
		<div class="space-y-4 md:col-span-2">
			<h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider">Margins (mm)</h3>
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<form.Field name="marginTop" validators={{ onChange: z.number().min(0) }}>
					{#snippet children(field)}
						<NumberInput
							label="Top"
							value={field.state.value}
							oninput={(val) => field.handleChange(val)}
							onblur={field.handleBlur}
							min={0}
							error={getFieldError(field)}
						/>
					{/snippet}
				</form.Field>
				<form.Field name="marginRight" validators={{ onChange: z.number().min(0) }}>
					{#snippet children(field)}
						<NumberInput
							label="Right"
							value={field.state.value}
							oninput={(val) => field.handleChange(val)}
							onblur={field.handleBlur}
							min={0}
							error={getFieldError(field)}
						/>
					{/snippet}
				</form.Field>
				<form.Field name="marginBottom" validators={{ onChange: z.number().min(0) }}>
					{#snippet children(field)}
						<NumberInput
							label="Bottom"
							value={field.state.value}
							oninput={(val) => field.handleChange(val)}
							onblur={field.handleBlur}
							min={0}
							error={getFieldError(field)}
						/>
					{/snippet}
				</form.Field>
				<form.Field name="marginLeft" validators={{ onChange: z.number().min(0) }}>
					{#snippet children(field)}
						<NumberInput
							label="Left"
							value={field.state.value}
							oninput={(val) => field.handleChange(val)}
							onblur={field.handleBlur}
							min={0}
							error={getFieldError(field)}
						/>
					{/snippet}
				</form.Field>
			</div>
		</div>

		<!-- Spacing -->
		<div class="space-y-4 md:col-span-2">
			<h3 class="text-sm font-semibold text-gray-900 uppercase tracking-wider">Spacing (mm)</h3>
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<form.Field name="spacingX" validators={{ onChange: z.number().min(0) }}>
					{#snippet children(field)}
						<NumberInput
							label="Horizontal"
							value={field.state.value}
							oninput={(val) => field.handleChange(val)}
							onblur={field.handleBlur}
							min={0}
							error={getFieldError(field)}
						/>
					{/snippet}
				</form.Field>
				<form.Field name="spacingY" validators={{ onChange: z.number().min(0) }}>
					{#snippet children(field)}
						<NumberInput
							label="Vertical"
							value={field.state.value}
							oninput={(val) => field.handleChange(val)}
							onblur={field.handleBlur}
							min={0}
							error={getFieldError(field)}
						/>
					{/snippet}
				</form.Field>
			</div>
		</div>
	</div>

	<div class="flex justify-end pt-4">
		<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting, state.isDirty]}>
			{#snippet children([canSubmit, isSubmitting, isDirty])}
				<Button type="submit" disabled={!canSubmit || isSubmitting || !isDirty} class="min-w-[120px]">
					{isSubmitting ? 'Saving...' : 'Save Layout'}
				</Button>
			{/snippet}
		</form.Subscribe>
	</div>
</form>
