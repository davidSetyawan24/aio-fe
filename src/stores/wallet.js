import { defineStore } from 'pinia'
import { api as defaultApi } from '@/lib/api.js'

let walletApi = defaultApi
const starring = new Set()

/** Buat test: ganti penghubung API dengan yang palsu. */
export function setWalletApi(apiLike) {
  walletApi = apiLike
}

/** Kartu & Rekening (sumber dana). Urutan selalu dari server. */
export const useWalletStore = defineStore('wallet', {
  state: () => ({ items: [], loaded: false }),

  getters: {
    byId: (state) => (id) => state.items.find((s) => s.id === Number(id)),
  },

  actions: {
    async load() {
      const { sources } = await walletApi.get('/payment-sources')
      this.items = sources
      this.loaded = true
    },

    async create(data) {
      const { source } = await walletApi.post('/payment-sources', data)
      await this.load()
      return source
    },

    async update(id, data) {
      const { source } = await walletApi.patch(`/payment-sources/${id}`, data)
      await this.load()
      return source
    },

    async remove(id) {
      await walletApi.del(`/payment-sources/${id}`)
      await this.load()
    },

    /** ⭐ langsung ganti di layar, balik lagi kalau gagal nyimpen. */
    async toggleFavorite(id) {
      // Tap dobel pas yang pertama masih nyimpen → diabaikan, biar layar & server nggak beda.
      if (starring.has(Number(id))) return
      starring.add(Number(id))
      try {
        await this.saveFavorite(id)
      } finally {
        starring.delete(Number(id))
      }
    },

    async saveFavorite(id) {
      const next = !this.byId(id).favorite
      const set = (value) => (this.items = this.items.map((s) => (s.id === Number(id) ? { ...s, favorite: value } : s)))
      set(next)
      try {
        await walletApi.patch(`/payment-sources/${id}`, { favorite: next })
      } catch (err) {
        set(!next)
        throw err
      }
    },
  },
})
