<script lang="ts">
	interface Props {
		rows: number;
		cols: number;
		onSelect: (rows: number, cols: number) => void;
		maxRows?: number;
		maxCols?: number;
	}

	let { rows = 1, cols = 1, onSelect, maxRows = 10, maxCols = 10 }: Props = $props();

	let showPicker = $state(false);
	let hoverRows = $state(0);
	let hoverCols = $state(0);
	let manualMode = $state(false);
	let manualRows = $state(1);
	let manualCols = $state(1);
	let pickerElement: HTMLDivElement | undefined = $state();

	function handleCellHover(r: number, c: number) {
		hoverRows = r;
		hoverCols = c;
	}

	function handleCellClick(r: number, c: number) {
		onSelect(r, c);
		showPicker = false;
		hoverRows = 0;
		hoverCols = 0;
	}

	function togglePicker() {
		showPicker = !showPicker;
		if (!showPicker) {
			hoverRows = 0;
			hoverCols = 0;
		} else {
			// When opening, set hover to current selection
			hoverRows = rows;
			hoverCols = cols;
		}
	}

	function handleManualApply() {
		if (manualRows > 0 && manualCols > 0) {
			onSelect(manualRows, manualCols);
			showPicker = false;
			manualMode = false;
		}
	}

	function handleClickOutside(event: MouseEvent) {
		if (showPicker && pickerElement && !pickerElement.contains(event.target as Node)) {
			showPicker = false;
			hoverRows = 0;
			hoverCols = 0;
			manualMode = false;
		}
	}

	// Sync manual inputs with current values
	$effect(() => {
		manualRows = rows;
		manualCols = cols;
	});

	// Add click outside listener
	$effect(() => {
		if (showPicker) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => {
				document.removeEventListener('mousedown', handleClickOutside);
			};
		}
	});
</script>

<div class="relative" bind:this={pickerElement}>
	<button
		type="button"
		class="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
		onclick={togglePicker}
	>
		<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
			/>
		</svg>
		<span>{rows} × {cols}</span>
		<svg
			class="h-4 w-4 transition-transform {showPicker ? 'rotate-180' : ''}"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if showPicker}
		<div
			class="absolute top-full left-0 z-10 mt-2 rounded-lg border border-gray-200 bg-white p-4 shadow-xl"
		>
			{#if !manualMode}
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<p class="text-xs font-medium text-gray-700">
							{hoverRows > 0 && hoverCols > 0 ? `${hoverRows} × ${hoverCols}` : `${rows} × ${cols}`}
						</p>
						<button
							type="button"
							class="text-xs text-blue-600 hover:text-blue-700"
							onclick={() => (manualMode = true)}
						>
							Manual
						</button>
					</div>

					<!-- Visual Grid -->
					<div class="inline-grid gap-0.5" style="grid-template-columns: repeat({maxCols}, 1fr);">
						{#each Array.from({ length: maxRows }, (_, i) => i) as r (r)}
							{#each Array.from({ length: maxCols }, (_, i) => i) as c (`${r}-${c}`)}
								{@const isActive = hoverRows > r && hoverCols > c}
								{@const isPreviousSelection = rows > r && cols > c}
								<button
									type="button"
									aria-label="Select {r + 1} rows and {c + 1} columns"
									class="relative h-5 w-5 border border-gray-300 transition-colors {isActive
										? 'border-blue-600 bg-blue-500'
										: 'bg-white hover:bg-gray-100'}"
									onmouseenter={() => handleCellHover(r + 1, c + 1)}
									onclick={() => handleCellClick(r + 1, c + 1)}
								>
									{#if isPreviousSelection}
										<div
											class="absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-600 opacity-30"
										></div>
									{/if}
								</button>
							{/each}
						{/each}
					</div>
				</div>
			{:else}
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<p class="text-xs font-medium text-gray-700">Enter custom size</p>
						<button
							type="button"
							class="text-xs text-blue-600 hover:text-blue-700"
							onclick={() => (manualMode = false)}
						>
							Visual
						</button>
					</div>

					<div class="flex items-center gap-3">
						<div>
							<label for="manual-rows" class="block text-xs text-gray-600">Rows</label>
							<input
								id="manual-rows"
								type="number"
								min="1"
								class="mt-1 w-20 rounded border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
								bind:value={manualRows}
							/>
						</div>
						<div class="pt-5 text-gray-400">×</div>
						<div>
							<label for="manual-cols" class="block text-xs text-gray-600">Columns</label>
							<input
								id="manual-cols"
								type="number"
								min="1"
								class="mt-1 w-20 rounded border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
								bind:value={manualCols}
							/>
						</div>
					</div>

					<button
						type="button"
						class="w-full rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
						onclick={handleManualApply}
					>
						Apply
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>
