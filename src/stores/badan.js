import { defineStore } from 'pinia'
import { api as defaultApi } from '@/lib/api.js'
import { bodySummary } from '@/lib/badan.js'

let badanApi = defaultApi

/** Buat test: ganti penghubung API dengan yang palsu. */
export function setBadanApi(apiLike) {
  badanApi = apiLike
}

/** Baca gambar timbangan bisa lama (Mistral) — tunggu sampai 60 detik. */
const SCAN_TIMEOUT_MS = 60000

const stamp = (w) => `${w.weighedOn} ${w.weighedAt ?? ''}`
const withReplace = (payload, replace) => (replace ? { ...payload, replace: true } : payload)

/** Hasil tulis → { weighing, message }; BE boleh ngirim langsung timbangannya atau { weighing, message }. */
const written = (res) => ({ weighing: res?.weighing ?? res ?? null, message: res?.message ?? null })

/** Badan: daftar timbangan (terbaru dulu) + target. 409 (udah ada) dilempar apa adanya sebagai ApiError. */
export const useBadanStore = defineStore('badan', {
  state: () => ({ weighings: [], target: null, loaded: false }),

  getters: {
    rows: (state) => state.weighings,
    last: (state) => (state.weighings.length ? [...state.weighings].sort((a, b) => stamp(b).localeCompare(stamp(a)))[0] : null),
    summary: (state) => bodySummary(state.weighings, state.target),
  },

  actions: {
    async load() {
      const data = await badanApi.get('/body')
      this.weighings = data?.weighings ?? []
      this.target = data?.target ?? null
      this.loaded = true
    },

    async save(payload, { replace = false } = {}) {
      const res = await badanApi.post('/body/weighings', withReplace(payload, replace))
      await this.load()
      return written(res)
    },

    async update(id, payload, { replace = false } = {}) {
      const res = await badanApi.patch(`/body/weighings/${id}`, withReplace(payload, replace))
      await this.load()
      return written(res)
    },

    async remove(id) {
      await badanApi.del(`/body/weighings/${id}`)
      await this.load()
    },

    /** Gambar timbangan → hasil baca (nggak disimpen di mana-mana). */
    async scan(blob) {
      const form = new FormData()
      form.append('photo', blob, 'timbangan.jpg')
      return badanApi.post('/body/scan', form, { timeout: SCAN_TIMEOUT_MS })
    },

    async saveTarget(body) {
      await badanApi.put('/body/target', body)
      await this.load()
    },

    async deleteTarget() {
      await badanApi.del('/body/target')
      await this.load()
    },
  },
})
