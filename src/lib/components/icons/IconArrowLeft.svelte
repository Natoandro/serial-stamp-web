<script lang="ts">
	let { class: className = 'h-6 w-6', ...props }: { class?: string; [key: string]: any } = $props();
</script>

<svg class={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
	<path
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="2"
		d="M10 19l-7-7m0 0l7-7m-7 7h18"
	/>
</svg>
