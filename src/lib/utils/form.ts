/**
 * Extracts the first error message from a TanStack Form field.
 * Handles both string errors and StandardSchemaV1Issue objects (from Zod, Valibot, etc.)
 */
export function getFieldError(field: {
	state: { meta: { errors: unknown[] } };
}): string | undefined {
	const errors = field.state.meta.errors;
	if (!errors.length) return undefined;

	const firstError = errors[0];
	if (!firstError) return undefined;
	if (typeof firstError === 'string') return firstError;
	if (typeof firstError === 'object' && 'message' in firstError) {
		return (firstError as { message: string }).message;
	}
	return undefined;
}
