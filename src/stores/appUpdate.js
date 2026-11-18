import { defineStore } from 'pinia'

let applier = () => {}

/** Kapsul "Ada versi baru AIO": ada versi baru yang nunggu, di-✕ (buat sesi keliatan ini), lagi muat ulang. */
export const useAppUpdateStore = defineStore('appUpdate', {
  state: () => ({ needRefresh: false, dismissed: false, applying: false }),

  getters: {
    visible: (state) => state.needRefresh && !state.dismissed,
  },

  actions: {
    /** Dipasang main.js (build production): cara muat ulang ke versi baru. */
    setApplier(fn) {
      applier = fn
    },
    markNeedRefresh() {
      this.needRefresh = true
    },
    dismiss() {
      this.dismissed = true
    },
    /** App balik keliatan: kalau versi baru masih nunggu, kapsul nongol lagi. */
    undismiss() {
      this.dismissed = false
    },
    apply() {
      if (this.applying) return
      this.applying = true
      applier()
    },
  },
})
