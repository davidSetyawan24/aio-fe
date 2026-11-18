/** Versi baru AIO: cek berkala ke server + muat ulang pas dipencet (dependensi disuntik biar bisa dites). */

/** Selama app kebuka & keliatan, cek versi baru tiap 30 menit. */
export const CHECK_EVERY_MS = 1_800_000
/** Kalau service worker baru nggak nyaut abis Muat ulang dipencet, reload aja. */
export const APPLY_FALLBACK_MS = 5000

/**
 * Cek versi baru sekarang, tiap app balik keliatan (iOS sering cuma nidurin PWA), dan tiap 30 menit pas keliatan.
 * Balikin fungsi buat berhenti.
 */
export function watchForUpdates({ registration, doc = document, setIntervalFn = setInterval, clearIntervalFn = clearInterval }) {
  const check = () => Promise.resolve(registration.update()).catch(() => {})
  const onVisible = () => {
    if (doc.visibilityState === 'visible') check()
  }
  check()
  const timer = setIntervalFn(onVisible, CHECK_EVERY_MS)
  doc.addEventListener('visibilitychange', onVisible)
  return () => {
    clearIntervalFn(timer)
    doc.removeEventListener('visibilitychange', onVisible)
  }
}

/**
 * Muat ulang ke versi baru: `updateSW(true)` (vite-plugin-pwa) nyuruh service worker baru ambil alih lalu reload.
 * Cadangan: reload sendiri abis 5 dtk. Tap kedua dst. diabaikan.
 */
export function createApplier({ updateSW, reload = () => window.location.reload(), setTimeoutFn = setTimeout }) {
  let started = false
  return () => {
    if (started) return
    started = true
    Promise.resolve(updateSW(true)).catch(() => {})
    setTimeoutFn(reload, APPLY_FALLBACK_MS)
  }
}
