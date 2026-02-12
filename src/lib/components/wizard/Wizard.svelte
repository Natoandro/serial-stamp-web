<script lang="ts">
	import type { Component } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface WizardStep {
		label: string;
		component: Component;
	}

	interface Props {
		steps: WizardStep[];
		onComplete: (data: Record<string, unknown>) => void | Promise<void>;
		onCancel?: () => void;
	}

	let { steps, onComplete, onCancel }: Props = $props();

	let currentStepIndex = $state(0);
	let formData = $state<Record<string, unknown>>({});
	let canProceed = $state(true);
	let isSubmitting = $state(false);

	const currentStep = $derived(steps[currentStepIndex]);
	const isFirstStep = $derived(currentStepIndex === 0);
	const isLastStep = $derived(currentStepIndex === steps.length - 1);

	function handleStepValidation(event: CustomEvent<{ canProceed: boolean }>) {
		canProceed = event.detail.canProceed;
	}

	function handleStepData(event: CustomEvent<Record<string, unknown>>) {
		formData = { ...formData, ...event.detail };
	}

	function goBack() {
		if (!isFirstStep) {
			currentStepIndex--;
		}
	}

	function goNext() {
		if (!isLastStep && canProceed) {
			currentStepIndex++;
		}
	}

	async function finish() {
		if (!canProceed || isSubmitting) return;

		isSubmitting = true;
		try {
			await onComplete(formData);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex min-h-screen flex-col bg-gray-50">
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
			{#key currentStepIndex}
				{@const StepComponent = currentStep.component}
				<StepComponent
					bind:data={formData}
					onvalidate={handleStepValidation}
					ondata={handleStepData}
				/>
			{/key}
		</div>
	</main>

	<!-- Navigation -->
	<div class="border-t border-gray-200 bg-white">
		<div class="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
			<div>
				{#if onCancel}
					<Button variant="ghost" onclick={onCancel}>Cancel</Button>
				{/if}
			</div>
			<div class="flex gap-3">
				{#if !isFirstStep}
					<Button variant="secondary" onclick={goBack} disabled={isSubmitting}>Back</Button>
				{/if}
				{#if isLastStep}
					<Button onclick={finish} disabled={!canProceed || isSubmitting}>
						{isSubmitting ? 'Creating...' : 'Create Project'}
					</Button>
				{:else}
					<Button onclick={goNext} disabled={!canProceed}>Next</Button>
				{/if}
			</div>
		</div>
	</div>
</div>
