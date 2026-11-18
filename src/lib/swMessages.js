/** Pesan dari app ke service worker: "versi baru boleh ambil alih sekarang" (dikirim pas tombol Muat ulang dipencet). */
export const isSkipWaiting = (data) => data?.type === 'SKIP_WAITING'
