import { defineStore } from 'pinia'
import { api as defaultApi } from '@/lib/api.js'
import { pushState, pushSupport, urlBase64ToUint8Array } from '@/lib/push.js'

let pushApi = defaultApi
/** Lingkungan browser (navigator, window, Notification) — bisa diganti palsu di test. */
let env = null

/** Buat test: ganti penghubung API dengan yang palsu. */
export function setPushApi(apiLike) {
  pushApi = apiLike
}
/** Buat test: ganti browser dengan yang palsu ({ navigator, window, Notification }). */
export function setPushEnv(fake) {
  env = fake
}
const browser = () => env ?? { navigator: globalThis.navigator, window: globalThis.window, Notification: globalThis.Notification }

/** Nunggu service worker maksimal segini (biar logout / kartu nggak nyangkut kalau SW-nya nggak ada). */
const REGISTRATION_WAIT_MS = 3000

async function currentSubscription() {
  const sw = browser().navigator?.serviceWorker
  const reg = sw?.getRegistration
    ? await Promise.race([sw.getRegistration(), new Promise((resolve) => setTimeout(() => resolve(undefined), REGISTRATION_WAIT_MS))])
    : undefined
  if (!reg) return { reg: null, sub: null }
  return { reg, sub: await reg.pushManager.getSubscription() }
}

/**
 * Notif di layar HP buat device ini. `state`: loading | off | asking | on | safari | blocked | nosupport | noserver
 * (keadaan kartu di mockup push-notif.html).
 */
export const usePushStore = defineStore('push', {
  state: () => ({ state: 'loading', busy: false, publicKey: null }),

  actions: {
    /** Cek keadaan device ini. Udah nyala → kirim ulang langganan ke server (endpoint bisa dirotasi browser / kehapus di server). */
    async init() {
      const b = browser()
      const support = pushSupport(b)
      if (support !== 'ok') return this.set(pushState({ support }))
      try {
        this.publicKey = (await pushApi.get('/push/public-key')).publicKey
      } catch (err) {
        // Cuma 503 yang artinya "belum disetel"; offline / error lain → dicoba lagi pas pindah halaman.
        return this.set(err?.status === 503 ? 'noserver' : 'loading')
      }
      const permission = b.Notification?.permission ?? b.window?.Notification?.permission ?? 'default'
      let sub = null
      try {
        sub = (await currentSubscription()).sub
      } catch {
        sub = null
      }
      const next = pushState({ support, serverReady: true, permission, subscribed: Boolean(sub) })
      if (next === 'on') {
        try {
          await pushApi.put('/push/subscription', sub.toJSON())
        } catch {
          // nanti dicoba lagi pas app dibuka lagi
        }
      }
      this.set(next)
    },

    set(state) {
      this.state = state
    },

    /** Nyalain: minta izin (harus dari tap) → langganan → simpen ke server. Hasil: true = nyala. */
    async enable() {
      if (this.busy) return null
      this.busy = true
      this.state = 'asking'
      try {
        const b = browser()
        const Notif = b.Notification ?? b.window?.Notification
        const permission = await Notif.requestPermission()
        if (permission !== 'granted') {
          this.state = permission === 'denied' ? 'blocked' : 'off'
          return false
        }
        if (!this.publicKey) this.publicKey = (await pushApi.get('/push/public-key')).publicKey
        const { reg } = await currentSubscription()
        if (!reg) throw new Error('App belum siap buat notif. Tutup terus buka lagi AIO-nya ya.')
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(this.publicKey) })
        await pushApi.put('/push/subscription', sub.toJSON())
        this.state = 'on'
        return true
      } catch (err) {
        this.state = 'off'
        throw err
      } finally {
        this.busy = false
      }
    },

    /** Matiin di device ini: berhenti langganan + hapus di server. */
    async disable() {
      if (this.busy) return
      this.busy = true
      try {
        const { sub } = await currentSubscription()
        if (sub) {
          await sub.unsubscribe()
          await pushApi.del('/push/subscription', { endpoint: sub.endpoint })
        }
        this.state = 'off'
      } finally {
        this.busy = false
      }
    },

    async sendTest() {
      if (this.busy) return
      this.busy = true
      try {
        await pushApi.post('/push/test')
      } catch (err) {
        // 422 = device ini udah nggak punya langganan di server (alamat mati / kehapus) → nyalain ulang.
        if (err?.status === 422) this.state = 'off'
        throw err
      } finally {
        this.busy = false
      }
    },

    /** Abis ngebenerin izin di Pengaturan iPhone → cek lagi. */
    recheck() {
      return this.init()
    },

    /** Logout: berhenti langganan di browser DULUAN (walau offline, alamat push-nya udah mati), server best-effort. Nggak pernah gagal. */
    async forgetOnLogout() {
      try {
        const { sub } = await currentSubscription()
        if (sub) {
          await sub.unsubscribe()
          await pushApi.del('/push/subscription', { endpoint: sub.endpoint }).catch(() => {})
        }
      } catch {
        // device ini nggak punya push / browser nolak → nggak ada yang perlu dimatiin
      }
      // Dicek ulang dari nol pas login berikutnya (lihat main.js).
      this.state = 'loading'
    },
  },
})
