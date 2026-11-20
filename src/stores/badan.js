import { defineStore } from 'pinia'
import { api as defaultApi } from '@/lib/api.js'
import { bodySummary, foodPlan, paceEta, paceStatus, sleepSummary } from '@/lib/badan.js'

let badanApi = defaultApi

/** Buat test: ganti penghubung API dengan yang palsu. */
export function setBadanApi(apiLike) {
  badanApi = apiLike
}

/** Baca gambar (timbangan / tidur) bisa lama (Mistral) — tunggu sampai 60 detik. */
const SCAN_TIMEOUT_MS = 60000

const stamp = (w) => `${w.weighedOn} ${w.weighedAt ?? ''}`
const withReplace = (payload, replace) => (replace ? { ...payload, replace: true } : payload)

/** Hasil tulis → { weighing, message }; BE boleh ngirim langsung timbangannya atau { weighing, message }. */
const written = (res) => ({ weighing: res?.weighing ?? res ?? null, message: res?.message ?? null })
/** Sama, buat data tidur → { sleep, message }. */
const writtenSleep = (res) => ({ sleep: res?.sleep ?? res ?? null, message: res?.message ?? null })

/** Tinggi, umur & jenis kelamin dari Biodata (server yang ngitung umur); kosong = null. */
const blankProfile = () => ({ height: null, age: null, gender: null })

/** Badan: timbangan (terbaru dulu), target, aktivitas, tidur, profil. 409 (udah ada) dilempar apa adanya sebagai ApiError. */
export const useBadanStore = defineStore('badan', {
  state: () => ({ weighings: [], target: null, activity: null, sleeps: [], profile: blankProfile(), loaded: false }),

  getters: {
    rows: (state) => state.weighings,
    /** Terbaru dulu (tanggal + jam). */
    sorted: (state) => [...state.weighings].sort((a, b) => stamp(b).localeCompare(stamp(a))),
    last() {
      return this.sorted[0] ?? null
    },
    summary: (state) => bodySummary(state.weighings, state.target),
    /** Tidur terbaru dulu (tanggal bangun). */
    sleepsSorted: (state) => [...state.sleeps].sort((a, b) => b.sleptOn.localeCompare(a.sleptOn)),
    lastSleep() {
      return this.sleepsSorted[0] ?? null
    },
    sleepSum: (state) => sleepSummary(state.sleeps),
    food: (state) => foodPlan(state.weighings, state.target, state.activity),
    pace() {
      return this.summary ? paceStatus(this.target, this.weighings, this.summary.lastOn) : null
    },
    paceEtaInfo() {
      return this.summary ? paceEta(this.target, this.weighings, this.summary.lastOn) : null
    },
  },

  actions: {
    async load() {
      const data = await badanApi.get('/body')
      this.weighings = data?.weighings ?? []
      this.target = data?.target ?? null
      this.activity = data?.activity ?? null
      this.sleeps = data?.sleeps ?? []
      this.profile = { ...blankProfile(), ...data?.profile }
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

    /** Simpen aktivitas aja — yang muat ulang yang manggil (abis target ikut disimpen). */
    async saveActivity(body) {
      return badanApi.put('/body/activity', body)
    },

    async saveSleep(payload, { replace = false } = {}) {
      const res = await badanApi.post('/body/sleeps', withReplace(payload, replace))
      await this.load()
      return writtenSleep(res)
    },

    async updateSleep(id, payload, { replace = false } = {}) {
      const res = await badanApi.patch(`/body/sleeps/${id}`, withReplace(payload, replace))
      await this.load()
      return writtenSleep(res)
    },

    async removeSleep(id) {
      await badanApi.del(`/body/sleeps/${id}`)
      await this.load()
    },

    /** Gambar tidur Huawei Health → hasil baca (nggak disimpen di mana-mana). */
    async scanSleep(blob) {
      const form = new FormData()
      form.append('photo', blob, 'tidur.jpg')
      return badanApi.post('/body/sleeps/scan', form, { timeout: SCAN_TIMEOUT_MS })
    },
  },
})
