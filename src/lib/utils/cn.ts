import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper precedence
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
	return twMerge(inputs.filter(Boolean).join(' '));
}
