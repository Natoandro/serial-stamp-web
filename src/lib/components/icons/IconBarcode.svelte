<script lang="ts">
	let { class: className = 'h-5 w-5' }: { class?: string } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	class={className}
>
	<path d="M3 5v14" />
	<path d="M8 5v14" />
	<path d="M12 5v14" />
	<path d="M17 5v14" />
	<path d="M21 5v14" />
</svg>
