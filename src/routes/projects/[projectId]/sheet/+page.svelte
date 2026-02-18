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

<div class="flex h-screen bg-gray-50">
	<main class="flex h-full w-full">
		{#if query.isLoading}
			<div class="flex h-full w-full items-center justify-center">
				<div class="text-center">
					<div
						class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
					></div>
					<p class="mt-4 text-sm text-gray-600">Loading project...</p>
				</div>
			</div>
		{:else if query.isError || !isValidId}
			<div class="flex h-full w-full items-center justify-center">
				<div class="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-8 text-center">
					<p class="text-red-600">
						{!isValidId ? 'Invalid project ID' : 'Project not found'}
					</p>
					<Button href="/" variant="secondary" class="mt-4">Back to Projects</Button>
				</div>
			</div>
		{:else if project}
			<div class="flex h-full w-full">
				<!-- Form Section -->
				<div class="w-full flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-white lg:w-96">
					<header class="border-b border-gray-200 p-4">
						<div class="flex items-center gap-3">
							<Button
								href="/projects/{projectId}"
								variant="ghost"
								class="p-2"
								aria-label="Back to project"
							>
								<IconArrowLeft />
							</Button>
							<div>
								<h1 class="text-lg font-bold tracking-tight text-gray-900">
									{project?.eventName || 'Loading...'}
								</h1>
								<p class="text-xs text-gray-500">Sheet Layout Configuration</p>
							</div>
						</div>
					</header>

					<div class="p-6">
						<div class="mb-6">
							<h2 class="text-lg font-semibold text-gray-900">Dimensions & Grid</h2>
							<p class="mt-1 text-sm text-gray-500">
								Configure the paper size and how tickets are arranged on the print sheet.
							</p>
						</div>

						<SheetLayoutForm initialData={project.sheetLayout} onSubmit={handleSubmit} />
					</div>
				</div>

				<!-- Preview Section -->
				<div class="min-h-0 flex-1">
					<SheetPreview {project} layout={project.sheetLayout || defaultLayout} />
				</div>
			</div>
		{/if}
	</main>
</div>
