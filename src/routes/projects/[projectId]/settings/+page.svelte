<script lang="ts">
	import { page } from '$app/state';
	import { goto, beforeNavigate } from '$app/navigation';
	import { isValidUUID } from '$lib/utils/uuid';
	import { useProjectQuery, useUpdateProjectMutation } from '$lib/queries/projects.svelte';
	import EventInfoForm from '$lib/components/forms/EventInfoForm.svelte';
	import DataSourcesForm from '$lib/components/forms/DataSourcesForm.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconArrowLeft from '$lib/components/icons/IconArrowLeft.svelte';
	import type { DataSource, ProjectSettings } from '$lib/types';

	const projectId = $derived(page.params.projectId || '');
	const isValidId = $derived(isValidUUID(projectId));

	const query = $derived(useProjectQuery(isValidId ? projectId : null));
	const updateMutation = useUpdateProjectMutation();
	const project = $derived(query.data);

	// Tab state
	const activeTab = $derived<'event' | 'data'>(
		page.url.searchParams.get('tab') === 'data' ? 'data' : 'event'
	);

	let isSaving = $state(false);
	let eventFormRef = $state<EventInfoForm | null>(null);
	let dataFormRef = $state<DataSourcesForm | null>(null);

	// Track form dirty state
	let isFormDirty = $state(false);

	// Prevent navigation if form is dirty
	beforeNavigate((navigation) => {
		if (isFormDirty && !confirm('You have unsaved changes. Are you sure you want to leave?')) {
			navigation.cancel();
		}
	});

	function switchTab(tab: 'event' | 'data') {
		const url = new URL(page.url);
		url.searchParams.set('tab', tab);
		void goto(url.toString(), { replaceState: true });
	}

	function handleSaveEvent() {
		eventFormRef?.submit();
	}

	function handleResetEvent() {
		eventFormRef?.handleReset();
	}

	async function handleEventInfoSubmit(data: ProjectSettings) {
		if (!projectId || isSaving) return;

		isSaving = true;
		try {
			const updateData: any = {
				eventName: data.eventName,
				eventDate: data.eventDate,
				eventOrganizer: data.eventOrganizer,
				ticketType: data.ticketType
			};

			// Only include template image if a new one was uploaded
			if (data.templateImage) {
				updateData.templateImage = data.templateImage;
			}

			await updateMutation.mutateAsync({
				id: projectId,
				data: updateData
			});

			// Reset form dirty state since save was successful
			eventFormRef?.handleSaveSuccess();

			// Success - could show a toast notification
		} catch (error) {
			console.error('Failed to save changes:', error);
			alert('Failed to save changes. Please try again.');
		} finally {
			isSaving = false;
		}
	}

	async function handleDataSourcesChange(sources: DataSource[]) {
		if (!projectId) return;

		try {
			await updateMutation.mutateAsync({
				id: projectId,
				data: {
					dataSources: sources
				}
			});
		} catch (error) {
			console.error('Failed to save data sources:', error);
			alert('Failed to save data sources. Please try again.');
		}
	}

	function handleCancel() {
		void goto(`/projects/${projectId}`);
	}
</script>

<div class="flex min-h-screen flex-col bg-gray-50">
	<header class="border-b border-gray-200 bg-white shadow-sm">
		<div class="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<Button onclick={handleCancel} variant="ghost" class="p-2" aria-label="Back to project">
						<IconArrowLeft />
					</Button>
					<div>
						<h1 class="text-xl font-bold tracking-tight text-gray-900">Project Settings</h1>
						{#if project}
							<p class="text-xs text-gray-500">{project.eventName}</p>
						{/if}
					</div>
				</div>
				<div class="flex items-center gap-3">
					<Button variant="secondary" onclick={handleCancel}>Cancel</Button>
				</div>
			</div>
		</div>
	</header>

	<main class="flex-1 px-4 py-8 sm:px-6 lg:px-8">
		{#if query.isLoading}
			<div class="mx-auto max-w-5xl">
				<div
					class="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-12"
				>
					<div class="text-center">
						<div
							class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
						></div>
						<p class="mt-4 text-sm text-gray-600">Loading project...</p>
					</div>
				</div>
			</div>
		{:else if query.isError || !isValidId}
			<div class="mx-auto max-w-5xl">
				<div class="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
					<p class="text-red-600">
						{!isValidId ? 'Invalid project ID' : 'Project not found'}
					</p>
					<Button href="/" variant="secondary" class="mt-4">Back to Projects</Button>
				</div>
			</div>
		{:else if project}
			<div class="mx-auto max-w-5xl">
				<!-- Tabs -->
				<div class="mb-6 border-b border-gray-200 bg-white">
					<nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
						<button
							type="button"
							onclick={() => switchTab('event')}
							class="border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap transition-colors
								{activeTab === 'event'
								? 'border-blue-500 text-blue-600'
								: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
						>
							Event & Ticket Info
						</button>
						<button
							type="button"
							onclick={() => switchTab('data')}
							class="border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap transition-colors
								{activeTab === 'data'
								? 'border-blue-500 text-blue-600'
								: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
						>
							Data Sources
						</button>
					</nav>
				</div>

				<!-- Tab Content -->
				<div class="rounded-lg border border-gray-200 bg-white p-8">
					{#if activeTab === 'event'}
						<div class="mb-6 flex items-start justify-between gap-4">
							<div>
								<h2 class="text-lg font-semibold text-gray-900">Event & Ticket Information</h2>
								<p class="mt-1 text-sm text-gray-600">
									Update your event details and ticket template.
								</p>
							</div>

							<div class="flex items-center gap-3">
								<Button
									type="button"
									variant="secondary"
									onclick={handleResetEvent}
									disabled={!isFormDirty || isSaving}
								>
									Reset
								</Button>
								<Button type="button" onclick={handleSaveEvent} disabled={!isFormDirty || isSaving}>
									{isSaving ? 'Saving...' : 'Save'}
								</Button>
							</div>
						</div>
						<EventInfoForm
							bind:this={eventFormRef}
							initialData={{
								eventName: project.eventName,
								eventDate: project.eventDate,
								eventOrganizer: project.eventOrganizer,
								ticketType: project.ticketType
							}}
							currentTemplateImage={project.templateImage}
							requireImage={false}
							onSubmit={handleEventInfoSubmit}
							onDirtyChange={(dirty) => (isFormDirty = dirty)}
						/>
					{:else if activeTab === 'data'}
						<div class="mb-6">
							<h2 class="text-lg font-semibold text-gray-900">Data Sources</h2>
							<p class="mt-1 text-sm text-gray-600">
								Manage data sources that populate your stamps.
							</p>
						</div>
						<DataSourcesForm
							bind:this={dataFormRef}
							initialData={project.dataSources}
							onChange={handleDataSourcesChange}
						/>
					{/if}
				</div>
			</div>
		{/if}
	</main>
</div>
