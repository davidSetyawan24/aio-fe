import { defineStore } from 'pinia'
import { api as defaultApi } from '@/lib/api.js'
import { useExpensesStore } from '@/stores/expenses.js'

let budgetsApi = defaultApi

/** Buat test: ganti penghubung API dengan yang palsu. */
export function setBudgetsApi(apiLike) {
  budgetsApi = apiLike
}

/** Atur budget: semua angka halaman budget (dari server, bulan ini WIB). */
export const useBudgetsStore = defineStore('budgets', {
  state: () => ({ overview: null }),

  actions: {
    async load() {
      this.overview = await budgetsApi.get('/budgets')
    },

    async set(categoryId, amount) {
      this.overview = await budgetsApi.put(`/budgets/${categoryId}`, { amount })
      this.refreshDuit()
    },

    async release(categoryId) {
      this.overview = await budgetsApi.del(`/budgets/${categoryId}`)
      this.refreshDuit()
    },

    /** Sisa jatah di kartu Duit & layar catat ikut berubah — di belakang layar, gagal pun simpannya tetep sukses. */
    refreshDuit() {
      useExpensesStore().loadSummary().catch(() => {})
    },
  },
})
