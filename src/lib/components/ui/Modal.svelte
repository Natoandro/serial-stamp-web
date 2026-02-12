<script lang="ts">
	let {
		open = $bindable(false),
		title,
		children,
		actions,
		onClose
	}: {
		open?: boolean;
		title: string;
		children?: any;
		actions?: any;
		onClose?: () => void;
	} = $props();

	function handleBackdropClick() {
		if (onClose) {
			onClose();
		} else {
			open = false;
		}
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
		<div
			class="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0"
		>
			<button
				class="bg-opacity-75 fixed inset-0 bg-gray-500 transition-opacity"
				onclick={handleBackdropClick}
				aria-label="Close modal"
			></button>

			<div
				class="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle"
			>
				<div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
					{#if title}
						<h3 class="text-base leading-6 font-semibold text-gray-900">
							{title}
						</h3>
					{/if}
					<div class="mt-3">
						{@render children?.()}
					</div>
				</div>
				{#if actions}
					<div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
						{@render actions?.()}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
