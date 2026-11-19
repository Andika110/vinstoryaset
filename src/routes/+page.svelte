<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Fondasi Aplikasi — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page stack">
	<h1>Aset &amp; Inventory IT</h1>
	<p class="text-muted">
		Fondasi proyek dan autentikasi sudah siap. Dashboard akan dibangun pada FEAT-03.
	</p>
	<p>
		<a href={resolve('/(auth)/login')}>Masuk ke aplikasi</a>
	</p>
	<p>
		Design token sudah aktif. Lihat contoh visual di <a href={resolve('/dev/tokens')}>
			/dev/tokens
		</a>.
	</p>
</main>
