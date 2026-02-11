<script lang="ts">
	type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
	type ButtonSize = 'sm' | 'md' | 'lg';

	let {
		variant = 'primary',
		size = 'md',
		href,
		class: className = '',
		children,
		...props
	}: {
		variant?: ButtonVariant;
		size?: ButtonSize;
		href?: string;
		class?: string;
		children?: any;
		[key: string]: any;
	} = $props();

	const baseClasses =
		'inline-flex items-center justify-center rounded-md font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2';

	const variantClasses: Record<ButtonVariant, string> = {
		primary:
			'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-indigo-600',
		secondary: 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset hover:bg-gray-50',
		danger: 'bg-red-600 text-white shadow-sm hover:bg-red-500 focus-visible:outline-red-600',
		ghost: 'text-gray-400 hover:text-gray-600'
	};

	const sizeClasses: Record<ButtonSize, string> = {
		sm: 'px-2 py-1 text-xs',
		md: 'px-4 py-2 text-sm',
		lg: 'px-6 py-3 text-base'
	};

	const classes = $derived(
		`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`
	);
</script>

{#if href}
	<a {href} class={classes} {...props}>
		{@render children?.()}
	</a>
{:else}
	<button class={classes} {...props}>
		{@render children?.()}
	</button>
{/if}
