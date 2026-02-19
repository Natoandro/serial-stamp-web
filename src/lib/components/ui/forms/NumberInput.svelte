<script lang="ts">
	import { cn } from '$lib/utils/cn';

	interface Props {
		id?: string;
		name?: string;
		value?: number;
		min?: number;
		max?: number;
		step?: number;
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		class?: string;
		label?: string;
		hint?: string;
		error?: string;
		title?: string;
		oninput?: (value: number) => void;
		onblur?: () => void;
	}

	let {
		id,
		name,
		value = $bindable(0),
		min,
		max,
		step,
		placeholder,
		required = false,
		disabled = false,
		class: className = '',
		label,
		hint,
		error,
		title,
		oninput,
		onblur,
		...props
	}: Props = $props();

	const inputId = $derived(id || `number-input-${Math.random().toString(36).slice(2, 9)}`);
	const hasError = $derived(!!error);
</script>

<div class={cn('space-y-1', className)}>
	{#if label}
		<label for={inputId} class="block text-sm font-medium text-gray-700">
			{label}
			{#if required}
				<span class="text-red-500">*</span>
			{/if}
		</label>
	{/if}

	<input
		type="number"
		id={inputId}
		{name}
		{value}
		{min}
		{max}
		{step}
		{placeholder}
		{required}
		{disabled}
		{title}
		oninput={(e) => {
			const target = e.target as HTMLInputElement;
			const newValue = target.value === '' ? 0 : Number(target.value);
			if (oninput) {
				oninput(newValue);
			} else {
				value = newValue;
			}
		}}
		onblur={() => {
			if (onblur) {
				onblur();
			}
		}}
		class={cn(
			'block w-full rounded-md border px-3 py-2 shadow-sm transition-colors',
			'focus:ring-1 focus:outline-none',
			hasError
				? 'border-red-300 focus:border-red-500 focus:ring-red-500'
				: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
			disabled && 'cursor-not-allowed bg-gray-50 text-gray-500'
		)}
		{...props}
	/>

	{#if error}
		<p class="text-sm text-red-600">{error}</p>
	{:else if hint}
		<p class="text-sm text-gray-500">{hint}</p>
	{/if}
</div>
