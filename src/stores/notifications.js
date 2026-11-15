import { defineStore } from 'pinia'
import { syncBadge } from '@/lib/badge.js'
import { api as defaultApi } from '@/lib/api.js'
import { tabItems } from '@/modules/registry.js'

let notificationsApi = defaultApi

/** Buat test: ganti penghubung API dengan yang palsu. */
export function setNotificationsApi(apiLike) {
  notificationsApi = apiLike
}

const MAIN_PAGES = new Set(tabItems().map((t) => t.path))
/** Halaman utama (yang ada lonceng): akar tiap tab. */
export const isMainPage = (path) => MAIN_PAGES.has(path)

/** Notif di lonceng. Nggak realtime: angka disegerin pas buka app / halaman utama / balik dari background. */
export const useNotificationsStore = defineStore('notifications', {
  state: () => ({ unread: 0, items: [], loaded: false, settings: null }),

  actions: {
    async refreshCount() {
      const { unread } = await notificationsApi.get('/notifications/unread-count')
      this.setUnread(unread)
    },

    async load() {
      const data = await notificationsApi.get('/notifications')
      this.items = data.items
      this.setUnread(data.unread)
      this.loaded = true
    },

    async markRead(id) {
      const item = this.items.find((n) => n.id === id)
      if (!item || item.read) return
      this.items = this.items.map((n) => (n.id === id ? { ...n, read: true } : n))
      const { unread } = await notificationsApi.post(`/notifications/${id}/read`)
      this.setUnread(unread)
    },

    /** Notif di-tap dari layar HP (push): tandain dibaca walau daftar lonceng belum dimuat. */
    async readFromPush(id) {
      this.items = this.items.map((n) => (n.id === id ? { ...n, read: true } : n))
      const { unread } = await notificationsApi.post(`/notifications/${id}/read`)
      this.setUnread(unread)
    },

    /** Angka lonceng + angka merah di ikon app selalu sama. */
    setUnread(unread) {
      this.unread = unread
      syncBadge(unread)
    },

    async markAllRead() {
      await notificationsApi.post('/notifications/read-all')
      this.items = this.items.map((n) => ({ ...n, read: true }))
      this.setUnread(0)
    },

    async loadSettings() {
      const { settings } = await notificationsApi.get('/notifications/settings')
      this.settings = settings
    },

    /** Langsung ganti di layar, balik lagi kalau gagal nyimpen. */
    async saveSetting(key, value) {
      const before = this.settings[key]
      this.settings = { ...this.settings, [key]: value }
      try {
        const { settings } = await notificationsApi.patch('/notifications/settings', { [key]: value })
        this.settings = settings
      } catch (err) {
        this.settings = { ...this.settings, [key]: before }
        throw err
      }
    },
  },
})
