<script lang="ts">
	import type { Stamp, StampType, TextStamp, BarcodeStamp, QrCodeStamp } from '$lib/types';
	import Button from '$lib/components/ui/Button.svelte';
	import IconText from '$lib/components/icons/IconText.svelte';
	import IconBarcode from '$lib/components/icons/IconBarcode.svelte';
	import IconQrCode from '$lib/components/icons/IconQrCode.svelte';
	import IconTrash from '$lib/components/icons/IconTrash.svelte';
	import IconPlus from '$lib/components/icons/IconPlus.svelte';
	import TextStampEditor from './TextStampEditor.svelte';
	import BarcodeStampEditor from './BarcodeStampEditor.svelte';
	import QrCodeStampEditor from './QrCodeStampEditor.svelte';

	interface Props {
		stamps: Stamp[];
		selectedStampId: string | null;
		availableVariables: string[];
		onSelect: (id: string | null) => void;
		onAdd: (type: StampType) => void;
		onDelete: (id: string) => void;
		onUpdate: (stamp: Stamp) => void;
	}

	let { stamps, selectedStampId, availableVariables, onSelect, onAdd, onDelete, onUpdate }: Props =
		$props();

	let showAddMenu = $state(false);

	const selectedStamp = $derived(stamps.find((s) => s.id === selectedStampId) || null);

	function handleUpdateStamp(patch: Partial<Stamp>) {
		if (selectedStamp) {
			onUpdate({ ...selectedStamp, ...patch } as Stamp);
		}
	}

	function handleTextStampUpdate(patch: Partial<TextStamp>) {
		if (!selectedStamp || selectedStamp.type !== 'text') return;

		const current = selectedStamp as TextStamp;
		const updates: Partial<TextStamp> = { ...patch };

		// Only adjust coordinates for auto-sized text stamps.
		// For fixed-size stamps, the box stays put and alignment happens inside.
		if (current.autoSize) {
			// Handle horizontal alignment change: keep visual center in place
			if (patch.alignment && patch.alignment !== current.alignment) {
				const width = current.width;
				// Calculate visual left position based on old alignment
				let visualLeft = current.x;
				if (current.alignment === 'center') visualLeft = current.x - width / 2;
				else if (current.alignment === 'right') visualLeft = current.x - width;

				// Calculate new X based on new alignment to match visualLeft
				if (patch.alignment === 'left') updates.x = visualLeft;
				else if (patch.alignment === 'center') updates.x = visualLeft + width / 2;
				else if (patch.alignment === 'right') updates.x = visualLeft + width;
			}

			// Handle vertical alignment change: keep visual top in place
			if (patch.verticalAlign && patch.verticalAlign !== current.verticalAlign) {
				const height = current.height;
				const oldV = current.verticalAlign || 'top';
				const newV = patch.verticalAlign;

				// Calculate visual top position based on old alignment
				let visualTop = current.y;
				if (oldV === 'middle') visualTop = current.y - height / 2;
				else if (oldV === 'bottom') visualTop = current.y - height;

				// Calculate new Y based on new alignment to match visualTop
				if (newV === 'top') updates.y = visualTop;
				else if (newV === 'middle') updates.y = visualTop + height / 2;
				else if (newV === 'bottom') updates.y = visualTop + height;
			}
		}

		onUpdate({ ...selectedStamp, ...updates } as Stamp);
	}

	function getStampIcon(type: StampType) {
		switch (type) {
			case 'text':
				return IconText;
			case 'barcode':
				return IconBarcode;
			case 'qrcode':
				return IconQrCode;
		}
	}

	function getStampLabel(stamp: Stamp) {
		if (stamp.type === 'text') return stamp.template || 'Text Stamp';
		if (stamp.type === 'barcode') return `Barcode (${stamp.format})`;
		return 'QR Code';
	}
</script>

<div class="flex h-full flex-col border-l border-gray-200 bg-white">
	<div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
		<h2 class="text-lg font-semibold text-gray-900">Stamps</h2>
		<div class="relative">
			<Button variant="secondary" size="sm" onclick={() => (showAddMenu = !showAddMenu)}>
				<IconPlus class="mr-1 h-4 w-4" />
				Add
			</Button>

			{#if showAddMenu}
				<div
					class="ring-opacity-5 absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black focus:outline-none"
					role="menu"
				>
					<div class="py-1">
						<button
							onclick={() => {
								onAdd('text');
								showAddMenu = false;
							}}
							class="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
							role="menuitem"
						>
							<IconText class="mr-3 h-4 w-4 text-gray-400" />
							Text Stamp
						</button>
						<button
							onclick={() => {
								onAdd('barcode');
								showAddMenu = false;
							}}
							class="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
							role="menuitem"
						>
							<IconBarcode class="mr-3 h-4 w-4 text-gray-400" />
							Barcode
						</button>
						<button
							onclick={() => {
								onAdd('qrcode');
								showAddMenu = false;
							}}
							class="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
							role="menuitem"
						>
							<IconQrCode class="mr-3 h-4 w-4 text-gray-400" />
							QR Code
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<div class="flex-1 overflow-y-auto p-4">
		{#if stamps.length === 0}
			<div
				class="flex h-32 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-4 text-center"
			>
				<p class="text-sm text-gray-500">No stamps added yet.</p>
				<p class="text-xs text-gray-400">Click "Add" to start positioning elements.</p>
			</div>
		{:else}
			<ul class="space-y-2">
				{#each stamps as stamp (stamp.id)}
					{@const Icon = getStampIcon(stamp.type)}
					<li
						class="group flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md {selectedStampId ===
						stamp.id
							? 'border-transparent ring-2 ring-blue-500'
							: ''}"
					>
						<div class="flex items-center justify-between p-3">
							<button
								class="flex flex-1 items-center gap-3 text-left"
								onclick={() => onSelect(stamp.id)}
							>
								<div class="rounded bg-gray-100 p-1.5 text-gray-600">
									<Icon class="h-4 w-4" />
								</div>
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-medium text-gray-900">
										{getStampLabel(stamp)}
									</p>
									<p class="text-xs text-gray-500">
										{Math.round(stamp.x)}, {Math.round(stamp.y)} • {Math.round(
											stamp.width
										)}x{Math.round(stamp.height)}
									</p>
								</div>
							</button>
							<button
								onclick={() => onDelete(stamp.id)}
								class="ml-2 rounded p-1 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
								aria-label="Delete stamp"
							>
								<IconTrash class="h-4 w-4" />
							</button>
						</div>

						{#if selectedStampId === stamp.id}
							<div class="border-t border-gray-100 bg-gray-50/50 p-4">
								{#if stamp.type === 'text'}
									<TextStampEditor
										stamp={stamp as TextStamp}
										{availableVariables}
										onUpdate={handleTextStampUpdate}
									/>
								{:else if stamp.type === 'barcode'}
									<BarcodeStampEditor
										stamp={stamp as BarcodeStamp}
										{availableVariables}
										onUpdate={handleUpdateStamp}
									/>
								{:else if stamp.type === 'qrcode'}
									<QrCodeStampEditor
										stamp={stamp as QrCodeStamp}
										{availableVariables}
										onUpdate={handleUpdateStamp}
									/>
								{/if}
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<style>
	/* Close menu when clicking outside */
	:global(body) {
		cursor: default;
	}
</style>
