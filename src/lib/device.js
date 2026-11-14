/**
 * Identitas device ini buat fitur "Device yang lagi login" (Profil).
 * Kunci acak disimpen di device ini & dikirim di header tiap request, biar nama device awet walau logout-login lagi.
 */
export const DEVICE_KEY = 'aio-device'
const KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/

let memoryKey = null

function randomKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Kunci device. Storage diblokir → kunci sementara di memori (dianggap device baru tiap app dibuka ulang). */
export function getDeviceKey(storage) {
  const fromMemory = () => (memoryKey ??= randomKey())
  if (!storage) return fromMemory()
  try {
    const saved = storage.getItem(DEVICE_KEY)
    if (saved && KEY_PATTERN.test(saved)) return saved
    const key = randomKey()
    storage.setItem(DEVICE_KEY, key)
    return key
  } catch {
    return fromMemory()
  }
}

/** Jenis device. Safari iPad ngaku Mac di user-agent → dicek dari layar sentuh. */
export function detectKind(nav) {
  const ua = nav?.userAgent ?? ''
  if (/iPhone|iPod/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && (nav?.maxTouchPoints ?? 0) > 1)) return 'iPad'
  if (/Android/.test(ua)) return 'Android'
  if (/Macintosh|Mac OS X/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Linux|X11/.test(ua)) return 'Linux'
  return 'Lainnya'
}

function safeLocalStorage() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** Header yang dikirim ke BE di tiap request. */
export function deviceHeaders() {
  return { 'X-AIO-Device': getDeviceKey(safeLocalStorage()), 'X-AIO-Device-Kind': detectKind(globalThis.navigator) }
}
