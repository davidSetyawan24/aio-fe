import { defineStore } from 'pinia'
import { ApiError, api as defaultApi } from '@/lib/api.js'
import { showToast as defaultToast } from '@/lib/personalForm.js'

/** Evaluasi yang lagi jalan dicek tiap 5 detik. */
export const EVAL_POLL_MS = 5000
/** Jawaban chat yang request-nya putus dicek tiap 3 detik. */
export const CHAT_POLL_MS = 3000
/** Berhenti nunggu jawaban yang putus setelah ±6 menit (BE sendiri udah nyerah di 5 menit). */
export const CHAT_WATCH_MAX_MS = 360000

let aiApi = defaultApi
let toast = defaultToast

/** Buat test: ganti penghubung API dengan yang palsu. */
export function setAiApi(apiLike) {
  aiApi = apiLike
}
/** Buat test: ganti toast. */
export function setAiToast(fn) {
  toast = fn
}

const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false
const listOf = (res) => res?.items ?? []
const messageOf = (e, fallback) => (e instanceof ApiError && e.message ? e.message : fallback)
/** Request putus di tengah jalan (bukan jawaban error dari server): jawabannya mungkin tetep jadi di BE. */
const dropped = (e) => !(e instanceof ApiError) || e.status === 0 || e.status === 502 || e.status === 504

let tempId = 0
const lastOf = (conv) => conv?.messages?.[conv.messages.length - 1] ?? null
const pending = (conv) => lastOf(conv)?.role === 'assistant' && lastOf(conv)?.status === 'jalan'

// Pengamat jawaban yang putus (satu aja, ikut obrolan yang kebuka).
const watch = { timer: null, token: 0 }
function stopWatch() {
  watch.token++
  clearTimeout(watch.timer)
  watch.timer = null
}

export const useAiStore = defineStore('ai', {
  state: () => ({
    settings: { autoEval: false, enabled: false },
    evals: {},
    convs: [],
    current: null,
    memories: [],
    usage: null,
  }),
  actions: {
    async loadSettings() {
      try {
        this.settings = await aiApi.get('/ai/settings')
      } catch {
        // pengaturan gagal dimuat: pakai yang lama
      }
      return this.settings
    },
    async setAutoEval(value) {
      const before = this.settings.autoEval
      this.settings = { ...this.settings, autoEval: value }
      try {
        const res = await aiApi.put('/ai/settings', { autoEval: value })
        if (res) this.settings = res
      } catch (e) {
        this.settings = { ...this.settings, autoEval: before }
        await toast(messageOf(e, 'Gagal nyimpen. Coba lagi ya.'))
      }
    },

    async loadEval(sessionId) {
      try {
        const ev = await aiApi.get(`/ai/evaluations/${sessionId}`)
        this.evals = { ...this.evals, [sessionId]: ev }
        return ev
      } catch {
        return null
      }
    },
    async startEval(sessionId) {
      if (offline()) {
        await toast('Butuh internet buat evaluasi.')
        return null
      }
      try {
        const ev = await aiApi.post('/ai/evaluations', { sessionId })
        this.evals = { ...this.evals, [sessionId]: ev }
        return ev
      } catch (e) {
        await toast(messageOf(e, 'Evaluasi gagal dimulai. Coba lagi ya.'))
        if (e instanceof ApiError && e.status === 409) await this.loadEval(sessionId)
        return null
      }
    },
    /** Cek tiap 5 dtk selama `jalan` & halaman keliatan. Balikin fungsi buat berhenti. */
    pollEval(sessionId) {
      if (this.evals[sessionId]?.status !== 'jalan') return () => {}
      let stopped = false
      let busy = false
      const stop = () => {
        stopped = true
        clearInterval(timer)
        document.removeEventListener('visibilitychange', onVisible)
      }
      const tick = async () => {
        if (stopped || busy || document.visibilityState !== 'visible') return
        busy = true
        const ev = await this.loadEval(sessionId)
        busy = false
        if (ev && ev.status !== 'jalan') stop()
      }
      const onVisible = () => {
        if (document.visibilityState === 'visible') tick()
      }
      const timer = setInterval(tick, EVAL_POLL_MS)
      document.addEventListener('visibilitychange', onVisible)
      return stop
    },

    async openConv({ context, sessionId, id }) {
      stopWatch()
      try {
        const conv = id != null ? await aiApi.get(`/ai/conversations/${id}`) : await aiApi.post('/ai/conversations', { context, ...(sessionId != null ? { sessionId } : {}) })
        this.current = conv
        if (pending(conv)) this.watchCurrent()
        return conv
      } catch (e) {
        await toast(messageOf(e, 'Obrolannya nggak kebuka. Coba lagi ya.'))
        return null
      }
    },
    async refreshCurrent() {
      const id = this.current?.id
      if (id == null) return null
      try {
        const conv = await aiApi.get(`/ai/conversations/${id}`)
        if (this.current?.id === id) this.current = conv
        return conv
      } catch {
        return null
      }
    },
    /** Cek tiap 3 dtk sampe jawaban terakhir bukan `jalan` (atau obrolannya ditinggal / kelamaan). */
    watchCurrent() {
      stopWatch()
      const token = watch.token
      const id = this.current?.id
      const started = Date.now()
      const step = async () => {
        if (token !== watch.token || this.current?.id !== id) return
        const conv = await this.refreshCurrent()
        if (token !== watch.token) return
        if ((conv && !pending(conv)) || Date.now() - started > CHAT_WATCH_MAX_MS) return
        watch.timer = setTimeout(step, CHAT_POLL_MS)
      }
      watch.timer = setTimeout(step, CHAT_POLL_MS)
    },
    stopWatching: stopWatch,

    async send(text) {
      const conv = this.current
      const clean = String(text ?? '').trim()
      if (!conv || !clean || pending(conv)) return null
      const now = new Date().toISOString()
      const user = { id: `tmp-${--tempId}`, role: 'user', text: clean, status: 'jadi', tools: [], memory: null, createdAt: now }
      const assistant = { id: `tmp-${--tempId}`, role: 'assistant', text: '', status: 'jalan', tools: [], memory: null, createdAt: now }
      const base = conv.messages
      this.current = { ...conv, messages: [...base, user, assistant] }
      try {
        const res = await aiApi.post(`/ai/conversations/${conv.id}/messages`, { text: clean })
        if (this.current?.id === conv.id) this.current = { ...this.current, messages: [...base, res.user, res.assistant] }
        return res
      } catch (e) {
        if (dropped(e)) {
          this.watchCurrent()
          return null
        }
        if (this.current?.id === conv.id) this.current = { ...this.current, messages: base }
        await toast(messageOf(e, 'Pesannya gagal kekirim. Coba lagi ya.'))
        return null
      }
    },
    /** Batalin catatan ingatan yang barusan dicatet AI di satu jawaban. */
    async undoMemory(msg) {
      const target = this.current?.messages?.find((m) => m.id === msg.id) ?? msg
      const memId = target.memory?.id
      if (memId == null) return
      try {
        await aiApi.del(`/ai/memories/${memId}`)
      } catch (e) {
        if (!(e instanceof ApiError && e.status === 404)) {
          await toast(messageOf(e, 'Gagal ngebatalin. Coba lagi ya.'))
          return
        }
      }
      target.memory = { ...target.memory, id: null }
      this.memories = this.memories.filter((m) => m.id !== memId)
    },

    async loadConvs() {
      this.convs = listOf(await aiApi.get('/ai/conversations'))
      return this.convs
    },
    async removeConv(id) {
      await aiApi.del(`/ai/conversations/${id}`)
      this.convs = this.convs.filter((c) => c.id !== id)
      if (this.current?.id === id) {
        stopWatch()
        this.current = null
      }
    },

    async loadMemories() {
      this.memories = listOf(await aiApi.get('/ai/memories'))
      return this.memories
    },
    async addMemory(text) {
      try {
        const mem = await aiApi.post('/ai/memories', { text })
        this.memories = [mem, ...this.memories]
        return mem
      } catch (e) {
        await toast(messageOf(e, 'Gagal nyatet. Coba lagi ya.'))
        return null
      }
    },
    async removeMemory(id) {
      await aiApi.del(`/ai/memories/${id}`)
      this.memories = this.memories.filter((m) => m.id !== id)
    },
    async loadUsage() {
      this.usage = await aiApi.get('/ai/usage')
      return this.usage
    },
  },
})
