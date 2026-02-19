<script lang="ts">
	import { untrack } from 'svelte';
	import { createForm } from '@tanstack/svelte-form';
	import { z } from 'zod';
	import { PAPER_SIZES, type SheetLayout } from '$lib/types';
	import NumberInput from '$lib/components/ui/forms/NumberInput.svelte';
	import GridSizeSelector from '$lib/components/ui/forms/GridSizeSelector.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import DistributionModeSelector from '$lib/components/ui/forms/DistributionModeSelector.svelte';
	import { getFieldError } from '$lib/utils/form';

	interface Props {
		initialData?: SheetLayout;
		onSubmit: (data: SheetLayout) => void | Promise<void>;
		onDirtyChange?: (isDirty: boolean) => void;
		onChange?: (data: SheetLayout) => void;
	}

	let { initialData, onSubmit, onDirtyChange, onChange }: Props = $props();

	// Margin linking mode: 'all' (1 value), 'axis' (2 values), 'independent' (4 values)
	type MarginMode = 'all' | 'axis' | 'independent';
	let marginMode = $state<MarginMode>('all');

	const defaultLayout: SheetLayout = {
		paperSize: PAPER_SIZES.A4,
		orientation: 'portrait',
		rows: 1,
		cols: 1,
		marginTop: 10,
		marginRight: 10,
		marginBottom: 10,
		marginLeft: 10,
		spacingX: 0,
		spacingY: 0,
		distributionMode: 'align',
		marginAlignment: 'top-left'
	};

	const form = createForm(() => ({
		defaultValues: initialData
			? {
					...defaultLayout,
					...initialData,
					// Ensure distribution settings have defaults if missing from initialData
					distributionMode: initialData.distributionMode || defaultLayout.distributionMode,
					marginAlignment: initialData.marginAlignment || defaultLayout.marginAlignment
				}
			: defaultLayout,
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
				form.reset({
					...defaultLayout,
					...initialData,
					distributionMode: initialData.distributionMode || defaultLayout.distributionMode,
					marginAlignment: initialData.marginAlignment || defaultLayout.marginAlignment
				});
			});
		}
	});

	// Helper to emit current form values
	function emitChange() {
		onChange?.(form.state.values);
	}

	function handlePaperSizeChange(key: string) {
		const size = PAPER_SIZES[key];
		if (size) {
			form.setFieldValue('paperSize', size);
			emitChange();
		}
	}

	function handleGridSizeChange(rows: number, cols: number) {
		form.setFieldValue('rows', rows);
		form.setFieldValue('cols', cols);
		emitChange();
	}

	// Spacing linking mode: 'same' (1 value), 'independent' (2 values)
	type SpacingMode = 'same' | 'independent';
	let spacingMode = $state<SpacingMode>('same');

	// Detect current margin mode based on values
	$effect(() => {
		const { marginTop, marginRight, marginBottom, marginLeft } = form.state.values;
		if (marginTop === marginRight && marginRight === marginBottom && marginBottom === marginLeft) {
			marginMode = 'all';
		} else if (marginTop === marginBottom && marginLeft === marginRight) {
			marginMode = 'axis';
		} else {
			marginMode = 'independent';
		}
	});

	function handleMarginModeChange(mode: MarginMode) {
		marginMode = mode;
		const { marginTop, marginLeft } = form.state.values;

		if (mode === 'all') {
			// Set all margins to top margin value
			form.setFieldValue('marginRight', marginTop);
			form.setFieldValue('marginBottom', marginTop);
			form.setFieldValue('marginLeft', marginTop);
			emitChange();
		} else if (mode === 'axis') {
			// Set horizontal to left, vertical to top
			form.setFieldValue('marginRight', marginLeft);
			form.setFieldValue('marginBottom', marginTop);
			emitChange();
		}
	}

	function handleAllMarginsChange(value: number) {
		form.setFieldValue('marginTop', value);
		form.setFieldValue('marginRight', value);
		form.setFieldValue('marginBottom', value);
		form.setFieldValue('marginLeft', value);
		emitChange();
	}

	function handleVerticalMarginChange(value: number) {
		form.setFieldValue('marginTop', value);
		form.setFieldValue('marginBottom', value);
		emitChange();
	}

	function handleHorizontalMarginChange(value: number) {
		form.setFieldValue('marginLeft', value);
		form.setFieldValue('marginRight', value);
		emitChange();
	}

	// Detect current spacing mode based on values
	$effect(() => {
		const { spacingX, spacingY } = form.state.values;
		if (spacingX === spacingY) {
			spacingMode = 'same';
		} else {
			spacingMode = 'independent';
		}
	});

	function handleSpacingModeChange(mode: SpacingMode) {
		spacingMode = mode;
		if (mode === 'same') {
			// Set both to X value
			form.setFieldValue('spacingY', form.state.values.spacingX);
			emitChange();
		}
	}

	function handleBothSpacingChange(value: number) {
		form.setFieldValue('spacingX', value);
		form.setFieldValue('spacingY', value);
		emitChange();
	}
</script>

<form
	onsubmit={(e) => {
		e.preventDefault();
		e.stopPropagation();
		form.handleSubmit();
	}}
	class="space-y-6"
>
	<!-- Paper & Grid Section -->
	<div class="grid gap-6 md:grid-cols-2">
		<!-- Paper Selection -->
		<div class="space-y-4">
			<h3 class="text-sm font-semibold tracking-wider text-gray-900 uppercase">Paper Size</h3>
			<div class="space-y-4">
				<div class="space-y-1">
					<label for="paper-size" class="block text-sm font-medium text-gray-700">Format</label>
					<select
						id="paper-size"
						class="block w-full rounded-md border-gray-300 py-2 pr-10 pl-3 text-base focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
						value={Object.keys(PAPER_SIZES).find(
							(k) => PAPER_SIZES[k].name === form.state.values.paperSize.name
						)}
						onchange={(e) => handlePaperSizeChange(e.currentTarget.value)}
					>
						{#each Object.entries(PAPER_SIZES) as [key, size] (key)}
							<option value={key}>{size.name} ({size.widthMm} x {size.heightMm} mm)</option>
						{/each}
					</select>
				</div>
				<div class="space-y-1">
					<label for="orientation" class="block text-sm font-medium text-gray-700"
						>Orientation</label
					>
					<form.Field name="orientation">
						{#snippet children(field)}
							<select
								id="orientation"
								class="block w-full rounded-md border-gray-300 py-2 pr-10 pl-3 text-base focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
								value={field.state.value}
								onchange={(e) => {
									field.handleChange(e.currentTarget.value as 'portrait' | 'landscape');
									emitChange();
								}}
							>
								<option value="portrait">Portrait</option>
								<option value="landscape">Landscape</option>
							</select>
						{/snippet}
					</form.Field>
				</div>
			</div>
		</div>

		<!-- Grid Layout -->
		<div class="space-y-4">
			<h3 class="text-sm font-semibold tracking-wider text-gray-900 uppercase">Grid Layout</h3>
			<div class="space-y-2">
				<div class="block text-sm font-medium text-gray-700">Grid Size</div>
				<GridSizeSelector
					rows={form.state.values.rows}
					cols={form.state.values.cols}
					onSelect={handleGridSizeChange}
				/>
			</div>
		</div>
	</div>

	<!-- Separator -->
	<hr class="my-2 border-gray-200" />

	<!-- Margins & Spacing Section -->
	<div class="grid gap-6 md:grid-cols-1">
		<!-- Margins -->
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-semibold tracking-wider text-gray-900 uppercase">Margins (mm)</h3>
				<div class="flex gap-1 rounded-md border border-gray-300 bg-white p-1">
					<button
						type="button"
						class="rounded px-2 py-1 text-xs font-medium transition-colors {marginMode === 'all'
							? 'bg-blue-100 text-blue-700'
							: 'text-gray-600 hover:bg-gray-100'}"
						onclick={() => handleMarginModeChange('all')}
						title="All margins the same"
					>
						All
					</button>
					<button
						type="button"
						class="rounded px-2 py-1 text-xs font-medium transition-colors {marginMode === 'axis'
							? 'bg-blue-100 text-blue-700'
							: 'text-gray-600 hover:bg-gray-100'}"
						onclick={() => handleMarginModeChange('axis')}
						title="Horizontal and vertical margins"
					>
						H/V
					</button>
					<button
						type="button"
						class="rounded px-2 py-1 text-xs font-medium transition-colors {marginMode ===
						'independent'
							? 'bg-blue-100 text-blue-700'
							: 'text-gray-600 hover:bg-gray-100'}"
						onclick={() => handleMarginModeChange('independent')}
						title="Independent margins"
					>
						4-Side
					</button>
				</div>
			</div>

			{#if marginMode === 'all'}
				<!-- Single value for all margins -->
				<div class="grid grid-cols-1 gap-4 sm:w-1/2">
					<form.Field name="marginTop" validators={{ onChange: z.number().min(0) }}>
						{#snippet children(field)}
							<NumberInput
								label="All"
								title="All margins"
								value={field.state.value}
								oninput={(val) => {
									handleAllMarginsChange(val);
								}}
								onblur={field.handleBlur}
								min={0}
								error={getFieldError(field)}
							/>
						{/snippet}
					</form.Field>
				</div>
			{:else if marginMode === 'axis'}
				<!-- Two values: horizontal and vertical -->
				<div class="grid grid-cols-2 gap-4">
					<form.Field name="marginTop" validators={{ onChange: z.number().min(0) }}>
						{#snippet children(field)}
							<NumberInput
								label="Vertical"
								title="Top and bottom margins"
								value={field.state.value}
								oninput={(val) => {
									handleVerticalMarginChange(val);
								}}
								onblur={field.handleBlur}
								min={0}
								error={getFieldError(field)}
							/>
						{/snippet}
					</form.Field>
					<form.Field name="marginLeft" validators={{ onChange: z.number().min(0) }}>
						{#snippet children(field)}
							<NumberInput
								label="Horizontal"
								title="Left and right margins"
								value={field.state.value}
								oninput={(val) => {
									handleHorizontalMarginChange(val);
								}}
								onblur={field.handleBlur}
								min={0}
								error={getFieldError(field)}
							/>
						{/snippet}
					</form.Field>
				</div>
			{:else}
				<!-- Four independent values -->
				<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
					<form.Field name="marginTop" validators={{ onChange: z.number().min(0) }}>
						{#snippet children(field)}
							<NumberInput
								label="Top"
								value={field.state.value}
								oninput={(val) => {
									field.handleChange(val);
									emitChange();
								}}
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
								oninput={(val) => {
									field.handleChange(val);
									emitChange();
								}}
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
								oninput={(val) => {
									field.handleChange(val);
									emitChange();
								}}
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
								oninput={(val) => {
									field.handleChange(val);
									emitChange();
								}}
								onblur={field.handleBlur}
								min={0}
								error={getFieldError(field)}
							/>
						{/snippet}
					</form.Field>
				</div>
			{/if}
		</div>

		<!-- Spacing -->
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-semibold tracking-wider text-gray-900 uppercase">Spacing (mm)</h3>
				<div class="flex gap-1 rounded-md border border-gray-300 bg-white p-1">
					<button
						type="button"
						class="rounded px-2 py-1 text-xs font-medium transition-colors {spacingMode === 'same'
							? 'bg-blue-100 text-blue-700'
							: 'text-gray-600 hover:bg-gray-100'}"
						onclick={() => handleSpacingModeChange('same')}
						title="Same spacing for both axes"
					>
						Same
					</button>
					<button
						type="button"
						class="rounded px-2 py-1 text-xs font-medium transition-colors {spacingMode ===
						'independent'
							? 'bg-blue-100 text-blue-700'
							: 'text-gray-600 hover:bg-gray-100'}"
						onclick={() => handleSpacingModeChange('independent')}
						title="Independent horizontal and vertical spacing"
					>
						H/V
					</button>
				</div>
			</div>

			{#if spacingMode === 'same'}
				<!-- Single value for both spacing -->
				<div class="grid grid-cols-1 gap-4 sm:w-1/2">
					<form.Field name="spacingX" validators={{ onChange: z.number().min(0) }}>
						{#snippet children(field)}
							<NumberInput
								label="Both"
								title="Horizontal and vertical spacing"
								value={field.state.value}
								oninput={(val) => {
									handleBothSpacingChange(val);
								}}
								onblur={field.handleBlur}
								min={0}
								error={getFieldError(field)}
							/>
						{/snippet}
					</form.Field>
				</div>
			{:else}
				<!-- Two independent values -->
				<div class="grid grid-cols-2 gap-4">
					<form.Field name="spacingX" validators={{ onChange: z.number().min(0) }}>
						{#snippet children(field)}
							<NumberInput
								label="Horizontal"
								value={field.state.value}
								oninput={(val) => {
									field.handleChange(val);
									emitChange();
								}}
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
								oninput={(val) => {
									field.handleChange(val);
									emitChange();
								}}
								onblur={field.handleBlur}
								min={0}
								error={getFieldError(field)}
							/>
						{/snippet}
					</form.Field>
				</div>
			{/if}
		</div>
	</div>

	<!-- Separator -->
	<hr class="my-2 border-gray-200" />

	<!-- Layout Alignment Section -->
	<div class="grid gap-6 md:grid-cols-1">
		<div class="space-y-4">
			<h3 class="text-sm font-semibold tracking-wider text-gray-900 uppercase">Layout Alignment</h3>

			<form.Subscribe
				selector={(state) => ({
					distributionMode: state.values.distributionMode,
					marginAlignment: state.values.marginAlignment
				})}
			>
				{#snippet children(values)}
					<DistributionModeSelector
						distributionMode={values.distributionMode}
						marginAlignment={values.marginAlignment}
						onSelect={(mode, alignment) => {
							form.setFieldValue('distributionMode', mode);
							if (alignment) {
								form.setFieldValue('marginAlignment', alignment);
							}
							emitChange();
						}}
					/>
				{/snippet}
			</form.Subscribe>
		</div>
	</div>

	<!-- Action Buttons -->

	<div class="flex justify-end pt-4">
		<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting, state.isDirty]}>
			{#snippet children([canSubmit, isSubmitting, isDirty])}
				<Button type="submit" disabled={!canSubmit || isSubmitting || !isDirty} class="min-w-30">
					{isSubmitting ? 'Saving...' : 'Save Layout'}
				</Button>
			{/snippet}
		</form.Subscribe>
	</div>
</form>
