/**
 * Kegagalan bisnis yang aman ditampilkan ke pengguna.
 * Route/service dapat memetakan `code` ke status HTTP yang sesuai.
 */
export class DomainError extends Error {
	constructor(
		public readonly code: string,
		message: string
	) {
		super(message);
		this.name = 'DomainError';
	}
}
