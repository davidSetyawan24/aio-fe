import { defineStore } from 'pinia'
import { api as defaultApi } from '@/lib/api.js'

let billsApi = defaultApi

/** Buat test: ganti penghubung API dengan yang palsu. */
export function setBayarRutinApi(apiLike) {
  billsApi = apiLike
}

/** Nomor permintaan terakhir: jawaban bulan yang udah ditinggal nggak boleh nimpa. */
let latest = 0
const rowKey = (row) => `${row.billId}:${row.period}`
const payUrl = (row) => `/recurring-bills/${row.billId}/payments/${row.period}`

/** Bayar Rutin: isi satu bulan (ringkasan, baris, siapin dana) + daftar semua. Status & telat dihitung server. */
export const useBayarRutinStore = defineStore('bayarRutin', {
  state: () => ({ month: null, today: null, firstMonth: null, summary: null, rows: [], bySource: [], bills: [], pending: {} }),

  getters: {
    billById: (state) => (id) => state.bills.find((b) => b.id === Number(id)),
  },

  actions: {
    async load(month) {
      const mine = ++latest
      const data = await billsApi.get(month ? `/recurring-bills?month=${month}` : '/recurring-bills')
      if (mine !== latest) return
      Object.assign(this, { month: data.month, today: data.today, firstMonth: data.firstMonth, summary: data.summary, rows: data.rows, bySource: data.bySource, bills: data.bills })
    },

    /** Dimuat ulang di belakang layar abis nyimpen — yang udah sukses jangan keliatan gagal. */
    refresh() {
      return this.load(this.month ?? undefined).catch(() => {})
    },

    async create(body) {
      const { bill } = await billsApi.post('/recurring-bills', body)
      this.refresh()
      return bill
    },

    async update(id, body) {
      const { bill } = await billsApi.patch(`/recurring-bills/${id}`, body)
      this.bills = this.bills.map((b) => (b.id === bill.id ? bill : b))
      this.refresh()
      return bill
    },

    async remove(id) {
      await billsApi.del(`/recurring-bills/${id}`)
      this.bills = this.bills.filter((b) => b.id !== Number(id))
      this.rows = this.rows.filter((r) => r.billId !== Number(id))
      this.refresh()
    },

    /** Centang / batal Lunas — langsung berubah di layar, balik lagi kalau gagal. Tap dobel selama nyimpen diabaikan. */
    async togglePaid(row) {
      const key = rowKey(row)
      if (this.pending[key]) return
      const before = row.status
      const paid = before !== 'paid'
      const after = paid ? 'paid' : row.dueOn < (this.today ?? '') ? 'late' : 'open'
      this.pending = { ...this.pending, [key]: true }
      this.setStatus(key, after)
      try {
        if (paid) await billsApi.put(payUrl(row), {})
        else await billsApi.del(payUrl(row))
        this.refresh()
      } catch (err) {
        this.setStatus(key, before)
        throw err
      } finally {
        const { [key]: _, ...rest } = this.pending
        this.pending = rest
      }
    },

    setStatus(key, status) {
      this.rows = this.rows.map((r) => (rowKey(r) === key ? { ...r, status } : r))
    },
  },
})
