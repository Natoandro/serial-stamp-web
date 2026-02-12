<script lang="ts">
	import Modal from './Modal.svelte';
	import Button from './Button.svelte';
	import IconWarning from '$lib/components/icons/IconWarning.svelte';

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		variant = 'danger',
		onConfirm,
		onCancel
	}: {
		open?: boolean;
		title: string;
		description: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: 'danger' | 'primary';
		onConfirm: () => void | Promise<void>;
		onCancel?: () => void;
	} = $props();

	async function handleConfirm() {
		await onConfirm();
	}

	function handleCancel() {
		if (onCancel) {
			onCancel();
		} else {
			open = false;
		}
	}

	const iconColor = $derived(variant === 'danger' ? 'text-red-600' : 'text-indigo-600');
	const iconBg = $derived(variant === 'danger' ? 'bg-red-100' : 'bg-indigo-100');
</script>

<Modal bind:open {title} onClose={handleCancel}>
	<div class="sm:flex sm:items-start">
		<div
			class="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full {iconBg} sm:mx-0 sm:h-10 sm:w-10"
		>
			<IconWarning class="h-6 w-6 {iconColor}" />
		</div>
		<div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
			<p class="text-sm text-gray-500">
				{description}
			</p>
		</div>
	</div>

	{#snippet actions()}
		<Button {variant} onclick={handleConfirm}>{confirmLabel}</Button>
		<Button variant="secondary" onclick={handleCancel}>{cancelLabel}</Button>
	{/snippet}
</Modal>
