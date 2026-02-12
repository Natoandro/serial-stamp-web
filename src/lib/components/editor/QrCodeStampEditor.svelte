<script lang="ts">
	import type { QrCodeStamp, QrErrorCorrection } from '$lib/types';

	interface Props {
		stamp: QrCodeStamp;
		availableVariables: string[];
		onUpdate: (patch: Partial<QrCodeStamp>) => void;
	}

	let { stamp, availableVariables, onUpdate }: Props = $props();

	const errorCorrectionLevels: { value: QrErrorCorrection; label: string }[] = [
		{ value: 'L', label: 'Low (7%)' },
		{ value: 'M', label: 'Medium (15%)' },
		{ value: 'Q', label: 'Quartile (25%)' },
		{ value: 'H', label: 'High (30%)' }
	];

	function insertVariable(variable: string) {
		const placeholder = `{{${variable}}}`;
		onUpdate({ template: stamp.template + placeholder });
	}

	function updateSize(newSize: number) {
		onUpdate({
			width: newSize,
			height: newSize
		});
	}
</script>

<div class="space-y-4">
	<div>
		<label for="qr-template" class="block text-sm font-medium text-gray-700">
			QR Code Data Template
		</label>
		<div class="mt-1">
			<input
				type="text"
				id="qr-template"
				class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
				value={stamp.template}
				oninput={(e) => onUpdate({ template: e.currentTarget.value })}
				placeholder="e.g. https://example.com/{'{{random}}'}"
			/>
		</div>
		{#if availableVariables.length > 0}
			<div class="mt-2 flex flex-wrap gap-2">
				{#each availableVariables as variable (variable)}
					<button
						type="button"
						onclick={() => insertVariable(variable)}
						class="inline-flex items-center rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
					>
						+{variable}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<div class="grid grid-cols-2 gap-4">
		<div>
			<label for="error-correction" class="block text-sm font-medium text-gray-700">
				Error Correction
			</label>
			<div class="mt-1">
				<select
					id="error-correction"
					class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
					value={stamp.errorCorrection}
					onchange={(e) =>
						onUpdate({ errorCorrection: e.currentTarget.value as QrErrorCorrection })}
				>
					{#each errorCorrectionLevels as level (level.value)}
						<option value={level.value}>{level.label}</option>
					{/each}
				</select>
			</div>
		</div>

		<div>
			<label for="qr-size" class="block text-sm font-medium text-gray-700">Size (px)</label>
			<input
				type="number"
				id="qr-size"
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
				value={stamp.width}
				oninput={(e) => updateSize(parseInt(e.currentTarget.value) || 0)}
				min="1"
			/>
		</div>
	</div>

	<div>
		<label for="module-size" class="block text-sm font-medium text-gray-700">Module Size (px)</label
		>
		<div class="mt-1">
			<input
				type="number"
				id="module-size"
				class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
				value={stamp.moduleSize}
				oninput={(e) => onUpdate({ moduleSize: parseInt(e.currentTarget.value) || 2 })}
				min="1"
				step="1"
			/>
		</div>
		<p class="mt-1 text-xs text-gray-500">Size of each "dot" in the QR code.</p>
	</div>

	<div class="rounded-md bg-blue-50 p-4">
		<div class="flex">
			<div class="ml-3">
				<p class="text-xs text-blue-700">
					Note: QR Code rendering will be implemented in Phase 3. A placeholder will be shown in the
					editor.
				</p>
			</div>
		</div>
	</div>
</div>
