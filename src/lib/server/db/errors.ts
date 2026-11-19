/**
 * Detects PostgreSQL unique-constraint violations across the error shapes
 * returned by bun-sql and Drizzle (the driver error is usually wrapped).
 */
export function isUniqueViolation(error: unknown): boolean {
	return uniqueConstraintName(error) !== null;
}

/**
 * Returns the violated unique-constraint name (PostgreSQL 23505), if any.
 * bun-sql wraps the driver error, so the whole `cause` chain is inspected.
 */
export function uniqueConstraintName(error: unknown): string | null {
	let current: unknown = error;
	for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth += 1) {
		const candidate = current as {
			code?: unknown;
			errno?: unknown;
			constraint?: unknown;
			cause?: unknown;
		};
		const isUnique =
			candidate.code === '23505' || candidate.errno === '23505' || candidate.errno === 23505;
		if (isUnique) {
			return typeof candidate.constraint === 'string' ? candidate.constraint : '';
		}
		current = candidate.cause;
	}
	return null;
}
