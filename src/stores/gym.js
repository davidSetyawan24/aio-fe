import { defineStore } from 'pinia'
import { toRaw } from 'vue'
import { ApiError, api as defaultApi } from '@/lib/api.js'
import { FORGOT_MIN, PROGRAM_LABEL, forgotSuggest } from '@/lib/gym.js'
import {
  OfflineError,
  addExercise,
  clearGhosts,
  addRow,
  checkRow,
  deleteRow,
  editRow,
  flush as flushLive,
  fromServer,
  lastActivityAt,
  load as loadDraft,
  loadGhosts,
  makeUid,
  newLive,
  save as saveDraft,
  saveGhosts,
} from '@/lib/gymLive.js'

export { OFFLINE_TEXT, OfflineError } from '@/lib/gymLive.js'

/** Daftar gerakan terakhir dari server (nama, langkah, rekor) — biar sesi live tetep kebaca pas app dibuka tanpa sinyal. */
export const EXERCISES_KEY = 'aio-gym-exercises'

/** "Lanjut sesi" di dialog lupa Selesai: kapan, buat sesi & set terakhir yang mana (biar reload nggak nanya lagi). */
export const FORGOT_KEY = 'aio-gym-forgot'

/** Antrian yang belum kekirim dicoba lagi tiap 15 detik. */
export const FLUSH_EVERY_MS = 15000

const browserStorage = {
  getItem: (k) => localStorage.getItem(k),
  setItem: (k, v) => localStorage.setItem(k, v),
  removeItem: (k) => localStorage.removeItem(k),
}

let gymApi = defaultApi
let storage = browserStorage
let uid = makeUid

/** Buat test: ganti penghubung API dengan yang palsu. */
export function setGymApi(apiLike) {
  gymApi = apiLike
}
/** Buat test: tempat nyimpen draf sesi (bawaan localStorage). */
export function setGymStorage(s) {
  storage = s
}
/** Buat test: pembuat `clientId` / kunci baris. */
export function setGymUid(fn) {
  uid = fn
}

// Hal-hal per store yang bukan state (kunci antrian, timer, hantu sesi yang dibuang offline).
const RUNTIME = new WeakMap()
function rt(store) {
  const key = toRaw(store)
  let r = RUNTIME.get(key)
  if (!r) {
    r = { chain: Promise.resolve(), flushing: null, again: false, timer: null, ghosts: null }
    RUNTIME.set(key, r)
  }
  return r
}

/** Satu-satu: muat, kirim antrian, selesai, buang nggak pernah jalan barengan (biar gabung data nggak balapan). */
function locked(r, fn) {
  const run = r.chain.then(fn, fn)
  r.chain = run.catch(() => {})
  return run
}

const same = (a, b) => a != null && toRaw(a) === toRaw(b)
/** Error yang artinya "coba lagi nanti": nggak ada jawaban HTTP (putus / timeout) atau server lagi error. */
const retryLater = (e) => !e?.status || e.status >= 500

/** Sesi yang dibuang pas offline & masih harus dihapus di server (kesimpen di HP, tahan app ditutup). */
function ghostsOf(store) {
  const r = rt(store)
  if (!r.ghosts) r.ghosts = loadGhosts(storage)
  return r.ghosts
}

const busy = (store) => !!store.live?.queue.length || ghostsOf(store).length > 0

function persist(store) {
  saveDraft(storage, store.live)
  store.pending = store.live ? store.live.queue.filter((o) => o.op !== 'start').length : 0
}

function readExercises() {
  try {
    const list = JSON.parse(storage.getItem(EXERCISES_KEY) ?? 'null')
    return Array.isArray(list) ? list : null
  } catch {
    return null
  }
}
function saveExercises(list) {
  try {
    storage.setItem(EXERCISES_KEY, JSON.stringify(list ?? []))
  } catch {
    // penyimpenan penuh / dimatiin: cuma cadangan
  }
}

/** Gerakan yang baru dibikin masuk daftar (memori + simpenan HP) tanpa nunggu GET /gym. */
function mergeExercise(store, exercise) {
  if (!exercise || exercise.id == null) return
  const list = store.exercises.filter((x) => x.id !== exercise.id)
  list.push(exercise)
  if (store.data) store.data.exercises = list
  else store.exCache = list
  saveExercises(list)
}

function readSnooze(st) {
  try {
    const v = JSON.parse(st.getItem(FORGOT_KEY) ?? 'null')
    return v && typeof v.key === 'string' && typeof v.lastAt === 'string' && Number.isFinite(v.at) ? v : null
  } catch {
    return null
  }
}

function notify(store, text) {
  store.notice = { id: (store.notice?.id ?? 0) + 1, text }
}

/** Timer 15 dtk nyala selama ada antrian, mati kalau kosong. */
function syncTimer(store) {
  const r = rt(store)
  const on = busy(store)
  if (on && !r.timer) r.timer = setInterval(() => kick(store), FLUSH_EVERY_MS)
  else if (!on && r.timer) {
    clearInterval(r.timer)
    r.timer = null
  }
}

// Listener online / app balik keliatan dipasang sekali, ngabarin store yang terakhir dipake.
let current = null
let listening = false
function listen(store) {
  current = store
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('online', () => current && kick(current))
  document.addEventListener('visibilitychange', () => {
    if (current && document.visibilityState === 'visible') kick(current)
  })
}

/** Kirim antrian di belakang (nggak ditunggu). */
function kick(store) {
  listen(store)
  if (busy(store)) store.flush().catch(() => {})
  else syncTimer(store)
}

/** Satu putaran kirim antrian; dipanggil di dalem kunci. Hantu dihapus duluan (biar start baru nggak nyambung ke hantu). */
async function flushOnce(store) {
  const ghosts = ghostsOf(store)
  if (ghosts.length) {
    const clear = await clearGhosts(ghosts, gymApi, { onChange: () => saveGhosts(storage, ghosts) })
    if (!clear) return null
  }
  const live = store.live
  if (!live?.queue.length) return null
  const onChange = () => {
    if (same(store.live, live)) persist(store)
  }
  const res = await flushLive(live, gymApi, { onChange })
  if (!same(store.live, live)) return res
  if (res.joined) {
    fromServer(res.joined, store.data?.exercises ?? [], live, uid)
    notify(store, `Disambung ke sesi ${PROGRAM_LABEL[res.joined.program] ?? res.joined.program} yang udah jalan`)
  }
  if (res.lost) notify(store, `${res.lost} set nggak kesimpen — sesinya udah diselesaiin.`)
  if (res.rejected) notify(store, `${res.rejected} set nggak kesimpen. Coba centang lagi.`)
  // Ada yang ditolak server (sesi udah selesai / dihapus di device lain) → muat ulang abis kunci ini lepas biar draf ikut server.
  if (res.dropped) store.load().catch(() => {})
  persist(store)
  return res
}

/** Cocokin draf HP sama sesi jalan di server (hasil `GET /gym`). */
function reconcile(store, data) {
  const ghost = (s) =>
    ghostsOf(store).some((g) => g.clientId === s.clientId || (g.serverId != null && g.serverId === s.id))
  // Sesi yang udah dibuang di HP ini tapi belum kehapus di server → anggep nggak ada (bentar lagi dihapus).
  if (data?.active && ghost(data.active)) data.active = null
  const active = data?.active ?? null
  const local = store.live
  const exercises = data?.exercises ?? []
  if (active) {
    if (local && (local.serverId === active.id || local.clientId === active.clientId))
      fromServer(active, exercises, local, uid)
    else if (!local?.queue.length) store.live = fromServer(active, exercises, null, uid)
    // draf lain yang masih punya antrian: dikirim dulu (start 409 → disambung, set telat → aturan sesi selesai)
  } else if (local && !local.queue.length) {
    store.live = null
  }
  persist(store)
}

/** Gym: data `GET /gym`, sesi yang lagi jalan di HP ini (`live`), jumlah set yang belum kekirim, kabar buat toast. */
export const useGymStore = defineStore('gym', {
  // `finishing`: lagi Selesai / Buang sesi → ✓ & ubah set ditolak (UI matiin tombolnya).
  // `exCache`: daftar gerakan simpenan HP, dipake kalau `data` belum ada (offline).
  // `reports`: Report sesi selesai per id (ringkasan / detail). `hist`: riwayat per minggu (`stale` = ada yang berubah, muat ulang).
  state: () => ({
    data: null, live: null, pending: 0, loaded: false, notice: null, finishing: false, exCache: null,
    forgot: null,
    reports: {},
    hist: { weeks: [], next: null, loaded: false, stale: false },
  }),

  getters: {
    /** Daftar gerakan: dari server kalau udah dimuat, selain itu simpenan HP. */
    exercises: (s) => s.data?.exercises ?? s.exCache ?? [],
  },

  actions: {
    /** Buka draf sesi dari HP (tanpa jaringan) kalau di memori belum ada. */
    restore() {
      if (!this.data && !this.exCache) this.exCache = readExercises()
      if (!this.live) {
        const draft = loadDraft(storage)
        if (draft) {
          this.live = draft
          persist(this)
        }
      }
      kick(this)
      return this.live
    },

    async load() {
      this.restore()
      const r = rt(this)
      try {
        await locked(r, async () => {
          const data = await gymApi.get('/gym')
          this.data = data
          this.loaded = true
          saveExercises(data?.exercises)
          reconcile(this, data)
        })
      } finally {
        kick(this)
      }
    },

    /**
     * Sesi yang kelamaan diem (> 60 menit sejak set terakhir, termasuk yang masih ngantri di HP) → `forgot` keisi
     * (dialog lupa Selesai). Abis "Lanjut sesi": diem sampe ada set baru atau 60 menit lagi.
     * Offline → pake draf HP aja.
     */
    async checkForgot(now = new Date()) {
      const nowMs = new Date(now).getTime()
      this.restore()
      let act
      try {
        act = await gymApi.get('/gym/active')
      } catch {
        act = undefined // nggak ada sinyal
      }
      if (act && !this.live) await this.load().catch(() => {})
      const live = this.live
      // Nggak ada sesi, atau udah diselesaiin di tempat lain (draf bersih tapi server bilang kosong) → nggak ada yang ditanyain.
      if (!live || (act === null && live.serverId != null && !live.queue.length)) {
        this.forgot = null
        if (live) await this.load().catch(() => {}) // cocokin: draf bersih ikut hilang
        return null
      }
      let last = Date.parse(lastActivityAt(live))
      if (act) last = Math.max(last, Date.parse(act.lastSetAt ?? act.startedAt))
      const lastAt = new Date(last).toISOString()
      const snooze = readSnooze(storage)
      const snoozed = snooze && snooze.key === live.clientId && snooze.lastAt === lastAt && nowMs - snooze.at < FORGOT_MIN * 60000
      if (nowMs - last <= FORGOT_MIN * 60000 || snoozed) {
        this.forgot = null
        return null
      }
      if (this.forgot?.key === live.clientId && this.forgot.lastAt === lastAt) return this.forgot
      this.forgot = {
        key: live.clientId,
        program: live.program,
        startedAt: live.startedAt,
        lastAt,
        sets: live.items.reduce((n, it) => n + it.rows.filter((r) => r.done).length, 0),
        suggest: forgotSuggest(live.startedAt, lastAt, new Date(nowMs)),
      }
      return this.forgot
    },

    /** "Lanjut sesi": dialognya ditutup & nggak muncul lagi sampe ada set baru / 60 menit lagi. */
    snoozeForgot(now = new Date()) {
      const f = this.forgot
      this.forgot = null
      if (!f) return
      try {
        storage.setItem(FORGOT_KEY, JSON.stringify({ key: f.key, lastAt: f.lastAt, at: new Date(now).getTime() }))
      } catch {
        // penyimpenan penuh: cuma nggak nginget abis reload
      }
    },

    /** Mulai sesi: draf langsung jadi di HP, kirim ke server di belakang. Udah ada draf → balikin yang itu. */
    start(program) {
      if (this.live) return this.live
      this.live = newLive({
        program,
        programs: this.data?.programs ?? [],
        exercises: this.data?.exercises ?? [],
        now: new Date(),
        uid,
      })
      persist(this)
      kick(this)
      return this.live
    },

    setOpen(i) {
      if (!this.live) return
      this.live.open = i
      persist(this)
    },

    /** ✓ set (angka boleh dioper sekalian). false = angkanya belum bener. */
    check(i, j, vals = null) {
      if (!this.live || this.finishing || !checkRow(this.live, i, j, new Date(), vals)) return false
      persist(this)
      kick(this)
      return true
    },

    edit(i, j, vals) {
      if (!this.live || this.finishing || !editRow(this.live, i, j, vals)) return false
      persist(this)
      kick(this)
      return true
    },

    remove(i, j) {
      if (!this.live || this.finishing || !deleteRow(this.live, i, j, uid)) return false
      persist(this)
      kick(this)
      return true
    },

    addSet(i) {
      if (!this.live || this.finishing) return -1
      const j = addRow(this.live, i, uid)
      persist(this)
      return j
    },

    /** Timer istirahat (null = matiin). Kesimpen di draf HP. */
    setTimer(timer) {
      if (!this.live) return
      this.live.timer = timer
      persist(this)
    },

    /** Tandain timer udah dibunyiin / dilewatin (nggak bunyi lagi). */
    markBeeped() {
      if (!this.live?.timer || this.live.timer.beeped) return
      this.live.timer.beeped = true
      persist(this)
    },

    addExercise(exercise) {
      if (!this.live || this.finishing) return -1
      const i = addExercise(this.live, exercise, uid)
      persist(this)
      return i
    },

    /** Kirim antrian. Cuma satu yang jalan; dipanggil pas lagi jalan → diulang sekali lagi abis itu. */
    flush() {
      const r = rt(this)
      if (r.flushing) {
        r.again = true
        return r.flushing
      }
      r.flushing = locked(r, async () => {
        let res = null
        do {
          r.again = false
          res = await flushOnce(this)
        } while (r.again)
        return res
      }).finally(() => {
        r.flushing = null
        syncTimer(this)
      })
      return r.flushing
    },

    /**
     * Selesai sesi: antrian dikirim dulu; masih ada yang nyangkut → OfflineError (data aman di HP).
     * Error lain (mis. 422 belum ada set) dilempar apa adanya. Sukses → draf dibersihin, balikin `Report`.
     */
    async finish(endedAt) {
      this.finishing = true
      const report = await locked(rt(this), async () => {
        const live = this.live
        if (!live) throw new ApiError('Sesinya nggak ketemu.', 404)
        await flushOnce(this)
        if (live.queue.length || live.serverId == null) throw new OfflineError()
        let res
        try {
          res = await gymApi.post(`/gym/sessions/${live.serverId}/finish`, endedAt ? { endedAt } : {})
        } catch (e) {
          throw retryLater(e) ? new OfflineError() : e
        }
        if (same(this.live, live)) {
          this.live = null
          this.forgot = null
          persist(this)
        }
        this.reports[res.session.id] = res
        this.hist.stale = true
        return res
      }).finally(() => {
        this.finishing = false
      })
      syncTimer(this)
      this.load().catch(() => {})
      return report
    },

    /**
     * Buang sesi yang jalan (mis. 0 set) — langsung kebuang di HP walau nggak ada sinyal.
     * Kalau sesinya (mungkin) udah kecatet di server tapi belum bisa dihapus, dicatet jadi hantu dan
     * dihapus di belakang pas sinyal balik (`clearGhosts`; sesi dari device lain nggak pernah ikut kehapus).
     */
    async discard() {
      this.finishing = true
      await locked(rt(this), async () => {
        const live = this.live
        if (!live) return
        const ghosts = ghostsOf(this)
        const ghost = {
          clientId: live.clientId,
          program: live.program,
          startedAt: live.startedAt,
          serverId: live.serverId,
        }
        if (live.serverId != null) {
          try {
            await gymApi.del(`/gym/sessions/${live.serverId}`)
          } catch (e) {
            if (retryLater(e)) ghosts.push(ghost)
            else if (e.status !== 404) throw e
          }
        } else if (live.queue.some((o) => o.op === 'start' && o.tried)) {
          ghosts.push(ghost) // start mungkin udah nyampe walau jawabannya ilang
        }
        // start belum pernah dicoba = belum pernah kecatet di server → cukup dibuang di HP.
        saveGhosts(storage, ghosts)
        if (same(this.live, live)) {
          this.live = null
          this.forgot = null
          persist(this)
        }
      }).finally(() => {
        this.finishing = false
      })
      kick(this)
      this.load().catch(() => {})
    },

    /**
     * Bikin (tanpa id) / ubah gerakan. POST 409 dilempar dengan `fields.existing`.
     * Bikin baru: langsung balik abis POST sukses (gerakannya digabung ke daftar), muat ulang di belakang.
     */
    async saveExercise(body, id = null) {
      // Jawaban server dibungkus: `{ exercise }` (bikin 201 & ubah).
      if (id == null) {
        const { exercise } = (await gymApi.post('/gym/exercises', body)) ?? {}
        mergeExercise(this, exercise)
        this.load().catch(() => {})
        return exercise ?? null
      }
      const { exercise } = (await gymApi.patch(`/gym/exercises/${id}`, body)) ?? {}
      await this.load().catch(() => {})
      return exercise ?? null
    },

    /** Report satu sesi selesai: dari simpenan kalau ada (mis. baru Selesai), `force` = ambil dari server. 404 → simpenan dibuang. */
    async report(id, { force = false } = {}) {
      if (!force && this.reports[id]) return this.reports[id]
      try {
        const res = await gymApi.get(`/gym/sessions/${id}`)
        this.reports[id] = res
        return res
      } catch (e) {
        if (e?.status === 404) delete this.reports[id]
        throw e
      }
    },

    /** Riwayat halaman pertama (isi lama diganti). Yang kelamaan datengnya dibuang kalau ada muat ulang lain di belakangnya. */
    async loadHistory() {
      const r = rt(this)
      const seq = (r.histSeq = (r.histSeq ?? 0) + 1)
      const res = await gymApi.get('/gym/sessions')
      if (seq !== r.histSeq) return
      this.hist = { weeks: res.weeks, next: res.next, loaded: true, stale: false }
    },

    /** Sambung riwayat ke minggu-minggu sebelumnya (pake `next`). */
    async moreHistory() {
      const r = rt(this)
      const next = this.hist.next
      if (!next || r.histMore) return
      const seq = r.histSeq
      r.histMore = true
      try {
        const res = await gymApi.get(`/gym/sessions?beforeWeek=${next}`)
        if (seq !== r.histSeq) return
        const have = new Set(this.hist.weeks.map((w) => w.start))
        this.hist.weeks = [...this.hist.weeks, ...res.weeks.filter((w) => !have.has(w.start))]
        this.hist.next = res.next
      } finally {
        r.histMore = false
      }
    },

    /** Ubah sesi selesai (jam + set). Sukses → Report baru; riwayat & halaman Gym dimuat ulang di belakang. */
    async saveSession(id, body) {
      const res = await gymApi.put(`/gym/sessions/${id}`, body)
      // Ubah sesi ini ngegeser banding/PR sesi lain → simpenan lain dibuang, cuma yang barusan disimpen yang tersisa.
      this.reports = { [id]: res }
      this.hist.stale = true
      this.load().catch(() => {})
      return res
    },

    async deleteSession(id) {
      await gymApi.del(`/gym/sessions/${id}`)
      this.reports = {}
      this.hist.stale = true
      this.load().catch(() => {})
    },

    /** Grafik satu gerakan: `{ exercise, points, record, flat }` langsung dari server (404 dilempar apa adanya). */
    exerciseChart(id) {
      return gymApi.get(`/gym/exercises/${id}`)
    },

    async saveProgram(key, exerciseIds) {
      // Jawaban server dibungkus: `{ program: { key, exerciseIds } }`.
      const { program } = (await gymApi.put(`/gym/programs/${key}`, { exerciseIds })) ?? {}
      // Isi program langsung ikut jawaban server (kalau muat ulang di belakang gagal, daftarnya tetep bener).
      const prog = this.data?.programs.find((p) => p.key === key)
      if (prog && Array.isArray(program?.exerciseIds)) prog.exerciseIds = program.exerciseIds
      await this.load().catch(() => {})
      return program ?? null
    },
  },
})
