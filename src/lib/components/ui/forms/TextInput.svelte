<script lang="ts">
	import { cn } from '$lib/utils/cn';

	interface Props {
		id?: string;
		name?: string;
		type?: 'text' | 'email' | 'password' | 'tel' | 'url';
		value?: string;
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		class?: string;
		label?: string;
		hint?: string;
		error?: string;
	}

	let {
		id,
		name,
		type = 'text',
		value = $bindable(''),
		placeholder,
		required = false,
		disabled = false,
		class: className = '',
		label,
		hint,
		error,
		...props
	}: Props = $props();

	const inputId = $derived(id || `input-${Math.random().toString(36).slice(2, 9)}`);
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
		{type}
		id={inputId}
		{name}
		bind:value
		{placeholder}
		{required}
		{disabled}
		class={cn(
			'block w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors',
			'placeholder:text-gray-400',
			'focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none',
			'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
			hasError
				? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500'
				: 'border-gray-300 text-gray-900'
		)}
		{...props}
	/>

	{#if error}
		<p class="text-sm text-red-600">{error}</p>
	{:else if hint}
		<p class="text-sm text-gray-500">{hint}</p>
	{/if}
</div>
