<script lang="ts">
	let {
		icon,
		title,
		description,
		action,
		children
	}: {
		icon?: any;
		title: string;
		description?: string;
		action?: any;
		children?: any;
	} = $props();
</script>

<div class="py-12 text-center">
	{#if icon}
		<div class="mx-auto text-gray-400">
			{@render icon?.()}
		</div>
	{/if}
	<h3 class="mt-2 text-sm font-semibold text-gray-900">{title}</h3>
	{#if description}
		<p class="mt-1 text-sm text-gray-500">{description}</p>
	{/if}
	{#if action}
		<div class="mt-6">
			{@render action?.()}
		</div>
	{/if}
	{#if children}
		{@render children?.()}
	{/if}
</div>
