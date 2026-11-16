import { defineStore } from 'pinia'
import { api as defaultApi } from '@/lib/api.js'
import { homeKey } from '@/lib/home.js'

let homeApi = defaultApi

/** Buat test: ganti penghubung API dengan yang palsu. */
export function setHomeApi(apiLike) {
  homeApi = apiLike
}

/** Nomor permintaan terakhir: jawaban lama nggak boleh nimpa yang baru. */
let latest = 0

/** URL + cara centang per jenis item Perlu diurus / to-do hari ini. */
function toggleCall(item, done) {
  if (item.kind === 'bill') {
    const url = `/recurring-bills/${item.billId}/payments/${item.period}`
    return done ? homeApi.put(url, {}) : homeApi.del(url)
  }
  if (item.kind === 'card') {
    const url = `/payment-sources/${item.sourceId}/bill-paid/${item.dueOn}`
    return done ? homeApi.put(url, {}) : homeApi.del(url)
  }
  return homeApi.patch(`/agenda/todos/${item.todoId}/check`, { done, occurrence: item.recurring ? item.occurrence : null })
}

/**
 * Beranda: satu `GET /home`. Item yang barusan dicentang ditandain di `done` (tetep keliatan "udah", bisa dibatalin)
 * sampai dimuat ulang beneran (ganti hari / buka lagi).
 */
export const useHomeStore = defineStore('home', {
  state: () => ({ data: null, done: {}, pending: {} }),

  getters: {
    isDone: (state) => (item) => Boolean(state.done[homeKey(item)]),
    isPending: (state) => (item) => Boolean(state.pending[homeKey(item)]),
  },

  actions: {
    /** `keep` = Perlu diurus & to-do hari ini yang lagi keliatan nggak diganti (selama harinya masih sama). */
    async load({ keep = false } = {}) {
      const mine = ++latest
      const data = await homeApi.get('/home')
      if (mine !== latest) return
      if (keep && this.data && this.data.today === data.today) {
        data.attention = this.data.attention
        data.agenda = { ...data.agenda, todos: this.data.agenda.todos }
      } else this.done = {}
      this.data = data
    },

    /** Dimuat ulang di belakang layar abis nyentang — yang udah sukses jangan keliatan gagal. */
    async refresh() {
      try {
        await this.load({ keep: true })
      } catch {
        // diem aja, angka lama tetep keliatan
      }
    },

    /** Hasil: true = dicentang, false = dibatalin, null = diabaikan (lagi nyimpen). */
    async toggle(item) {
      const key = homeKey(item)
      if (this.pending[key]) return null
      const done = !this.done[key]
      this.pending = { ...this.pending, [key]: true }
      this.setDone(key, done)
      try {
        await toggleCall(item, done)
        this.refresh()
        return done
      } catch (err) {
        this.setDone(key, !done)
        throw err
      } finally {
        const { [key]: _, ...rest } = this.pending
        this.pending = rest
      }
    },

    setDone(key, done) {
      const { [key]: _, ...rest } = this.done
      this.done = done ? { ...rest, [key]: true } : rest
    },

    /** Lewat tengah malam WIB (tanggal beda dari data) → muat ulang penuh. */
    ensureToday(date) {
      if (this.data && date !== this.data.today) return this.load()
    },
  },
})
