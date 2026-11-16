import { defineStore } from 'pinia'
import { api as defaultApi } from '@/lib/api.js'

let invoiceApi = defaultApi

/** Buat test: ganti penghubung API dengan yang palsu. */
export function setInvoicesApi(apiLike) {
  invoiceApi = apiLike
}

/** Invoice: daftar lengkap + ringkasan, Atur invoice, dan saran klien/item. */
export const useInvoicesStore = defineStore('invoices', {
  state: () => ({ list: null, summary: null, today: null, settings: null, suggestions: null }),

  getters: {
    byId: (state) => (id) => state.list?.find((i) => i.id === Number(id)),
  },

  actions: {
    async load() {
      const data = await invoiceApi.get('/invoices')
      this.list = data.invoices
      this.summary = data.summary
      this.today = data.today
    },

    /** Dimuat ulang di belakang layar — yang udah sukses disimpen jangan keliatan gagal. */
    refresh() {
      return this.load().catch(() => {})
    },

    async loadSettings() {
      this.settings = (await invoiceApi.get('/invoice-settings')).settings
      return this.settings
    },

    async saveSettings(data) {
      this.settings = (await invoiceApi.put('/invoice-settings', data)).settings
      return this.settings
    },

    async loadSuggestions() {
      this.suggestions = await invoiceApi.get('/invoices/suggestions')
      return this.suggestions
    },

    async nextNumber(date) {
      return (await invoiceApi.get(`/invoices/next-number?date=${date}`)).number
    },

    keep(invoice) {
      if (!this.list) return
      const at = this.list.findIndex((i) => i.id === invoice.id)
      this.list = at < 0 ? [invoice, ...this.list] : this.list.map((i) => (i.id === invoice.id ? invoice : i))
    },

    async create(data) {
      const { invoice } = await invoiceApi.post('/invoices', data)
      this.keep(invoice)
      this.refresh()
      return invoice
    },

    async update(id, data) {
      const { invoice } = await invoiceApi.put(`/invoices/${id}`, data)
      this.keep(invoice)
      this.refresh()
      return invoice
    },

    /** Hapus di BE; halaman yang lagi nampilin harus emit dulu sebelum manggil ini (daftar langsung berubah). */
    async remove(id) {
      await invoiceApi.del(`/invoices/${id}`)
      if (this.list) this.list = this.list.filter((i) => i.id !== Number(id))
      this.refresh()
    },

    async setPaid(id, paidOn) {
      const { invoice } = await invoiceApi.put(`/invoices/${id}/paid`, { paidOn })
      this.keep(invoice)
      this.refresh()
      return invoice
    },

    async unsetPaid(id) {
      const { invoice } = await invoiceApi.del(`/invoices/${id}/paid`)
      this.keep(invoice)
      this.refresh()
      return invoice
    },
  },
})
