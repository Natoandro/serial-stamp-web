<script lang="ts">
	import { page } from '$app/state';
	import { isValidUUID } from '$lib/utils/uuid';
	import { useProjectQuery, useUpdateProjectMutation } from '$lib/queries/projects.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconArrowLeft from '$lib/components/icons/IconArrowLeft.svelte';
	import SheetLayoutForm from '$lib/components/forms/SheetLayoutForm.svelte';
	import SheetPreview from '$lib/components/editor/SheetPreview.svelte';
	import type { SheetLayout } from '$lib/types';
	import { PAPER_SIZES } from '$lib/types';

	const projectId = $derived(page.params.projectId || '');
	const isValidId = $derived(isValidUUID(projectId));

	const query = $derived(useProjectQuery(isValidId ? projectId : null));
	const updateMutation = useUpdateProjectMutation();
	const project = $derived(query.data);

	const defaultLayout: SheetLayout = {
		paperSize: PAPER_SIZES.A4,
		orientation: 'portrait',
		rows: 1,
		cols: 1,
		marginTop: 10,
		marginRight: 10,
		marginBottom: 10,
		marginLeft: 10,
		spacingX: 0,
		spacingY: 0
	};

	async function handleSubmit(layout: SheetLayout) {
		if (!projectId) return;
		try {
			await updateMutation.mutateAsync({
				id: projectId,
				data: { sheetLayout: layout }
			});
		} catch (error) {
			console.error('Failed to update sheet layout:', error);
		}
	}
</script>

<div class="flex min-h-screen flex-col bg-gray-50">
	<header class="border-b border-gray-200 bg-white shadow-sm">
		<div class="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<Button
						href="/projects/{projectId}"
						variant="ghost"
						class="p-2"
						aria-label="Back to project"
					>
						<IconArrowLeft />
					</Button>
					<div>
						<h1 class="text-xl font-bold tracking-tight text-gray-900">
							{project?.eventName || 'Loading...'}
						</h1>
						<p class="text-xs text-gray-500">Sheet Layout Configuration</p>
					</div>
				</div>
			</div>
		</div>
	</header>

	<main class="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
		{#if query.isLoading}
			<div class="flex h-64 items-center justify-center">
				<div class="text-center">
					<div
						class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
					></div>
					<p class="mt-4 text-sm text-gray-600">Loading project...</p>
				</div>
			</div>
		{:else if query.isError || !isValidId}
			<div class="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-8 text-center">
				<p class="text-red-600">
					{!isValidId ? 'Invalid project ID' : 'Project not found'}
				</p>
				<Button href="/" variant="secondary" class="mt-4">Back to Projects</Button>
			</div>
		{:else if project}
			<div class="grid gap-8 lg:grid-cols-12">
				<!-- Form Section -->
				<div class="lg:col-span-5">
					<div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
						<div class="mb-6 border-b border-gray-100 pb-4">
							<h2 class="text-lg font-semibold text-gray-900">Dimensions & Grid</h2>
							<p class="text-sm text-gray-500">
								Configure the paper size and how tickets are arranged on the print sheet.
							</p>
						</div>

						<SheetLayoutForm initialData={project.sheetLayout} onSubmit={handleSubmit} />
					</div>
				</div>

				<!-- Preview Section -->
				<div class="lg:col-span-7">
					<div class="sticky top-8">
						<SheetPreview {project} layout={project.sheetLayout || defaultLayout} />

						<div class="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
							<div class="flex gap-3">
								<svg
									class="h-5 w-5 text-blue-500"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<div class="text-sm text-blue-800">
									<p class="font-semibold">About Print Scaling</p>
									<p class="mt-1">
										The preview shows the theoretical layout. When printing the PDF, ensure your
										printer settings are set to "Actual Size" or "100% Scale" to maintain precise
										millimeter dimensions.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</main>
</div>
