<script lang="ts">
	import type { TextStamp, DataSource } from '$lib/types';
	import TemplateSyntaxHelp from '$lib/components/ui/TemplateSyntaxHelp.svelte';

	interface Props {
		stamp: TextStamp;
		dataSources: DataSource[];
		onUpdate: (patch: Partial<TextStamp>) => void;
	}

	let { stamp, dataSources, onUpdate }: Props = $props();

	const fontFamilies = [
		{ value: 'Arial, sans-serif', label: 'Arial' },
		{ value: '"Times New Roman", serif', label: 'Times New Roman' },
		{ value: '"Courier New", monospace', label: 'Courier New' },
		{ value: 'Georgia, serif', label: 'Georgia' },
		{ value: 'Verdana, sans-serif', label: 'Verdana' },
		{ value: '"Helvetica Neue", Helvetica, Arial, sans-serif', label: 'Helvetica' }
	];

	const alignments = [
		{ value: 'left', label: 'Left' },
		{ value: 'center', label: 'Center' },
		{ value: 'right', label: 'Right' }
	];

	const verticalAlignments = [
		{ value: 'top', label: 'Top' },
		{ value: 'middle', label: 'Middle' },
		{ value: 'bottom', label: 'Bottom' }
	];
</script>

<div class="space-y-4">
	<div>
		<label for="template" class="block text-sm font-medium text-gray-700">Text Template</label>
		<div class="mt-1">
			<textarea
				id="template"
				rows="3"
				class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
				value={stamp.template}
				oninput={(e) => onUpdate({ template: e.currentTarget.value })}
				placeholder="Enter text or use variables like {'{{name}}'}"
			></textarea>
		</div>
	</div>

	<div>
		<TemplateSyntaxHelp {dataSources} />
	</div>

	<div class="grid grid-cols-2 gap-4">
		<div>
			<label for="fontSize" class="block text-sm font-medium text-gray-700">Font Size (px)</label>
			<div class="mt-1">
				<input
					type="number"
					id="fontSize"
					class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
					value={stamp.fontSize}
					oninput={(e) => onUpdate({ fontSize: parseInt(e.currentTarget.value) || 12 })}
					min="1"
				/>
			</div>
		</div>

		<div>
			<label for="color" class="block text-sm font-medium text-gray-700">Color</label>
			<div class="mt-1">
				<input
					type="color"
					id="color"
					class="block h-9 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
					value={stamp.color}
					oninput={(e) => onUpdate({ color: e.currentTarget.value })}
				/>
			</div>
		</div>
	</div>

	<div>
		<label for="fontFamily" class="block text-sm font-medium text-gray-700">Font Family</label>
		<div class="mt-1">
			<select
				id="fontFamily"
				class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
				value={stamp.fontFamily}
				onchange={(e) => onUpdate({ fontFamily: e.currentTarget.value })}
			>
				{#each fontFamilies as font (font.value)}
					<option value={font.value}>{font.label}</option>
				{/each}
			</select>
		</div>
	</div>

	<div>
		<label for="alignment" class="block text-sm font-medium text-gray-700">Alignment</label>
		<div class="mt-1">
			<div class="flex rounded-md shadow-sm" role="group">
				{#each alignments as align (align.value)}
					<button
						type="button"
						onclick={() => onUpdate({ alignment: align.value as 'left' | 'center' | 'right' })}
						class="flex-1 border border-gray-300 px-3 py-2 text-sm font-medium first:rounded-l-md last:rounded-r-md hover:bg-gray-50 focus:z-10 {stamp.alignment ===
						align.value
							? 'border-blue-500 bg-blue-50 text-blue-700'
							: 'bg-white text-gray-700'}"
					>
						{align.label}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<div>
		<label for="verticalAlignment" class="block text-sm font-medium text-gray-700"
			>Vertical Alignment</label
		>
		<div class="mt-1">
			<div class="flex rounded-md shadow-sm" role="group">
				{#each verticalAlignments as align (align.value)}
					<button
						type="button"
						onclick={() => onUpdate({ verticalAlign: align.value as 'top' | 'middle' | 'bottom' })}
						class="flex-1 border border-gray-300 px-3 py-2 text-sm font-medium first:rounded-l-md last:rounded-r-md hover:bg-gray-50 focus:z-10 {(stamp.verticalAlign ||
							'top') === align.value
							? 'border-blue-500 bg-blue-50 text-blue-700'
							: 'bg-white text-gray-700'}"
					>
						{align.label}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<div class="flex items-center">
		<input
			id="autoSize"
			type="checkbox"
			class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
			checked={stamp.autoSize || false}
			onchange={(e) => onUpdate({ autoSize: e.currentTarget.checked })}
		/>
		<label for="autoSize" class="ml-2 block text-sm text-gray-900"> Auto-size to content </label>
	</div>

	{#if !stamp.autoSize}
		<div class="grid grid-cols-2 gap-4">
			<div>
				<label for="width" class="block text-sm font-medium text-gray-700">Width (px)</label>
				<input
					type="number"
					id="width"
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
					value={stamp.width}
					oninput={(e) => onUpdate({ width: parseInt(e.currentTarget.value) || 0 })}
				/>
			</div>
			<div>
				<label for="height" class="block text-sm font-medium text-gray-700">Height (px)</label>
				<input
					type="number"
					id="height"
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
					value={stamp.height}
					oninput={(e) => onUpdate({ height: parseInt(e.currentTarget.value) || 0 })}
				/>
			</div>
		</div>
	{/if}
</div>
