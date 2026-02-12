const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(value: string | null | undefined): value is string {
	if (!value) return false;
	return UUID_REGEX.test(value);
}

export function validateUUID(value: string | null | undefined): string {
	if (!isValidUUID(value)) {
		throw new Error(`Invalid UUID: ${value}`);
	}
	return value;
}
