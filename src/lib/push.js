/** Notif di layar HP (Web Push): deteksi dukungan device, keadaan kartu "Device ini", alamat yang dibuka pas notif di-tap. */
import { detectKind } from './device.js'

const isStandalone = ({ navigator: nav, window: win }) => nav?.standalone === true || Boolean(win?.matchMedia?.('(display-mode: standalone)')?.matches)

/**
 * 'ok' = bisa push · 'needs-home-screen' = iPhone/iPad dibuka dari Safari biasa (iOS cuma ngizinin dari ikon Home Screen)
 * · 'unsupported' = browser/iOS nggak punya Push API.
 */
export function pushSupport(env = { navigator: globalThis.navigator, window: globalThis.window }) {
  const kind = detectKind(env.navigator)
  if ((kind === 'iPhone' || kind === 'iPad') && !isStandalone(env)) return 'needs-home-screen'
  const nav = env.navigator ?? {}
  const win = env.window ?? {}
  return 'serviceWorker' in nav && 'PushManager' in win && 'Notification' in win ? 'ok' : 'unsupported'
}

/** Keadaan kartu "Device ini" (mockup push-notif.html), urutan cek: dukungan → server → izin → langganan. */
export function pushState({ support, serverReady, permission, subscribed }) {
  if (support === 'unsupported') return 'nosupport'
  if (support === 'needs-home-screen') return 'safari'
  if (!serverReady) return 'noserver'
  if (permission === 'denied') return 'blocked'
  return permission === 'granted' && subscribed ? 'on' : 'off'
}

/** Kunci publik VAPID (base64url) → byte buat `applicationServerKey`. */
export function urlBase64ToUint8Array(text) {
  const base64 = `${text}${'='.repeat((4 - (text.length % 4)) % 4)}`.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

/** "Notif di <iPhone/iPad/Mac/device> ini". */
export const deviceNoun = (kind) => (kind === 'iPhone' || kind === 'iPad' || kind === 'Mac' ? kind : 'device')

/** Alamat yang dibuka pas notif di-tap: `link` (kosong → Beranda) + `n=<id notif>` biar app nandain dibaca. */
export function openUrl(link, id) {
  const base = link || '/tabs/home'
  if (id === null || id === undefined) return base
  return `${base}${base.includes('?') ? '&' : '?'}n=${id}`
}

/** Kebalikan `openUrl`: ambil id notif dari alamat, balikin alamat tanpa `n`. */
export function takeNotifId(fullPath) {
  const [path, query = ''] = fullPath.split('?')
  const params = new URLSearchParams(query)
  const raw = params.get('n')
  params.delete('n')
  const id = raw !== null && /^\d+$/.test(raw) ? Number(raw) : null
  const rest = params.toString()
  return { id, path: rest ? `${path}?${rest}` : path }
}

/**
 * Isi push dari BE `{ id, title, body, link, unread }` → yang ditampilin service worker.
 * Isi rusak / kosong tetep nongol (iOS wajib nampilin notif tiap push, kalau nggak langganannya bisa dicabut).
 */
export function notificationFromPush(data) {
  const d = data && typeof data === 'object' ? data : {}
  const id = typeof d.id === 'number' ? d.id : null
  return {
    title: d.title || 'AIO Space',
    options: {
      body: d.body || 'Ada notif baru.',
      tag: id === null ? 'tes' : `n${id}`,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: openUrl(typeof d.link === 'string' ? d.link : null, id) },
    },
    unread: typeof d.unread === 'number' ? d.unread : null,
  }
}

const PENDING_CACHE = 'aio-buka-notif'
const PENDING_KEY = '/__buka-notif'

/** Alamat penuh → path app ('/tabs/…?…'). */
export function openPath(url) {
  try {
    const u = new URL(url, 'http://x')
    return `${u.pathname}${u.search}`
  } catch {
    return '/tabs/home'
  }
}

/**
 * Service worker: inget alamat notif yang di-tap pas app belum kebuka. iOS kadang buka app di halaman awal
 * (bukan alamatnya) → app ngambil alamat ini pas mulai (`consumePendingOpen`).
 */
export async function rememberPendingOpen(caches, url) {
  try {
    await (await caches.open(PENDING_CACHE)).put(PENDING_KEY, new Response(url))
  } catch {
    // nggak penting: paling buka Beranda
  }
}

/** App mulai: ambil (sekali) alamat notif yang ditunda. Nggak ada → null. */
export async function consumePendingOpen(caches) {
  try {
    if (!caches) return null
    const cache = await caches.open(PENDING_CACHE)
    const hit = await cache.match(PENDING_KEY)
    if (!hit) return null
    await cache.delete(PENDING_KEY)
    return openPath(await hit.text())
  } catch {
    return null
  }
}
