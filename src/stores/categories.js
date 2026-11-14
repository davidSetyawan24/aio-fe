import { defineStore } from 'pinia'
import { api as defaultApi } from '@/lib/api.js'

let categoriesApi = defaultApi

/** Buat test: ganti penghubung API dengan yang palsu. */
export function setCategoriesApi(apiLike) {
  categoriesApi = apiLike
}

/** Kategori pengeluaran (aktif). Urutan dari server. */
export const useCategoriesStore = defineStore('categories', {
  state: () => ({ items: [], loaded: false, justCreatedId: null }),

  getters: {
    byId: (state) => (id) => state.items.find((c) => c.id === Number(id)),
  },

  actions: {
    async load() {
      const { categories } = await categoriesApi.get('/expense-categories')
      this.items = categories
      this.loaded = true
    },

    /** `forCatat`: dibikin dari layar Catat → layar itu ngambil id-nya pas balik, biar langsung kepilih. */
    async create(data, { forCatat = false } = {}) {
      const { category } = await categoriesApi.post('/expense-categories', data)
      if (forCatat) this.justCreatedId = category.id
      await this.load()
      return category
    },

    async update(id, data) {
      const { category } = await categoriesApi.patch(`/expense-categories/${id}`, data)
      await this.load()
      return category
    },

    async remove(id) {
      await categoriesApi.del(`/expense-categories/${id}`)
      await this.load()
    },

    /** Id kategori yang barusan dibikin (sekali ambil, abis itu kosong). */
    takeJustCreated() {
      const id = this.justCreatedId
      this.justCreatedId = null
      return id
    },
  },
})
