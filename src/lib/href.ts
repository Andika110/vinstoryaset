import { resolve as kitResolve } from '$app/paths';
import type { ResolvedPathname } from '$app/types';

/**
 * `resolve()` SvelteKit memakai tuple union untuk path yang diketahui saat kompilasi.
 * Untuk href yang dibangun dinamis (mis. dari data server atau query param), gunakan
 * helper ini agar hasilnya tetap bertipe `ResolvedPathname`.
 */
export function resolve(path: string): ResolvedPathname {
	return (kitResolve as unknown as (pathname: string) => ResolvedPathname)(path);
}
