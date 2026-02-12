<script lang="ts">
	import { page } from '$app/state';
	import { v4 as uuidv4 } from 'uuid';
	import { isValidUUID } from '$lib/utils/uuid';
	import { useProjectQuery, useUpdateProjectMutation } from '$lib/queries/projects.svelte';
	import { generatePreviewRecord, getAvailableKeys } from '$lib/engine/data';
	import type { Stamp, StampType, Project } from '$lib/types';
	import TicketPreview from '$lib/components/editor/TicketPreview.svelte';
	import StampPanel from '$lib/components/editor/StampPanel.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconArrowLeft from '$lib/components/icons/IconArrowLeft.svelte';

	const projectId = $derived(page.params.projectId || '');
	const isValidId = $derived(isValidUUID(projectId));

	const query = $derived(useProjectQuery(isValidId ? projectId : null));
	const updateMutation = useUpdateProjectMutation();
	const project = $derived(query.data);

	let selectedStampId = $state<string | null>(null);

	const availableVariables = $derived(project ? getAvailableKeys(project.dataSources) : []);
	const selectedRecord = $derived(project ? generatePreviewRecord(project.dataSources) : {});

	let debounceTimer: ReturnType<typeof setTimeout>;

	async function handleUpdateProject(
		patch: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>,
		immediate = false
	) {
		if (!projectId) return;

		const performUpdate = async () => {
			try {
				await updateMutation.mutateAsync({ id: projectId, data: patch });
			} catch (error) {
				console.error('Failed to update project:', error);
			}
		};

		if (immediate) {
			clearTimeout(debounceTimer);
			await performUpdate();
		} else {
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(performUpdate, 300);
		}
	}

	function handleAddStamp(type: StampType) {
		if (!project) return;

		const id = uuidv4();
		let newStamp: Stamp;

		const common = {
			id,
			x: 50,
			y: 50,
			width: 150,
			height: 40
		};

		if (type === 'text') {
			newStamp = {
				...common,
				type: 'text',
				template: 'Sample Text',
				fontFamily: 'Arial, sans-serif',
				fontSize: 24,
				color: '#000000',
				alignment: 'left',
				autoSize: true
			};
		} else if (type === 'barcode') {
			newStamp = {
				...common,
				type: 'barcode',
				template: '{{number}}',
				format: 'code128',
				width: 200,
				height: 60
			};
		} else {
			newStamp = {
				...common,
				type: 'qrcode',
				template: 'https://example.com',
				errorCorrection: 'M',
				moduleSize: 4,
				width: 100,
				height: 100
			};
		}

		handleUpdateProject(
			{
				stamps: [...project.stamps, newStamp]
			},
			true
		);
		selectedStampId = id;
	}

	function handleDeleteStamp(id: string) {
		if (!project) return;
		handleUpdateProject(
			{
				stamps: project.stamps.filter((s) => s.id !== id)
			},
			true
		);
		if (selectedStampId === id) {
			selectedStampId = null;
		}
	}

	function handleUpdateStamp(updatedStamp: Stamp) {
		if (!project) return;
		handleUpdateProject({
			stamps: project.stamps.map((s) => (s.id === updatedStamp.id ? updatedStamp : s))
		});
	}

	function handleDimensionsChange(id: string, width: number, height: number) {
		if (!project) return;
		const stamp = project.stamps.find((s) => s.id === id);
		if (stamp && (Math.abs(stamp.width - width) > 0.1 || Math.abs(stamp.height - height) > 0.1)) {
			handleUpdateProject(
				{
					stamps: project.stamps.map((s) => (s.id === id ? { ...s, width, height } : s))
				},
				true
			);
		}
	}
</script>

<div class="flex h-screen flex-col bg-gray-50">
	<header class="border-b border-gray-200 bg-white shadow-sm">
		<div class="mx-auto w-full px-4 py-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<Button href="/" variant="ghost" class="p-2" aria-label="Back to projects">
						<IconArrowLeft />
					</Button>
					<div>
						<h1 class="text-xl font-bold tracking-tight text-gray-900">
							{project?.eventName || 'Loading...'}
						</h1>
						{#if project}
							<p class="text-xs text-gray-500">
								{project.ticketType} • {project.eventDate}
							</p>
						{/if}
					</div>
				</div>
				<div class="flex items-center gap-3">
					{#if project}
						<Button href="/projects/{projectId}/sheet" variant="secondary">Sheet Layout</Button>
						<Button>Export PDF</Button>
					{/if}
				</div>
			</div>
		</div>
	</header>

	<div class="flex flex-1 overflow-hidden">
		<main class="flex-1 overflow-y-auto p-8">
			{#if query.isLoading}
				<div class="flex h-full items-center justify-center">
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
				<div class="mx-auto max-w-4xl">
					<div class="mb-4 flex items-center justify-between">
						<h3 class="text-sm font-medium text-gray-700">Ticket Preview</h3>
						<div class="text-xs text-gray-500">
							Coordinates in image pixels. Drag stamps to reposition.
						</div>
					</div>

					<TicketPreview
						{project}
						{selectedRecord}
						{selectedStampId}
						onSelectStamp={(id) => (selectedStampId = id)}
						onUpdateStamp={handleUpdateStamp}
						onDimensionsChange={handleDimensionsChange}
					/>
				</div>
			{/if}
		</main>

		{#if project}
			<aside class="z-10 w-80 flex-shrink-0 border-l border-gray-200 bg-white shadow-lg">
				<StampPanel
					stamps={project.stamps}
					{selectedStampId}
					{availableVariables}
					onSelect={(id) => (selectedStampId = id)}
					onAdd={handleAddStamp}
					onDelete={handleDeleteStamp}
					onUpdate={handleUpdateStamp}
				/>
			</aside>
		{/if}
	</div>
</div>
