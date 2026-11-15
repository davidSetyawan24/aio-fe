import { defineStore } from 'pinia'
import { api as defaultApi } from '@/lib/api.js'
import { usePushStore } from './push.js'

let authApi = defaultApi

/** Buat test: ganti penghubung API dengan yang palsu. */
export function setAuthApi(apiLike) {
  authApi = apiLike
}

let checking = null
let loggingInPromise = null
let changingPasswordPromise = null

/**
 * Status login:
 * - unknown: baru buka app, belum dicek
 * - authed: udah login
 * - guest: belum login / sesi habis
 * - offline: BE nggak kejangkau atau lagi error, belum tau login atau nggak
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({ user: null, status: 'unknown', loggingIn: false, changingPassword: false }),

  getters: {
    initials: (state) => (state.user?.name?.trim()?.[0] ?? '?').toUpperCase(),
  },

  actions: {
    check() {
      checking ??= (async () => {
        try {
          const data = await authApi.get('/auth/me')
          this.user = data.user
          this.status = 'authed'
        } catch (err) {
          this.user = null
          this.status = err?.status === 401 ? 'guest' : 'offline'
        } finally {
          checking = null
        }
      })()
      return checking
    },

    login(username, password) {
      if (loggingInPromise) return loggingInPromise
      this.loggingIn = true
      loggingInPromise = (async () => {
        try {
          const data = await authApi.post('/auth/login', { username, password })
          this.user = data.user
          this.status = 'authed'
        } finally {
          this.loggingIn = false
          loggingInPromise = null
        }
      })()
      return loggingInPromise
    },

    /** Ganti password. Dipanggil dobel pas masih jalan → pakai request yang sama (tap dobel di iOS). */
    changePassword(currentPassword, newPassword) {
      if (changingPasswordPromise) return changingPasswordPromise
      this.changingPassword = true
      changingPasswordPromise = (async () => {
        try {
          await authApi.post('/auth/password', { currentPassword, newPassword })
        } finally {
          this.changingPassword = false
          changingPasswordPromise = null
        }
      })()
      return changingPasswordPromise
    },

    async logout() {
      // Push device ini dimatiin DULUAN: walau logout ke server gagal (offline), HP ini nggak dapet notif lagi.
      await usePushStore().forgetOnLogout()
      try {
        await authApi.post('/auth/logout')
      } catch {
        // Gagal (misal offline) tetep dianggap keluar di device ini.
      }
      this.markGuest()
    },

    markGuest() {
      this.user = null
      this.status = 'guest'
    },
  },
})
