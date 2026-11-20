<script lang="ts">
	import { onMount } from 'svelte';
	import jsQR from 'jsqr';
	import Button from './Button.svelte';
	import Alert from './Alert.svelte';

	type ScannerState =
		'idle' | 'starting' | 'active' | 'denied' | 'unavailable' | 'insecure' | 'error';

	interface Props {
		onDetect: (code: string) => void;
		paused?: boolean;
	}

	let { onDetect, paused = false }: Props = $props();

	let videoEl = $state<HTMLVideoElement | null>(null);
	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let scannerState = $state<ScannerState>('idle');
	let message = $state('');
	let manualCode = $state('');
	let stream: MediaStream | null = null;
	let frame = 0;
	let lastDecode = 0;
	let cooldownUntil = 0;

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
			message = 'Browser ini tidak mendukung akses kamera. Gunakan input kode di bawah.';
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
				message = 'Kamera gagal dijalankan. Coba lagi atau gunakan input kode.';
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

	function detect(code: string): void {
		const text = code.trim();
		if (isInvalidCode(text)) return;
		onDetect(text);
	}

	function decodeFrame(time: number): void {
		if (scannerState !== 'active') return;

		if (time - lastDecode >= 120 && !paused && time >= cooldownUntil) {
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
							message = 'QR tidak valid. Pastikan label berisi kode aset.';
							cooldownUntil = time + 1500;
						} else {
							message = '';
							cooldownUntil = time + 1500;
							onDetect(text);
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
		if (!code) {
			message = 'Masukkan kode aset terlebih dahulu.';
			return;
		}
		manualCode = '';
		detect(code);
	}

	onMount(() => {
		return () => stopCamera();
	});
</script>

<div class="scanner">
	<div class="camera-frame" class:active={scannerState === 'active'}>
		<video bind:this={videoEl} autoplay muted playsinline></video>
		<canvas bind:this={canvasEl} class="visually-hidden"></canvas>
		{#if scannerState === 'active'}
			<div class="reticle" aria-hidden="true"></div>
		{/if}
	</div>

	<div class="scanner-status" aria-live="polite">
		{#if scannerState === 'idle'}
			<p class="hint">
				Aktifkan kamera, lalu arahkan ke label QR aset. Setiap aset yang terbaca langsung ditandai
				sesuai.
			</p>
			<Button type="button" onclick={startCamera}>Aktifkan kamera</Button>
		{:else if scannerState === 'starting'}
			<p class="hint">Menyiapkan kamera…</p>
		{:else if scannerState === 'active'}
			<div class="active-row">
				<p class="hint">{paused ? 'Menyimpan hasil scan…' : 'Arahkan kamera ke label QR aset.'}</p>
				<Button
					type="button"
					variant="secondary"
					size="sm"
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
				Izinkan akses kamera melalui pengaturan browser, lalu coba lagi. Input kode tetap bisa
				dipakai.
			</Alert>
			<Button type="button" size="sm" onclick={startCamera}>Coba lagi</Button>
		{:else if scannerState === 'insecure'}
			<Alert tone="warning" title="Kamera memerlukan HTTPS atau localhost">
				Buka aplikasi melalui HTTPS untuk memakai kamera. Input kode tetap tersedia.
			</Alert>
		{:else}
			<Alert tone="warning" title="Kamera tidak dapat dipakai">
				{message || 'Periksa izin kamera dan pastikan perangkat memiliki kamera.'}
			</Alert>
			<Button type="button" size="sm" onclick={startCamera}>Coba lagi</Button>
		{/if}
	</div>

	<form class="manual" onsubmit={submitManual}>
		<label for="scan-manual">Atau ketik kode aset</label>
		<div class="manual-row">
			<input
				id="scan-manual"
				type="text"
				autocomplete="off"
				autocapitalize="characters"
				spellcheck={false}
				placeholder="Contoh: AST-2026-0001"
				bind:value={manualCode}
			/>
			<Button type="submit" variant="secondary">Cek</Button>
		</div>
	</form>
</div>

<style>
	.camera-frame {
		position: relative;
		overflow: hidden;
		aspect-ratio: 4 / 3;
		max-height: 320px;
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
		border: 3px solid rgb(255 255 255 / 0.85);
		border-radius: var(--radius-md);
		box-shadow: 0 0 0 9999px rgb(0 0 0 / 0.28);
		transform: translate(-50%, -50%);
		pointer-events: none;
	}

	.scanner-status {
		display: grid;
		gap: var(--space-2);
		margin-top: var(--space-3);
	}

	.hint {
		margin: 0;
		color: var(--text-2);
		font-size: var(--font-size-sm);
	}

	.active-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.manual {
		display: grid;
		gap: var(--space-1);
		margin-top: var(--space-3);
		padding-top: var(--space-3);
		border-top: 1px solid var(--border);
	}

	.manual label {
		color: var(--text-2);
		font-size: var(--font-size-sm);
		font-weight: var(--weight-medium);
	}

	.manual-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.manual-row input {
		flex: 1 1 180px;
		min-height: var(--touch-target);
		padding: 0 var(--space-3);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-md);
		background: var(--surface);
		color: var(--text-1);
		font-family: var(--font-mono);
		font-size: var(--font-size-base);
	}
</style>
