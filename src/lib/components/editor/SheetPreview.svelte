<script lang="ts">
	import type { Project, SheetLayout } from '$lib/types';

	interface Props {
		project: Project;
		layout: SheetLayout;
	}

	let { project, layout }: Props = $props();

	// Paper dimensions from layout, accounting for orientation
	const paperWidth = $derived(
		layout.orientation === 'landscape' ? layout.paperSize.heightMm : layout.paperSize.widthMm
	);
	const paperHeight = $derived(
		layout.orientation === 'landscape' ? layout.paperSize.widthMm : layout.paperSize.heightMm
	);

	// Calculated ticket dimensions in mm
	// Formula: (TotalWidth - LeftMargin - RightMargin - (Cols - 1) * SpacingX) / Cols
	const ticketWidthMm = $derived(
		layout.cols > 0
			? (paperWidth -
					layout.marginLeft -
					layout.marginRight -
					(layout.cols - 1) * layout.spacingX) /
					layout.cols
			: 0
	);
	const ticketHeightMm = $derived(
		layout.rows > 0
			? (paperHeight -
					layout.marginTop -
					layout.marginBottom -
					(layout.rows - 1) * layout.spacingY) /
					layout.rows
			: 0
	);

	// Generate ticket positions for preview
	const tickets = $derived.by(() => {
		const items: Array<{ x: number; y: number; id: string; isFirst: boolean }> = [];
		if (ticketWidthMm <= 0 || ticketHeightMm <= 0) return items;

		for (let r = 0; r < layout.rows; r++) {
			for (let c = 0; c < layout.cols; c++) {
				items.push({
					x: layout.marginLeft + c * (ticketWidthMm + layout.spacingX),
					y: layout.marginTop + r * (ticketHeightMm + layout.spacingY),
					id: `${r}-${c}`,
					isFirst: r === 0 && c === 0
				});
			}
		}
		return items;
	});

	// Handle template image URL
	let imageUrl = $state<string | null>(null);

	$effect(() => {
		const blob = project.templateImage;
		if (blob) {
			const url = URL.createObjectURL(blob);
			imageUrl = url;
			return () => URL.revokeObjectURL(url);
		} else {
			imageUrl = null;
		}
	});
</script>

<div class="flex flex-col items-center gap-6">
	<div class="flex flex-col items-center text-center">
		<h3 class="text-sm font-semibold tracking-wider text-gray-900 uppercase">Sheet Preview</h3>
		<p class="mt-1 text-xs text-gray-500">
			{layout.paperSize.name}
			{layout.orientation === 'landscape' ? '(Landscape)' : '(Portrait)'} • {layout.rows *
				layout.cols} tickets per page
		</p>
	</div>

	<!-- Preview Container -->
	<div
		class="w-full max-w-lg overflow-hidden rounded-xl border border-gray-200 bg-gray-100 p-8 shadow-inner"
	>
		<div
			class="mx-auto bg-white shadow-2xl ring-1 ring-black/5"
			style="aspect-ratio: {paperWidth} / {paperHeight}; max-height: 500px;"
		>
			<svg
				viewBox="0 0 {paperWidth} {paperHeight}"
				class="h-full w-full"
				preserveAspectRatio="xMidYMid meet"
			>
				<!-- Printable area boundary -->
				<rect
					x={layout.marginLeft}
					y={layout.marginTop}
					width={Math.max(0, paperWidth - layout.marginLeft - layout.marginRight)}
					height={Math.max(0, paperHeight - layout.marginTop - layout.marginBottom)}
					fill="#f8fafc"
					stroke="#e2e8f0"
					stroke-width="0.2"
					stroke-dasharray="1,1"
				/>

				<!-- Tickets -->
				{#each tickets as ticket (ticket.id)}
					<g transform="translate({ticket.x}, {ticket.y})">
						<rect
							width={ticketWidthMm}
							height={ticketHeightMm}
							fill="white"
							stroke="#3b82f6"
							stroke-width="0.3"
						/>

						{#if ticket.isFirst && imageUrl}
							<image
								href={imageUrl}
								width={ticketWidthMm}
								height={ticketHeightMm}
								preserveAspectRatio="xMidYMid meet"
								opacity="0.9"
							/>
						{:else}
							<!-- Schematic representation for other tickets -->
							<rect
								x={ticketWidthMm * 0.1}
								y={ticketHeightMm * 0.15}
								width={ticketWidthMm * 0.8}
								height={ticketHeightMm * 0.08}
								fill="#cbd5e1"
								rx="0.2"
							/>
							<rect
								x={ticketWidthMm * 0.1}
								y={ticketHeightMm * 0.3}
								width={ticketWidthMm * 0.6}
								height={ticketHeightMm * 0.05}
								fill="#e2e8f0"
								rx="0.1"
							/>
							<rect
								x={ticketWidthMm * 0.7}
								y={ticketHeightMm * 0.7}
								width={ticketWidthMm * 0.2}
								height={ticketHeightMm * 0.2}
								fill="#94a3b8"
								fill-opacity="0.3"
								rx="0.2"
							/>
						{/if}
					</g>
				{/each}
			</svg>
		</div>
	</div>

	<!-- Measurements Info -->
	<div class="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
		<div
			class="flex flex-col items-center rounded-lg border border-gray-100 bg-white p-3 shadow-sm"
		>
			<span class="text-[10px] font-bold text-gray-400 uppercase">Ticket Width</span>
			<span class="text-sm font-semibold text-gray-900">{ticketWidthMm.toFixed(1)} mm</span>
		</div>
		<div
			class="flex flex-col items-center rounded-lg border border-gray-100 bg-white p-3 shadow-sm"
		>
			<span class="text-[10px] font-bold text-gray-400 uppercase">Ticket Height</span>
			<span class="text-sm font-semibold text-gray-900">{ticketHeightMm.toFixed(1)} mm</span>
		</div>
		<div
			class="flex flex-col items-center rounded-lg border border-gray-100 bg-white p-3 shadow-sm"
		>
			<span class="text-[10px] font-bold text-gray-400 uppercase">Columns</span>
			<span class="text-sm font-semibold text-gray-900">{layout.cols}</span>
		</div>
		<div
			class="flex flex-col items-center rounded-lg border border-gray-100 bg-white p-3 shadow-sm"
		>
			<span class="text-[10px] font-bold text-gray-400 uppercase">Rows</span>
			<span class="text-sm font-semibold text-gray-900">{layout.rows}</span>
		</div>
	</div>

	{#if ticketWidthMm <= 0 || ticketHeightMm <= 0}
		<div class="w-full rounded-lg border border-red-100 bg-red-50 p-4">
			<div class="flex items-center gap-3">
				<svg class="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
						clip-rule="evenodd"
					/>
				</svg>
				<p class="text-sm font-medium text-red-800">Invalid layout. Check margins and spacing.</p>
			</div>
		</div>
	{/if}
</div>

<style>
	.shadow-2xl {
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
	}
</style>
