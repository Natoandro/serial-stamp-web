<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import { wizardState } from '$lib/stores/wizard.svelte';
	import { setContext } from 'svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	// Share wizard state with child pages via context
	setContext('wizardState', wizardState);

	// Validation state - child pages will update this
	let canProceed = $state(false);
	setContext('canProceed', {
		get value() {
			return canProceed;
		},
		set value(v: boolean) {
			canProceed = v;
		}
	});

	// Finish callback - the last step can override this
	let onFinish = $state<(() => void | Promise<void>) | null>(null);
	setContext('onFinish', {
		get value() {
			return onFinish;
		},
		set value(fn: (() => void | Promise<void>) | null) {
			onFinish = fn;
		}
	});

	const steps = [
		{ path: '/projects/new/event-info', label: 'Event & Ticket Info' },
		{ path: '/projects/new/data-sources', label: 'Data Sources' },
		{ path: '/projects/new/stamps', label: 'Stamps' }
	];

	let currentStepIndex = $derived(steps.findIndex((step) => page.url.pathname === step.path));
	let isFirstStep = $derived(currentStepIndex === 0);
	let isLastStep = $derived(currentStepIndex === steps.length - 1);

	function handleCancel() {
		wizardState.reset();
		void goto('/');
	}

	function goBack() {
		if (!isFirstStep) {
			void goto(steps[currentStepIndex - 1].path);
		}
	}

	async function goNext() {
		if (!canProceed) return;

		// Execute the step's custom handler if provided
		if (onFinish) {
			await onFinish();
		} else if (!isLastStep) {
			// No custom handler - just navigate to next step
			void goto(steps[currentStepIndex + 1].path);
		}
	}
</script>

<div class="flex min-h-screen flex-col bg-gray-50" data-wizard-layout>
	<!-- Step Indicator -->
	<div class="border-b border-gray-200 bg-white">
		<div class="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
			<nav aria-label="Progress">
				<ol class="flex items-center">
					{#each steps as step, index (index)}
						{@const isActive = index === currentStepIndex}
						{@const isCompleted = index < currentStepIndex}
						<li class="flex flex-1 items-center">
							<div class="flex items-center">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors
										{isActive
										? 'border-blue-600 bg-blue-600 text-white'
										: isCompleted
											? 'border-blue-600 bg-blue-600 text-white'
											: 'border-gray-300 bg-white text-gray-500'}"
								>
									{#if isCompleted}
										<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
												clip-rule="evenodd"
											/>
										</svg>
									{:else}
										<span class="text-sm font-medium">{index + 1}</span>
									{/if}
								</div>
								<span
									class="ml-3 text-sm font-medium
										{isActive ? 'text-blue-600' : isCompleted ? 'text-gray-900' : 'text-gray-500'}"
								>
									{step.label}
								</span>
							</div>
							{#if index < steps.length - 1}
								<div
									class="mx-4 h-0.5 flex-1 transition-colors
										{isCompleted ? 'bg-blue-600' : 'bg-gray-200'}"
								></div>
							{/if}
						</li>
					{/each}
				</ol>
			</nav>
		</div>
	</div>

	<!-- Step Content -->
	<main class="flex-1 px-4 py-8 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-4xl">
			{@render children()}
		</div>
	</main>

	<!-- Navigation -->
	<div class="border-t border-gray-200 bg-white">
		<div class="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
			<div>
				<Button variant="ghost" onclick={handleCancel}>Cancel</Button>
			</div>
			<div class="flex gap-3">
				{#if !isFirstStep}
					<Button variant="secondary" onclick={goBack}>Back</Button>
				{/if}
				{#if isLastStep}
					<Button onclick={goNext} disabled={!canProceed} data-wizard-finish>Create Project</Button>
				{:else}
					<Button onclick={goNext} disabled={!canProceed} data-wizard-next>Next</Button>
				{/if}
			</div>
		</div>
	</div>
</div>
