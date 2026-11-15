import { consumePendingOpen, deviceNoun, notificationFromPush, openPath, openUrl, rememberPendingOpen, pushState, pushSupport, takeNotifId, urlBase64ToUint8Array } from './push.js'

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ipados: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
}
/** Lingkungan palsu: navigator + window secukupnya. */
const env = ({ ua, touch = 0, standalone = false, push = true }) => ({
  navigator: { userAgent: ua, maxTouchPoints: touch, standalone, ...(push ? { serviceWorker: {} } : {}) },
  window: { ...(push ? { PushManager: function PushManager() {}, Notification: function Notification() {} } : {}), matchMedia: () => ({ matches: standalone }) },
})

describe('pushSupport', () => {
  it('iPhone dari Safari biasa → harus dari Home Screen dulu', () => {
    expect(pushSupport(env({ ua: UA.iphone, push: false }))).toBe('needs-home-screen')
  })
  it('iPhone dari ikon Home Screen → bisa', () => {
    expect(pushSupport(env({ ua: UA.iphone, standalone: true }))).toBe('ok')
  })
  it('iPad (ngaku Mac + layar sentuh) dari Safari biasa → harus dari Home Screen', () => {
    expect(pushSupport(env({ ua: UA.ipados, touch: 5, push: false }))).toBe('needs-home-screen')
  })
  it('Mac Chrome → bisa; browser tanpa Push API → nggak bisa', () => {
    expect(pushSupport(env({ ua: UA.macChrome }))).toBe('ok')
    expect(pushSupport(env({ ua: UA.macChrome, push: false }))).toBe('unsupported')
  })
  it('iPhone lama dari Home Screen tapi tanpa Push API → nggak bisa', () => {
    expect(pushSupport(env({ ua: UA.iphone, standalone: true, push: false }))).toBe('unsupported')
  })
})

describe('pushState', () => {
  const base = { support: 'ok', serverReady: true, permission: 'default', subscribed: false }
  it('urutan cek: dukungan → server → izin → langganan', () => {
    expect(pushState({ ...base, support: 'unsupported' })).toBe('nosupport')
    expect(pushState({ ...base, support: 'needs-home-screen' })).toBe('safari')
    expect(pushState({ ...base, serverReady: false })).toBe('noserver')
    expect(pushState({ ...base, permission: 'denied' })).toBe('blocked')
    expect(pushState({ ...base, permission: 'granted', subscribed: true })).toBe('on')
    expect(pushState({ ...base, permission: 'granted', subscribed: false })).toBe('off')
    expect(pushState(base)).toBe('off')
  })
})

describe('urlBase64ToUint8Array', () => {
  it('kunci VAPID base64url → byte', () => {
    expect([...urlBase64ToUint8Array('AQID-_8')]).toEqual([1, 2, 3, 251, 255])
  })
})

describe('deviceNoun', () => {
  it('nama device di teks', () => {
    expect(deviceNoun('iPhone')).toBe('iPhone')
    expect(deviceNoun('iPad')).toBe('iPad')
    expect(deviceNoun('Mac')).toBe('Mac')
    expect(deviceNoun('Android')).toBe('device')
    expect(deviceNoun()).toBe('device')
  })
})

describe('takeNotifId & openUrl', () => {
  it('ambil id notif dari alamat yang dibuka dari push', () => {
    expect(takeNotifId('/tabs/agenda?tanggal=2026-11-16&n=12')).toEqual({ id: 12, path: '/tabs/agenda?tanggal=2026-11-16' })
    expect(takeNotifId('/tabs/home?n=7')).toEqual({ id: 7, path: '/tabs/home' })
    expect(takeNotifId('/tabs/home?n=x')).toEqual({ id: null, path: '/tabs/home' })
    expect(takeNotifId('/tabs/uang')).toEqual({ id: null, path: '/tabs/uang' })
  })
  it('alamat yang dibuka pas notif di-tap', () => {
    expect(openUrl('/tabs/agenda?tanggal=2026-11-16', 12)).toBe('/tabs/agenda?tanggal=2026-11-16&n=12')
    expect(openUrl('/tabs/profil', 4)).toBe('/tabs/profil?n=4')
    expect(openUrl(null, 3)).toBe('/tabs/home?n=3')
    expect(openUrl(null, null)).toBe('/tabs/home')
  })
})

describe('notificationFromPush', () => {
  it('isi push → judul + pilihan notif buat service worker', () => {
    expect(notificationFromPush({ id: 12, title: '📅 Meeting klien', body: '30 menit lagi', link: '/tabs/agenda?tanggal=2026-11-16', unread: 3 })).toEqual({
      title: '📅 Meeting klien',
      options: { body: '30 menit lagi', tag: 'n12', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', data: { url: '/tabs/agenda?tanggal=2026-11-16&n=12' } },
      unread: 3,
    })
  })
  it('notif tes / isi rusak tetep nongol', () => {
    expect(notificationFromPush({ id: null, title: 'Notif tes 👋', body: 'x', link: null, unread: 0 }).options).toMatchObject({ tag: 'tes', data: { url: '/tabs/home' } })
    expect(notificationFromPush(null)).toMatchObject({ title: 'AIO Space', options: { body: 'Ada notif baru.', data: { url: '/tabs/home' } }, unread: null })
  })
})

describe('buka dari notif (iOS)', () => {
  /** Cache API palsu secukupnya. */
  const fakeCaches = () => {
    const store = new Map()
    const cache = { put: async (k, r) => store.set(k, r), match: async (k) => store.get(k), delete: async (k) => store.delete(k) }
    return { open: async () => cache, store }
  }
  it('alamat yang ditunda pas app dibuka dari notif dipake sekali', async () => {
    const caches = fakeCaches()
    await rememberPendingOpen(caches, 'https://aio.davidsetyawan.com/tabs/profil?n=12')
    expect(await consumePendingOpen(caches)).toBe('/tabs/profil?n=12')
    expect(await consumePendingOpen(caches)).toBeNull()
  })
  it('Cache API nggak ada / error → null', async () => {
    expect(await consumePendingOpen(undefined)).toBeNull()
    expect(await consumePendingOpen({ open: async () => { throw new Error('x') } })).toBeNull()
  })
  it('alamat penuh → path app', () => {
    expect(openPath('https://aio.davidsetyawan.com/tabs/agenda?tanggal=2026-11-16&n=3')).toBe('/tabs/agenda?tanggal=2026-11-16&n=3')
    expect(openPath('/tabs/home')).toBe('/tabs/home')
  })
})
