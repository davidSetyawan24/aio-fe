import { defineStore } from 'pinia'
import { api as defaultApi } from '@/lib/api.js'
import { attentionKey } from '@/lib/overview.js'

let overviewApi = defaultApi

/** Buat test: ganti penghubung API dengan yang palsu. */
export function setOverviewApi(apiLike) {
  overviewApi = apiLike
}

/** Nomor permintaan terakhir: jawaban bulan yang udah ditinggal nggak boleh nimpa. */
let latest = 0

/**
 * Tab Uang: rangkuman satu bulan dari `GET /overview`.
 * Item Perlu diurus yang barusan dicentang ditandain di `done` (tetep keliatan hijau, bisa dibatalin) sampai dimuat ulang.
 */
export const useOverviewStore = defineStore('overview', {
  state: () => ({ data: null, month: null, wanted: null, done: {}, pending: {} }),

  getters: {
    isDone: (state) => (item) => Boolean(state.done[attentionKey(item)]),
    isPending: (state) => (item) => Boolean(state.pending[attentionKey(item)]),
  },

  actions: {
    /** Muat bulan itu (kosong = bulan ini). `keep` = daftar Perlu diurus yang lagi keliatan nggak diganti. */
    async load(month, { keep = false } = {}) {
      const mine = ++latest
      this.wanted = month ?? null
      const data = await overviewApi.get(month ? `/overview?month=${month}` : '/overview')
      if (mine !== latest) return
      if (keep && this.data && this.data.month === data.month) data.attention = this.data.attention
      else this.done = {}
      this.data = data
      this.month = data.month
    },

    /** Dimuat ulang di belakang layar abis nyentang — yang udah sukses jangan keliatan gagal. */
    async refresh() {
      try {
        await this.load(this.wanted ?? this.month ?? undefined, { keep: true })
      } catch {
        // diem aja, angka lama tetep keliatan
      }
    },

    /** Lunas? di Bayar Rutin. Hasil: true = Lunas, false = batal, null = diabaikan (lagi nyimpen). */
    toggleBill(item) {
      return this.toggle(item, `/recurring-bills/${item.billId}/payments/${item.period}`)
    },

    /** Udah bayar? di tagihan kartu kredit. */
    toggleCard(item) {
      return this.toggle(item, `/payment-sources/${item.sourceId}/bill-paid/${item.dueOn}`)
    },

    async toggle(item, url) {
      const key = attentionKey(item)
      if (this.pending[key]) return null
      const done = !this.done[key]
      this.pending = { ...this.pending, [key]: true }
      this.setDone(key, done)
      try {
        if (done) await overviewApi.put(url, {})
        else await overviewApi.del(url)
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
  },
})
