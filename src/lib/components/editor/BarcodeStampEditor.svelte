<script lang="ts">
	import type { BarcodeStamp, BarcodeFormat, DataSource } from '$lib/types';
	import TemplateSyntaxHelp from '$lib/components/ui/TemplateSyntaxHelp.svelte';

	interface Props {
		stamp: BarcodeStamp;
		dataSources: DataSource[];
		onUpdate: (patch: Partial<BarcodeStamp>) => void;
	}

	let { stamp, dataSources, onUpdate }: Props = $props();

	const formats: { value: BarcodeFormat; label: string }[] = [
		{ value: 'code128', label: 'Code 128' },
		{ value: 'code39', label: 'Code 39' },
		{ value: 'ean13', label: 'EAN-13' },
		{ value: 'upca', label: 'UPC-A' },
		{ value: 'ean8', label: 'EAN-8' },
		{ value: 'upce', label: 'UPC-E' },
		{ value: 'code93', label: 'Code 93' },
		{ value: 'itf14', label: 'ITF-14' }
	];
</script>

<div class="space-y-4">
	<div>
		<label for="barcode-template" class="block text-sm font-medium text-gray-700">
			Barcode Data Template
		</label>
		<div class="mt-1">
			<input
				type="text"
				id="barcode-template"
				class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
				value={stamp.template}
				oninput={(e) => onUpdate({ template: e.currentTarget.value })}
				placeholder="e.g. {'{{ticket_no}}'}"
			/>
		</div>
	</div>

	<div>
		<TemplateSyntaxHelp {dataSources} />
	</div>

	<div>
		<label for="format" class="block text-sm font-medium text-gray-700">Barcode Format</label>
		<div class="mt-1">
			<select
				id="format"
				class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
				value={stamp.format}
				onchange={(e) => onUpdate({ format: e.currentTarget.value as BarcodeFormat })}
			>
				{#each formats as format (format.value)}
					<option value={format.value}>{format.label}</option>
				{/each}
			</select>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-4">
		<div>
			<label for="barcode-width" class="block text-sm font-medium text-gray-700">Width (px)</label>
			<input
				type="number"
				id="barcode-width"
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
				value={stamp.width}
				oninput={(e) => onUpdate({ width: parseInt(e.currentTarget.value) || 0 })}
				min="1"
			/>
		</div>
		<div>
			<label for="barcode-height" class="block text-sm font-medium text-gray-700">Height (px)</label
			>
			<input
				type="number"
				id="barcode-height"
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
				value={stamp.height}
				oninput={(e) => onUpdate({ height: parseInt(e.currentTarget.value) || 0 })}
				min="1"
			/>
		</div>
	</div>

	<div class="rounded-md bg-blue-50 p-4">
		<div class="flex">
			<div class="ml-3">
				<p class="text-xs text-blue-700">
					Note: Barcode rendering will be implemented in Phase 3. A placeholder will be shown in the
					editor.
				</p>
			</div>
		</div>
	</div>
</div>
