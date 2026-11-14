import { defineStore } from 'pinia'
import { api as defaultApi } from '@/lib/api.js'

let expensesApi = defaultApi

/** Buat test: ganti penghubung API dengan yang palsu. */
export function setExpensesApi(apiLike) {
  expensesApi = apiLike
}

const monthOf = (date) => date.slice(0, 7)

/** Duit: catatan per bulan (yang udah dibuka), ringkasan hari ini/bulan ini, saran "buat apa". */
export const useExpensesStore = defineStore('expenses', {
  state: () => ({ months: {}, summary: null, suggestions: [] }),

  getters: {
    byId: (state) => (id) => {
      for (const list of Object.values(state.months)) {
        const found = list.find((e) => e.id === Number(id))
        if (found) return found
      }
      return undefined
    },
  },

  actions: {
    async loadMonth(month) {
      const { expenses } = await expensesApi.get(`/expenses?month=${month}`)
      this.months = { ...this.months, [month]: expenses }
    },

    async loadSummary() {
      this.summary = await expensesApi.get('/expenses/summary')
    },

    async loadSuggestions() {
      const { suggestions } = await expensesApi.get('/expenses/suggestions')
      this.suggestions = suggestions
    },

    /** Muat ulang ringkasan, saran, dan bulan-bulan yang kena (yang udah dibuka atau yang disebut). */
    async refresh(dates) {
      const months = new Set(dates.filter(Boolean).map(monthOf))
      await Promise.all([this.loadSummary(), this.loadSuggestions(), ...[...months].map((m) => this.loadMonth(m))])
    },

    async create(data) {
      const { expense } = await expensesApi.post('/expenses', data)
      await this.refresh([expense.spentOn])
      return expense
    },

    async update(id, data) {
      const before = this.byId(id)
      const { expense } = await expensesApi.patch(`/expenses/${id}`, data)
      await this.refresh([before?.spentOn, expense.spentOn])
      return expense
    },

    async remove(id) {
      const before = this.byId(id)
      await expensesApi.del(`/expenses/${id}`)
      await this.refresh([before?.spentOn])
    },
  },
})
