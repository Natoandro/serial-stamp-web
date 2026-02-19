<script lang="ts">
	type DistributionMode = 'expand' | 'align';
	type MarginAlignment =
		| 'top-left'
		| 'top-center'
		| 'top-right'
		| 'middle-left'
		| 'middle-center'
		| 'middle-right'
		| 'bottom-left'
		| 'bottom-center'
		| 'bottom-right';

	interface Props {
		distributionMode: DistributionMode;
		marginAlignment?: MarginAlignment;
		onSelect: (mode: DistributionMode, alignment?: MarginAlignment) => void;
	}

	let { distributionMode, marginAlignment = 'top-left', onSelect }: Props = $props();

	let isOpen = $state(false);
	let buttonRef = $state<HTMLButtonElement | null>(null);
	let popupRef = $state<HTMLDivElement | null>(null);
	let positionAbove = $state(false);

	// Calculate if popup should appear above or below
	function updatePosition() {
		if (!buttonRef || !isOpen) return;

		const rect = buttonRef.getBoundingClientRect();
		const viewportHeight = window.innerHeight;
		const spaceBelow = viewportHeight - rect.bottom;
		const spaceAbove = rect.top;
		const popupHeight = 180; // Approximate height of popup (horizontal layout)

		positionAbove = spaceBelow < popupHeight && spaceAbove > spaceBelow;
	}

	// Display text as derived value to ensure reactivity
	let displayText = $derived(
		distributionMode === 'expand'
			? 'Expand spacing'
			: (() => {
					const [v, h] = (marginAlignment || 'top-left').split('-');
					const vText = v.charAt(0).toUpperCase() + v.slice(1);
					const hText = h.charAt(0).toUpperCase() + h.slice(1);
					return `${vText} ${hText}`;
				})()
	);

	function handleExpand() {
		onSelect('expand');
		isOpen = false;
	}

	function handleAlign(alignment: MarginAlignment) {
		onSelect('align', alignment);
		isOpen = false;
	}

	function handleClickOutside(e: MouseEvent) {
		if (
			isOpen &&
			buttonRef &&
			popupRef &&
			!buttonRef.contains(e.target as Node) &&
			!popupRef.contains(e.target as Node)
		) {
			isOpen = false;
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			isOpen = false;
			buttonRef?.focus();
		}
	}

	$effect(() => {
		if (isOpen) {
			updatePosition();
			document.addEventListener('mousedown', handleClickOutside);
			document.addEventListener('keydown', handleKeyDown);
			return () => {
				document.removeEventListener('mousedown', handleClickOutside);
				document.removeEventListener('keydown', handleKeyDown);
			};
		}
	});
</script>

<div class="relative">
	<!-- Trigger Button -->
	<button
		bind:this={buttonRef}
		type="button"
		onclick={() => (isOpen = !isOpen)}
		class="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left shadow-sm transition-all hover:bg-gray-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none {isOpen
			? 'border-blue-500 ring-1 ring-blue-500'
			: ''}"
	>
		<div class="flex items-center gap-2">
			<!-- Visual indicator -->
			{#if distributionMode === 'expand'}
				<!-- Three dots representing expanding spacing -->
				<div class="flex items-center gap-0.5">
					<div class="h-1 w-1 rounded-full bg-gray-600"></div>
					<div class="h-1 w-1 rounded-full bg-gray-600"></div>
					<div class="h-1 w-1 rounded-full bg-gray-600"></div>
				</div>
			{:else}
				<!-- Mini 3x3 grid showing position -->
				<div class="inline-grid grid-cols-3 gap-px">
					{#each ['top', 'middle', 'bottom'] as vAlign (vAlign)}
						{#each ['left', 'center', 'right'] as hAlign (hAlign)}
							{@const position = `${vAlign}-${hAlign}`}
							{@const isSelected = marginAlignment === position}
							<div class="h-1 w-1 rounded-full {isSelected ? 'bg-blue-600' : 'bg-gray-300'}"></div>
						{/each}
					{/each}
				</div>
			{/if}
			<span class="text-sm text-gray-900">{displayText}</span>
		</div>
		<svg
			class="h-5 w-5 text-gray-400 transition-transform {isOpen ? 'rotate-180' : ''}"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	<!-- Popup -->
	{#if isOpen}
		<div
			bind:this={popupRef}
			class="animate-in fade-in absolute right-0 left-0 z-50 min-w-70 rounded-lg border border-gray-300 bg-white shadow-xl duration-200 {positionAbove
				? 'slide-in-from-bottom-2 bottom-full mb-2'
				: 'slide-in-from-top-2 top-full mt-2'}"
		>
			<div class="flex gap-3 p-3">
				<!-- Expand Option -->
				<div class="flex flex-col items-center gap-2">
					<div class="text-xs font-medium text-gray-700">Expand</div>
					<button
						type="button"
						onclick={handleExpand}
						class="flex h-20 w-20 flex-col items-center justify-center gap-1.5 rounded-md border-2 transition-all {distributionMode ===
						'expand'
							? 'border-blue-500 bg-blue-50'
							: 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'}"
						title="Expand spacing to fill"
					>
						<!-- Visual representation: 3 dots with expanding space -->
						<div class="flex items-center gap-1">
							<div
								class="h-1.5 w-1.5 rounded-full {distributionMode === 'expand'
									? 'bg-blue-600'
									: 'bg-gray-600'}"
							></div>
							<div
								class="h-1.5 w-1.5 rounded-full {distributionMode === 'expand'
									? 'bg-blue-600'
									: 'bg-gray-600'}"
							></div>
							<div
								class="h-1.5 w-1.5 rounded-full {distributionMode === 'expand'
									? 'bg-blue-600'
									: 'bg-gray-600'}"
							></div>
						</div>
						<div class="text-xs font-medium text-gray-700">Spacing</div>
					</button>
				</div>

				<!-- Divider -->
				<div class="flex items-center">
					<div class="h-20 w-px bg-gray-300"></div>
				</div>

				<!-- 3x3 Alignment Grid -->
				<div class="flex flex-col items-center gap-2">
					<div class="text-xs font-medium text-gray-700">Align at</div>
					<div class="inline-grid grid-cols-3 gap-1">
						{#each ['top', 'middle', 'bottom'] as vAlign (vAlign)}
							{#each ['left', 'center', 'right'] as hAlign (hAlign)}
								{@const position = `${vAlign}-${hAlign}` as MarginAlignment}
								{@const isSelected = distributionMode === 'align' && marginAlignment === position}
								<button
									type="button"
									onclick={() => handleAlign(position)}
									class="h-6 w-6 rounded border-2 transition-all {isSelected
										? 'border-blue-500 bg-blue-100'
										: 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'}"
									title={position.replace('-', ' ')}
								>
									<div
										class="mx-auto h-2 w-2 rounded-full {isSelected
											? 'bg-blue-600'
											: 'bg-gray-400'}"
									></div>
								</button>
							{/each}
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
