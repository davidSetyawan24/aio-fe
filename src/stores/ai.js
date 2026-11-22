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

const LOST_TEXT = 'Pesannya gagal kekirim. Kirim ulang?'
const isLocalFail = (m) => String(m?.id).startsWith('tmp-') && m.role === 'assistant' && m.status === 'gagal'

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
    settingsLoaded: false,
    evals: {},
    convs: [],
    current: null,
    memories: [],
    usage: null,
    memoryError: '',
  }),
  actions: {
    async loadSettings() {
      try {
        this.settings = await aiApi.get('/ai/settings')
        this.settingsLoaded = true
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
        if (conv && this.current?.id === id) this.current = conv
        return conv
      } catch {
        return null
      }
    },
    /** Cek tiap 3 dtk sampe jawaban terakhir bukan `jalan` (atau obrolannya ditinggal / kelamaan). */
    watchCurrent(sent = null) {
      stopWatch()
      const token = watch.token
      const id = this.current?.id
      const started = Date.now()
      const step = async () => {
        if (token !== watch.token || this.current?.id !== id) return
        const conv = await this.refreshCurrent()
        if (token !== watch.token) return
        // Pesan yang request-nya putus ternyata nggak pernah nyampe → tampilin sebagai gagal biar bisa dikirim ulang.
        if (conv && sent && conv.messages.length <= sent.baseLen) {
          await this.failSent(conv, sent.user)
          return
        }
        if (conv && !pending(conv)) return
        if (Date.now() - started > CHAT_WATCH_MAX_MS) {
          if (sent) await this.failSent(conv ?? this.current, sent.user)
          return
        }
        watch.timer = setTimeout(step, CHAT_POLL_MS)
      }
      watch.timer = setTimeout(step, CHAT_POLL_MS)
    },
    stopWatching: stopWatch,
    /** Pesan lokal yang nggak nyampe BE: tetep keliatan + jawaban `gagal` ber-tombol Kirim ulang. */
    async failSent(conv, user) {
      if (!conv || this.current?.id !== conv.id) return
      const failed = { id: `tmp-${--tempId}`, role: 'assistant', text: LOST_TEXT, status: 'gagal', tools: [], memory: null, createdAt: user.createdAt }
      const base = conv.messages.filter((m) => !String(m.id).startsWith('tmp-'))
      this.current = { ...conv, messages: [...base, user, failed] }
      await toast(LOST_TEXT)
    },

    async send(text) {
      const conv = this.current
      const clean = String(text ?? '').trim()
      if (!conv || !clean || pending(conv)) return null
      const now = new Date().toISOString()
      const user = { id: `tmp-${--tempId}`, role: 'user', text: clean, status: 'jadi', tools: [], memory: null, createdAt: now }
      const assistant = { id: `tmp-${--tempId}`, role: 'assistant', text: '', status: 'jalan', tools: [], memory: null, createdAt: now }
      // Kirim ulang pesan yang gagal kekirim: pasangan lokal sebelumnya dibuang dulu.
      const msgs = conv.messages
      const base = isLocalFail(lastOf(conv)) ? msgs.slice(0, -2) : msgs
      this.current = { ...conv, messages: [...base, user, assistant] }
      try {
        const res = await aiApi.post(`/ai/conversations/${conv.id}/messages`, { text: clean })
        if (this.current?.id === conv.id) this.current = { ...this.current, messages: [...base, res.user, res.assistant] }
        return res
      } catch (e) {
        if (dropped(e)) {
          this.watchCurrent({ baseLen: base.length, user })
          return null
        }
        if (e instanceof ApiError && e.status === 409) {
          await toast(messageOf(e, 'Tunggu jawaban sebelumnya dulu.'))
          const fresh = await this.refreshCurrent()
          if (fresh) {
            if (pending(fresh)) this.watchCurrent()
          } else if (this.current?.id === conv.id) this.current = { ...this.current, messages: base }
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

    /** Daftar riwayat. Gagal → null (daftar lama tetep), layar yang nampilin error. */
    async loadConvs() {
      try {
        this.convs = listOf(await aiApi.get('/ai/conversations'))
        return this.convs
      } catch {
        return null
      }
    },
    async removeConv(id) {
      try {
        await aiApi.del(`/ai/conversations/${id}`)
      } catch (e) {
        await toast(messageOf(e, 'Gagal ngehapus. Coba lagi ya.'))
        return false
      }
      this.convs = this.convs.filter((c) => c.id !== id)
      if (this.current?.id === id) {
        stopWatch()
        this.current = null
      }
      return true
    },

    async loadMemories() {
      try {
        this.memories = listOf(await aiApi.get('/ai/memories'))
        return this.memories
      } catch {
        return null
      }
    },
    /** 422 (kosong / kepanjangan / penuh) nggak di-toast: pesannya masuk `memoryError`, ditampilin di bawah kolom. */
    async addMemory(text) {
      this.memoryError = ''
      try {
        const mem = await aiApi.post('/ai/memories', { text })
        this.memories = [mem, ...this.memories]
        return mem
      } catch (e) {
        if (e instanceof ApiError && e.status === 422) this.memoryError = e.message
        else await toast(messageOf(e, 'Gagal nyatet. Coba lagi ya.'))
        return null
      }
    },
    async removeMemory(id) {
      try {
        await aiApi.del(`/ai/memories/${id}`)
      } catch (e) {
        if (!(e instanceof ApiError && e.status === 404)) {
          await toast(messageOf(e, 'Gagal ngehapus. Coba lagi ya.'))
          return false
        }
      }
      this.memories = this.memories.filter((m) => m.id !== id)
      return true
    },
    async loadUsage() {
      try {
        this.usage = await aiApi.get('/ai/usage')
        return this.usage
      } catch {
        return null
      }
    },
  },
})
