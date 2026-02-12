<script lang="ts">
	import { cn } from '$lib/utils/cn';

	interface Props {
		value?: string;
		min?: string;
		max?: string;
		class?: string;
		onchange?: (date: string) => void;
	}

	let {
		value = $bindable(''),
		min,
		max,
		class: className = '',
		onchange,
		...props
	}: Props = $props();

	const today = new Date();
	let currentMonth = $state(value ? new Date(value).getMonth() : today.getMonth());
	let currentYear = $state(value ? new Date(value).getFullYear() : today.getFullYear());

	const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const MONTHS = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	];

	const daysInMonth = $derived(new Date(currentYear, currentMonth + 1, 0).getDate());
	const firstDayOfMonth = $derived(new Date(currentYear, currentMonth, 1).getDay());

	const calendarDays = $derived.by(() => {
		const days: Array<{ date: number; isCurrentMonth: boolean; dateString: string }> = [];

		// Previous month's trailing days
		const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
		for (let i = firstDayOfMonth - 1; i >= 0; i--) {
			const date = prevMonthDays - i;
			const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
			const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
			days.push({
				date,
				isCurrentMonth: false,
				dateString: formatDateString(prevYear, prevMonth, date)
			});
		}

		// Current month's days
		for (let date = 1; date <= daysInMonth; date++) {
			days.push({
				date,
				isCurrentMonth: true,
				dateString: formatDateString(currentYear, currentMonth, date)
			});
		}

		// Next month's leading days
		const remainingDays = 42 - days.length; // 6 rows × 7 days
		for (let date = 1; date <= remainingDays; date++) {
			const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
			const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
			days.push({
				date,
				isCurrentMonth: false,
				dateString: formatDateString(nextYear, nextMonth, date)
			});
		}

		return days;
	});

	function formatDateString(year: number, month: number, date: number): string {
		const y = year.toString();
		const m = (month + 1).toString().padStart(2, '0');
		const d = date.toString().padStart(2, '0');
		return `${y}-${m}-${d}`;
	}

	function isDateDisabled(dateString: string): boolean {
		if (min && dateString < min) return true;
		if (max && dateString > max) return true;
		return false;
	}

	function isToday(dateString: string): boolean {
		const todayString = formatDateString(today.getFullYear(), today.getMonth(), today.getDate());
		return dateString === todayString;
	}

	function isSelected(dateString: string): boolean {
		return value === dateString;
	}

	function selectDate(dateString: string) {
		if (isDateDisabled(dateString)) return;
		value = dateString;
		onchange?.(dateString);
	}

	function previousMonth() {
		if (currentMonth === 0) {
			currentMonth = 11;
			currentYear--;
		} else {
			currentMonth--;
		}
	}

	function nextMonth() {
		if (currentMonth === 11) {
			currentMonth = 0;
			currentYear++;
		} else {
			currentMonth++;
		}
	}

	function goToToday() {
		currentMonth = today.getMonth();
		currentYear = today.getFullYear();
		selectDate(formatDateString(today.getFullYear(), today.getMonth(), today.getDate()));
	}
</script>

<div class={cn('rounded-lg border border-gray-200 bg-white p-4', className)} {...props}>
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<button
			type="button"
			onclick={previousMonth}
			class="rounded-md p-2 text-gray-600 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
			aria-label="Previous month"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</button>

		<div class="flex items-center gap-2">
			<h3 class="text-lg font-semibold text-gray-900">
				{MONTHS[currentMonth]}
				{currentYear}
			</h3>
		</div>

		<button
			type="button"
			onclick={nextMonth}
			class="rounded-md p-2 text-gray-600 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
			aria-label="Next month"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</button>
	</div>

	<!-- Day labels -->
	<div class="mb-2 grid grid-cols-7 gap-1">
		{#each DAYS as day (day)}
			<div class="text-center text-xs font-medium text-gray-500">
				{day}
			</div>
		{/each}
	</div>

	<!-- Calendar grid -->
	<div class="grid grid-cols-7 gap-1">
		{#each calendarDays as { date, isCurrentMonth, dateString } (dateString)}
			{@const disabled = isDateDisabled(dateString)}
			{@const selected = isSelected(dateString)}
			{@const today = isToday(dateString)}
			<button
				type="button"
				onclick={() => selectDate(dateString)}
				{disabled}
				class={cn(
					'flex h-10 w-10 items-center justify-center rounded-md text-center text-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:outline-none',
					!isCurrentMonth && 'text-gray-400',
					isCurrentMonth && !selected && !disabled && 'text-gray-900 hover:bg-gray-100',
					selected && 'bg-blue-600 font-semibold text-white hover:bg-blue-700',
					today && !selected && 'font-semibold text-blue-600',
					disabled && 'cursor-not-allowed text-gray-300'
				)}
			>
				{date}
			</button>
		{/each}
	</div>

	<!-- Footer -->
	<div class="mt-4 flex justify-center border-t border-gray-200 pt-4">
		<button
			type="button"
			onclick={goToToday}
			class="rounded-md px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
		>
			Today
		</button>
	</div>
</div>
