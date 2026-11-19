<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { resolve as resolveHref } from '#lib/href.js';
	import { onDestroy, onMount } from 'svelte';
	import jsQR from 'jsqr';
	import { Alert, Button, Card, PageHeader } from '#lib/components/index.js';
	import { ROLE_LABEL } from '#lib/navigation.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type ScannerState =
		'idle' | 'starting' | 'active' | 'denied' | 'unavailable' | 'insecure' | 'error';

	let videoEl = $state<HTMLVideoElement | null>(null);
	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let scannerState = $state<ScannerState>('idle');
	let message = $state('');
	let manualCode = $state('');
	let stream: MediaStream | null = null;
	let frame = 0;
	let lastDecode = 0;

	function stopCamera(): void {
		if (frame) {
			cancelAnimationFrame(frame);
			frame = 0;
		}
		if (stream) {
			for (const track of stream.getTracks()) track.stop();
			stream = null;
		}
		if (videoEl) videoEl.srcObject = null;
	}

	async function startCamera(): Promise<void> {
		stopCamera();
		message = '';

		if (!window.isSecureContext) {
			scannerState = 'insecure';
			return;
		}
		if (!navigator.mediaDevices?.getUserMedia) {
			scannerState = 'unavailable';
			message = 'Browser ini tidak mendukung akses kamera. Gunakan input manual di bawah.';
			return;
		}

		scannerState = 'starting';
		try {
			const media = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: { ideal: 'environment' } },
				audio: false
			});
			stream = media;
			if (!videoEl) {
				stopCamera();
				scannerState = 'error';
				message = 'Elemen kamera tidak siap. Muat ulang halaman.';
				return;
			}
			videoEl.srcObject = media;
			await videoEl.play();
			scannerState = 'active';
			frame = requestAnimationFrame(decodeFrame);
		} catch (err) {
			stopCamera();
			const name = err instanceof DOMException ? err.name : '';
			if (name === 'NotAllowedError' || name === 'SecurityError') {
				scannerState = 'denied';
			} else if (
				name === 'NotFoundError' ||
				name === 'NotReadableError' ||
				name === 'OverconstrainedError'
			) {
				scannerState = 'unavailable';
				message = 'Kamera tidak tersedia atau sedang dipakai aplikasi lain.';
			} else {
				scannerState = 'error';
				message = 'Kamera gagal dijalankan. Coba lagi atau gunakan input manual.';
			}
		}
	}

	function hasControlCharacters(value: string): boolean {
		for (const char of value) {
			const code = char.codePointAt(0) ?? 0;
			if (code < 32 || code === 127) return true;
		}
		return false;
	}

	function isInvalidCode(value: string): boolean {
		const text = value.trim();
		return (
			!text || text.length > 100 || text === '.' || text === '..' || hasControlCharacters(text)
		);
	}

	function decodeFrame(time: number): void {
		if (scannerState !== 'active') return;

		if (time - lastDecode >= 120) {
			lastDecode = time;
			const video = videoEl;
			const canvas = canvasEl;
			if (video && canvas && video.readyState >= 2 && video.videoWidth > 0) {
				const width = Math.min(video.videoWidth, 720);
				const scale = width / video.videoWidth;
				canvas.width = width;
				canvas.height = Math.round(video.videoHeight * scale);
				const context = canvas.getContext('2d', { willReadFrequently: true });
				if (context) {
					context.drawImage(video, 0, 0, canvas.width, canvas.height);
					const image = context.getImageData(0, 0, canvas.width, canvas.height);
					const result = jsQR(image.data, image.width, image.height, {
						inversionAttempts: 'dontInvert'
					});
					if (result?.data) {
						const text = result.data.trim();
						if (isInvalidCode(text)) {
							message = 'QR tidak valid. Pastikan QR berisi Asset Code.';
							lastDecode = time + 1500;
						} else {
							stopCamera();
							void goto(resolveHref(`/scan/${encodeURIComponent(text)}`));
							return;
						}
					}
				}
			}
		}

		frame = requestAnimationFrame(decodeFrame);
	}

	function submitManual(event: SubmitEvent): void {
		event.preventDefault();
		const code = manualCode.trim();
		if (!code || code === '.' || code === '..') {
			message = 'Masukkan Asset Code terlebih dahulu.';
			return;
		}
		void goto(resolveHref(`/scan/${encodeURIComponent(code)}`));
	}

	onMount(() => {
		return () => stopCamera();
	});

	onDestroy(() => stopCamera());
</script>

<svelte:head>
	<title>Scan QR Aset — Aset &amp; Inventory IT</title>
</svelte:head>

<main class="container page">
	<PageHeader
		title="Scan QR Aset"
		description="Pindai label QR pada aset untuk membuka ringkasan aset. Kamera hanya aktif setelah Anda mengizinkannya."
	>
		{#snippet actions()}
			<a class="button-link secondary" href={resolve('/(app)/assets/labels')}>Cetak label QR</a>
		{/snippet}
	</PageHeader>

	<div class="layout">
		<Card title="Kamera" headingLevel={2}>
			<div class="camera-frame" class:active={scannerState === 'active'}>
				<video bind:this={videoEl} autoplay muted playsinline></video>
				<canvas bind:this={canvasEl} class="visually-hidden"></canvas>
				{#if scannerState === 'active'}
					<div class="reticle" aria-hidden="true"></div>
				{/if}
			</div>

			{#if scannerState === 'idle'}
				<p class="hint">
					Tekan tombol di bawah, lalu izinkan akses kamera saat browser meminta. Arahkan kamera ke
					QR pada label aset.
				</p>
				<Button type="button" onclick={startCamera}>Aktifkan kamera</Button>
			{:else if scannerState === 'starting'}
				<p class="hint" aria-live="polite">Menyiapkan kamera…</p>
				<Button type="button" loading disabled>Menyiapkan</Button>
			{:else if scannerState === 'active'}
				<div class="active-row">
					<p class="hint" aria-live="polite">Arahkan kamera ke QR aset.</p>
					<Button
						type="button"
						variant="secondary"
						onclick={() => {
							stopCamera();
							scannerState = 'idle';
						}}
					>
						Hentikan kamera
					</Button>
				</div>
			{:else if scannerState === 'denied'}
				<Alert tone="warning" title="Izin kamera ditolak">
					Izinkan akses kamera untuk situs ini melalui pengaturan browser, lalu tekan Coba lagi.
					Anda juga dapat memakai input manual.
				</Alert>
				<Button type="button" onclick={startCamera}>Coba lagi</Button>
			{:else if scannerState === 'insecure'}
				<Alert tone="warning" title="Kamera memerlukan HTTPS atau localhost">
					Buka aplikasi melalui HTTPS (atau localhost saat pengembangan) untuk memakai kamera. Input
					manual tetap tersedia.
				</Alert>
			{:else}
				<Alert tone="warning" title="Kamera tidak dapat dipakai">
					{message || 'Periksa izin kamera dan pastikan perangkat memiliki kamera.'}
				</Alert>
				<Button type="button" onclick={startCamera}>Coba lagi</Button>
			{/if}

			{#if message && scannerState === 'active'}
				<Alert tone="warning" title="QR tidak dikenali">{message}</Alert>
			{/if}
		</Card>

		<Card title="Input manual" headingLevel={2}>
			<p class="hint">
				Kamera tidak tersedia atau QR rusak? Ketik Asset Code yang tertera pada label.
			</p>
			<form
				method="GET"
				action={resolve('/(app)/scan')}
				class="manual-form"
				onsubmit={submitManual}
			>
				<label for="scan-code">Asset Code</label>
				<input
					id="scan-code"
					name="code"
					type="text"
					autocomplete="off"
					autocapitalize="characters"
					placeholder="Contoh: AST-2026-0001"
					bind:value={manualCode}
				/>
				<Button type="submit">Buka aset</Button>
			</form>
			{#if message && scannerState !== 'active'}
				<p class="error" aria-live="polite">{message}</p>
			{/if}
			<p class="hint">
				Login sebagai <strong>{ROLE_LABEL[data.actorRole as keyof typeof ROLE_LABEL]}</strong>.
				Hasil scan mengikuti cakupan outlet akun Anda.
			</p>
		</Card>
	</div>
</main>

<style>
	.layout {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
	}

	.camera-frame {
		position: relative;
		overflow: hidden;
		aspect-ratio: 4 / 3;
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: #0b0f14;
	}

	.camera-frame video {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
	}

	.camera-frame.active video {
		opacity: 1;
	}

	.reticle {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 58%;
		aspect-ratio: 1;
		border: 3px solid rgba(255, 255, 255, 0.85);
		border-radius: var(--radius-md);
		box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.28);
		transform: translate(-50%, -50%);
		pointer-events: none;
	}

	.hint {
		margin: var(--space-3) 0;
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	.active-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.manual-form {
		display: grid;
		gap: var(--space-2);
		margin-top: var(--space-2);
	}

	.manual-form label {
		color: var(--text-2);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	.manual-form input {
		min-height: var(--touch-target);
		padding: 0 var(--space-3);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-md);
		background: var(--surface);
		color: var(--text-1);
		font-family: var(--font-mono);
		font-size: var(--font-size-base);
	}

	.manual-form :global(.btn) {
		justify-self: start;
	}

	.error {
		margin: var(--space-2) 0 0;
		color: var(--danger-text);
		font-size: var(--font-size-sm);
	}

	.button-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--touch-target);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	@media (min-width: 900px) {
		.layout {
			grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
			align-items: start;
		}
	}
</style>
