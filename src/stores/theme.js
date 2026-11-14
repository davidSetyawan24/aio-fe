import { defineStore } from 'pinia'
import { applyTheme, readThemePref, resolveTheme, saveThemePref } from '@/lib/theme.js'

let env = { storage: null, doc: null }

/** Akses window.localStorage aja bisa throw (Safari "Block All Cookies") → anggap nggak ada storage. */
function safeLocalStorage() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export const useThemeStore = defineStore('theme', {
  state: () => ({ pref: 'system', systemDark: false }),

  getters: {
    resolved: (state) => resolveTheme(state.pref, state.systemDark),
  },

  actions: {
    /** Dipanggil di main.js SEBELUM app di-mount, biar nggak kedip tema yang salah. */
    init({
      storage = safeLocalStorage(),
      media = globalThis.matchMedia?.('(prefers-color-scheme: dark)'),
      doc = globalThis.document,
    } = {}) {
      env = { storage, doc }
      this.pref = readThemePref(storage)
      this.systemDark = Boolean(media?.matches)
      // "Ikut sistem": ikut langsung kalau device ganti terang/gelap (mis. otomatis malem).
      media?.addEventListener?.('change', (e) => {
        this.systemDark = e.matches
        this.apply()
      })
      this.apply()
    },

    setPref(pref) {
      this.pref = pref
      saveThemePref(env.storage, pref)
      this.apply()
    },

    apply() {
      if (env.doc) applyTheme(env.doc, this.resolved)
    },
  },
})
