import { defineStore } from 'pinia'
import { api as defaultApi } from '@/lib/api.js'

let splitApi = defaultApi

/** Buat test: ganti penghubung API dengan yang palsu. */
export function setSplitBillsApi(apiLike) {
  splitApi = apiLike
}

/** Baca struk bisa lama (Mistral) — tunggu sampai 60 detik. */
const SCAN_TIMEOUT_MS = 60000

/** Split bill: daftar + ringkasan yang belum balik, split bill yang udah dibuka (lengkap). */
export const useSplitBillsStore = defineStore('splitBills', {
  state: () => ({ summary: null, bills: {} }),

  getters: {
    byId: (state) => (id) => state.bills[Number(id)],
  },

  actions: {
    async load() {
      this.summary = await splitApi.get('/split-bills')
    },

    async loadOne(id) {
      const { bill } = await splitApi.get(`/split-bills/${id}`)
      this.keep(bill)
      return bill
    },

    keep(bill) {
      this.bills = { ...this.bills, [bill.id]: bill }
    },

    /** Daftar dimuat ulang di belakang layar — simpan yang udah sukses jangan keliatan gagal. */
    refresh() {
      return this.load().catch(() => {})
    },

    async create(data) {
      const { bill } = await splitApi.post('/split-bills', data)
      this.keep(bill)
      this.refresh()
      return bill
    },

    async update(id, data) {
      const { bill } = await splitApi.put(`/split-bills/${id}`, data)
      this.keep(bill)
      this.refresh()
      return bill
    },

    async setPaid(id, personId, paid) {
      const { bill } = await splitApi.patch(`/split-bills/${id}/people/${personId}`, { paid })
      this.keep(bill)
      this.refresh()
      return bill
    },

    /** Hapus di BE. Cache-nya sengaja belum dibuang: halaman yang lagi nampilin harus dikasih tau dulu, baru `forget()`. */
    async remove(id) {
      await splitApi.del(`/split-bills/${id}`)
      this.refresh()
    },

    forget(id) {
      const { [Number(id)]: _gone, ...rest } = this.bills
      this.bills = rest
    },

    /** Foto struk → hasil baca (nggak disimpen di mana-mana). */
    async scan(file) {
      const form = new FormData()
      form.append('photo', file, 'struk.jpg')
      return splitApi.post('/split-bills/scan', form, { timeout: SCAN_TIMEOUT_MS })
    },
  },
})
