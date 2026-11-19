import { randomUUID } from 'node:crypto';
import { dev } from '$app/env';
import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { MESSAGES } from '#lib/messages.js';
import { logger } from '#lib/server/logger.js';
import {
	clearSessionCookie,
	getSessionToken,
	setSessionCookie,
	validateSession
} from '#lib/server/auth/session.js';

const BASE_SECURITY_HEADERS: Record<string, string> = {
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'X-Frame-Options': 'SAMEORIGIN',
	'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
	'Cross-Origin-Opener-Policy': 'same-origin',
	'Cross-Origin-Resource-Policy': 'same-origin'
};

function contentSecurityPolicy(): string {
	const directives = [
		"default-src 'self'",
		`script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data: blob:",
		"font-src 'self' data:",
		`connect-src 'self'${dev ? ' ws: wss:' : ''}`,
		"worker-src 'self' blob:",
		"manifest-src 'self'",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'self'"
	];
	return directives.join('; ');
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	event.locals.sessionExpired = false;
	const incomingRequestId = event.request.headers.get('x-request-id')?.trim();
	event.locals.requestId =
		incomingRequestId && /^[A-Za-z0-9._:-]{8,100}$/.test(incomingRequestId)
			? incomingRequestId
			: `req_${randomUUID()}`;
	const startedAt = performance.now();

	const token = getSessionToken(event.cookies);

	if (token) {
		let ipAddress: string | null;

		try {
			ipAddress = event.getClientAddress();
		} catch {
			ipAddress = null;
		}

		try {
			const result = await validateSession(token, {
				userAgent: event.request.headers.get('user-agent'),
				ipAddress
			});

			if (result) {
				event.locals.user = result.user;
				if (result.renewed) {
					setSessionCookie(event.cookies, token);
				}
			} else {
				event.locals.sessionExpired = true;
				clearSessionCookie(event.cookies);
			}
		} catch (error) {
			await logger.error('session_validation_failed', {
				module: 'auth',
				requestId: event.locals.requestId,
				userId: event.locals.user?.id ?? null,
				error: error instanceof Error ? error.name : 'Error',
				errorMessage: error instanceof Error ? error.message : String(error)
			});
		}
	}

	let response: Response;
	try {
		response = await resolve(event);
	} catch (error) {
		await logger.error('request_failed', {
			module: 'http',
			requestId: event.locals.requestId,
			userId: event.locals.user?.id ?? null,
			method: event.request.method,
			path: event.url.pathname,
			durationMs: Math.round(performance.now() - startedAt),
			error: error instanceof Error ? error.name : 'Error'
		});
		throw error;
	}

	for (const [name, value] of Object.entries(BASE_SECURITY_HEADERS)) {
		response.headers.set(name, value);
	}
	response.headers.set('Content-Security-Policy', contentSecurityPolicy());
	response.headers.set('x-request-id', event.locals.requestId);
	if (event.url.protocol === 'https:') {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}

	await logger.logEvent(event.url.pathname === '/healthz' ? 'debug' : 'info', 'request_completed', {
		module: 'http',
		requestId: event.locals.requestId,
		userId: event.locals.user?.id ?? null,
		method: event.request.method,
		path: event.url.pathname,
		status: response.status,
		durationMs: Math.round(performance.now() - startedAt)
	});

	return response;
};

export const handleError: HandleServerError = async ({ kind, error, event }) => {
	let status = 500;
	let message = 'Terjadi kesalahan sistem.';

	if (kind === 'app') {
		status = error.status;
		message = error.message;
	} else if (kind === 'framework' || kind === 'validation') {
		status = error.status;
		message = error.message;
	}

	const isServerError = status >= 500;
	const reference = isServerError ? `REF-${randomUUID().slice(0, 8).toUpperCase()}` : undefined;

	if (isServerError) {
		await logger.error('unhandled_error', {
			module: 'error',
			reference,
			requestId: event.locals.requestId,
			status,
			method: event.request.method,
			path: event.url.pathname,
			userId: event.locals.user?.id ?? null,
			name: error instanceof Error ? error.name : kind,
			errorMessage: error instanceof Error ? error.message : message,
			stack: error instanceof Error ? error.stack : undefined
		});
	}

	return {
		status,
		message: isServerError ? MESSAGES.systemError : message || 'Permintaan tidak dapat diproses.',
		reference
	};
};
