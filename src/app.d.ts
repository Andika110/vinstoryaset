import type { AuthUser } from '#lib/server/auth/session';

declare global {
	namespace App {
		interface Error {
			status: number;
			message: string;
			reference?: string;
		}
		interface Locals {
			user: AuthUser | null;
			sessionExpired: boolean;
			requestId: string;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
