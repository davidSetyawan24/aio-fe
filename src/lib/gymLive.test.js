import { describe, expect, it } from 'vitest'
import { ApiError } from './api.js'
import {
  GHOST_KEY, LIVE_KEY, OFFLINE_TEXT, OfflineError, addExercise, addRow, checkRow, clearGhosts, deleteRow, editRow,
  flush, fromServer, lastActivityAt, load, loadGhosts, newLive, save, saveGhosts,
} from './gymLive.js'

// ---- data contoh ----
const ex = (id, name, last = null) => ({ id, name, restSec: 120, step: 2.5, dumbbell: false, last, record: null })
const EXERCISES = [
  ex(1, 'Incline Dumbbell Press', { on: '2026-11-16', sets: [[22.5, 10], [22.5, 9]] }),
  ex(2, 'Shoulder Press', { on: '2026-11-16', sets: [[30, 8], [30, 8], [30, 7]] }),
  ex(3, 'Pec Deck'),
  ex(9, 'Cable Fly', { on: '2026-11-10', sets: [[15, 12]] }),
]
const PROGRAMS = [{ key: 'push', exerciseIds: [1, 2, 3], lastOn: '2026-11-16' }]
const T0 = '2026-11-23T11:05:00.000Z'
const at = (min) => new Date(Date.parse(T0) + min * 60000)

function seq(prefix = 'k') {
  let n = 0
  return () => `${prefix}${++n}`
}
const start = (over = {}) => newLive({ program: 'push', programs: PROGRAMS, exercises: EXERCISES, now: at(0), uid: seq(), ...over })

// ---- server palsu yang bisa "offline" & bisa "nerima tapi jawabannya ilang" ----
function fakeServer() {
  const s = { offline: false, dropNext: false, sessions: [], sets: [], calls: [], nextId: 100 }
  const net = () => new ApiError('Nggak bisa nyambung ke server.', 0)
  const reached = (call) => {
    if (s.offline) throw net()
    s.calls.push(call)
  }
  const reply = (value) => {
    if (s.dropNext) {
      s.dropNext = false
      throw net()
    }
    return structuredClone(value)
  }
  const sessionOf = (id) => s.sessions.find((x) => x.id === Number(id))
  const out = (set) => {
    const o = { ...set }
    delete o.sessionId
    return o
  }
  const view = (sess) => ({ ...sess, sets: s.sets.filter((x) => x.sessionId === sess.id).map(out) })
  s.api = {
    async post(url, body) {
      reached({ m: 'post', url, body })
      if (url === '/gym/sessions') {
        const same = s.sessions.find((x) => x.clientId === body.clientId)
        if (same) return reply(view(same))
        const running = s.sessions.find((x) => !x.endedAt)
        if (running) throw new ApiError('Masih ada sesi Push yang jalan.', 409, { active: view(running) })
        const sess = { id: s.nextId++, clientId: body.clientId, program: body.program, planned: [1, 2, 3], startedAt: body.startedAt, endedAt: null }
        s.sessions.push(sess)
        return reply(view(sess))
      }
      const m = url.match(/^\/gym\/sessions\/(\d+)\/sets$/)
      if (m) {
        const sess = sessionOf(m[1])
        if (!sess) throw new ApiError('Sesinya nggak ketemu.', 404)
        const same = s.sets.find((x) => x.sessionId === sess.id && x.clientId === body.clientId)
        if (same) return reply(view(sess).sets.find((x) => x.id === same.id))
        if (sess.endedAt && body.doneAt > sess.endedAt) throw new ApiError('Sesinya udah diselesaiin.', 409)
        const set = { id: s.nextId++, sessionId: sess.id, ...body }
        s.sets.push(set)
        return reply(out(set))
      }
      throw new Error(`url aneh ${url}`)
    },
    async patch(url, body) {
      reached({ m: 'patch', url, body })
      const [, sid, setId] = url.match(/^\/gym\/sessions\/(\d+)\/sets\/(\d+)$/)
      const set = s.sets.find((x) => x.id === Number(setId) && x.sessionId === Number(sid))
      if (!set) throw new ApiError('Setnya nggak ketemu.', 404)
      Object.assign(set, body)
      return reply(out(set))
    },
    async del(url) {
      reached({ m: 'del', url })
      const [, , setId] = url.match(/^\/gym\/sessions\/(\d+)\/sets\/(\d+)$/)
      const i = s.sets.findIndex((x) => x.id === Number(setId))
      if (i < 0) throw new ApiError('Setnya nggak ketemu.', 404)
      s.sets.splice(i, 1)
      return reply(null)
    },
    async get() {
      throw new Error('nggak dipake')
    },
  }
  s.serverSets = () => s.sets.map((x) => [x.exerciseId, x.weight, x.reps])
  s.count = (m, re) => s.calls.filter((c) => c.m === m && re.test(c.url)).length
  return s
}

function memStorage() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    map,
  }
}

describe('newLive: draf sesi baru di HP', () => {
  it('bentuk awal + baris dari patokan sesi lalu', () => {
    const live = start()
    expect(live).toMatchObject({ clientId: 'k1', serverId: null, program: 'push', startedAt: T0, planned: [1, 2, 3], open: 0, timer: null })
    expect(live.queue).toEqual([{ op: 'start' }])
    expect(live.items.map((i) => i.exerciseId)).toEqual([1, 2, 3])
    expect(live.items[0].rows).toEqual([
      { key: 'k2', weight: 22.5, reps: 10, done: false, doneAt: null, serverId: null, prev: [22.5, 10] },
      { key: 'k3', weight: 22.5, reps: 9, done: false, doneAt: null, serverId: null, prev: [22.5, 9] },
    ])
    expect(live.items[1].rows).toHaveLength(3)
  })

  it('angka patokan dari server berupa teks (Decimal) tetep jadi angka & bisa dicentang', () => {
    const live = newLive({ program: 'push', programs: PROGRAMS, exercises: [ex(1, 'X', { on: '2026-11-16', sets: [['22.5', 10]] })], now: at(0), uid: seq() })
    expect(live.items[0].rows[0]).toMatchObject({ weight: 22.5, reps: 10, prev: [22.5, 10] })
    expect(checkRow(live, 0, 0, at(1))).toBe(true)
  })

  it('gerakan tanpa riwayat → satu baris kosong', () => {
    const rows = start().items[2].rows
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ weight: null, reps: null, done: false, prev: null })
  })
})

describe('checkRow / editRow / addRow / deleteRow', () => {
  it('✓ → done + doneAt + antri add; baris berikutnya yang kosong keisi angka barusan', () => {
    const live = start()
    addRow(live, 2, seq('n'))
    expect(checkRow(live, 2, 0, at(3))).toBe(false) // kosong → ✓ mati
    expect(checkRow(live, 2, 0, at(3), { weight: 40, reps: 12 })).toBe(true)
    const [r0, r1] = live.items[2].rows
    expect(r0).toMatchObject({ weight: 40, reps: 12, done: true, doneAt: at(3).toISOString() })
    expect(r1).toMatchObject({ weight: 40, reps: 12, done: false })
    expect(live.queue.at(-1)).toEqual({ op: 'add', key: r0.key })
  })

  it('baris berikutnya yang udah ada angka nggak ditimpa', () => {
    const live = start()
    checkRow(live, 0, 0, at(2), { weight: 25, reps: 8 })
    expect(live.items[0].rows[1]).toMatchObject({ weight: 22.5, reps: 9 })
  })

  it('angka ngaco nggak bisa dicentang', () => {
    const live = start()
    expect(checkRow(live, 0, 0, at(1), { weight: 0, reps: 8 })).toBe(false)
    expect(checkRow(live, 0, 0, at(1), { weight: 1000, reps: 8 })).toBe(false)
    expect(checkRow(live, 0, 0, at(1), { weight: 20, reps: 101 })).toBe(false)
    expect(checkRow(live, 0, 0, at(1), { weight: 20, reps: 2.5 })).toBe(false)
    expect(live.queue).toEqual([{ op: 'start' }])
  })

  it('✓ set 3 di gerakan yang patokannya 2 set → baris tambahan keisi angka set 2', () => {
    const live = start()
    checkRow(live, 0, 0, at(2))
    checkRow(live, 0, 1, at(4), { weight: 25, reps: 7 })
    addRow(live, 0, seq('n'))
    const r2 = live.items[0].rows[2]
    expect(r2).toMatchObject({ weight: 25, reps: 7, done: false, prev: null })
    expect(checkRow(live, 0, 2, at(6))).toBe(true)
    expect(r2).toMatchObject({ weight: 25, reps: 7, done: true })
  })

  it('editRow baris belum ✓ cuma ganti angka di HP (boleh kosong), nggak antri', () => {
    const live = start()
    expect(editRow(live, 0, 1, { weight: null, reps: 9 })).toBe(true)
    expect(live.items[0].rows[1]).toMatchObject({ weight: null, reps: 9 })
    expect(live.queue).toEqual([{ op: 'start' }])
  })

  it('editRow / deleteRow set udah kekirim → antri edit / del pakai id server', () => {
    const live = start()
    live.queue = []
    live.serverId = 100
    checkRow(live, 0, 0, at(2))
    live.queue = []
    live.items[0].rows[0].serverId = 501
    const key = live.items[0].rows[0].key
    expect(editRow(live, 0, 0, { weight: 25, reps: 8 })).toBe(true)
    editRow(live, 0, 0, { weight: 25, reps: 9 })
    expect(live.queue).toEqual([{ op: 'edit', key, serverId: 501 }]) // digabung, angka dibaca pas kirim
    expect(editRow(live, 0, 0, { weight: 0, reps: 9 })).toBe(false)
    deleteRow(live, 0, 0)
    expect(live.queue).toEqual([{ op: 'del', key, serverId: 501 }])
    expect(live.items[0].rows).toHaveLength(1)
  })

  it('hapus baris terakhir → balik satu baris kosong', () => {
    const live = start()
    deleteRow(live, 2, 0, seq('n'))
    expect(live.items[2].rows).toHaveLength(1)
    expect(live.items[2].rows[0]).toMatchObject({ key: 'n1', weight: null, reps: null, done: false })
  })

  it('addExercise: gerakan tambahan (extra) + kebuka; yang udah ada cuma dibuka', () => {
    const live = start()
    expect(addExercise(live, EXERCISES[3], seq('n'))).toBe(3)
    expect(live.items[3]).toMatchObject({ exerciseId: 9, extra: true })
    expect(live.items[3].rows[0]).toMatchObject({ weight: 15, reps: 12, prev: [15, 12] })
    expect(live.open).toBe(3)
    expect(addExercise(live, EXERCISES[1])).toBe(1)
    expect(live.items).toHaveLength(4)
    expect(live.open).toBe(1)
  })

  it('lastActivityAt = set terakhir yang dicentang (termasuk yang masih ngantri), kalau belum ada = mulai', () => {
    const live = start()
    expect(lastActivityAt(live)).toBe(T0)
    checkRow(live, 1, 0, at(20))
    checkRow(live, 0, 0, at(9))
    expect(lastActivityAt(live)).toBe(at(20).toISOString())
  })
})

describe('flush: antrian kirim', () => {
  it('Review Focus #1: offline ✓ 3 → benerin 1 yang belum kekirim → hapus 1 → app ditutup-buka → online: persis 2 set, angka bener, nggak dobel', async () => {
    const srv = fakeServer()
    const storage = memStorage()
    let live = start()
    srv.offline = true
    expect(await flush(live, srv.api)).toMatchObject({ done: false })
    checkRow(live, 0, 0, at(2)) // 22,5 × 10
    checkRow(live, 0, 1, at(5)) // 22,5 × 9
    checkRow(live, 1, 0, at(9)) // 30 × 8
    await flush(live, srv.api)
    editRow(live, 0, 1, { weight: 25, reps: 7 }) // benerin yang belum kekirim
    deleteRow(live, 1, 0) // hapus yang belum kekirim
    expect(live.queue.map((o) => o.op)).toEqual(['start', 'add', 'add'])
    save(storage, live)
    live = load(storage) // app ditutup-buka
    expect(live.queue.map((o) => o.op)).toEqual(['start', 'add', 'add'])
    expect(srv.calls).toEqual([])

    srv.offline = false
    const res = await flush(live, srv.api)
    expect(res).toMatchObject({ done: true, lost: 0, joined: null })
    expect(srv.count('post', /^\/gym\/sessions$/)).toBe(1)
    expect(srv.count('post', /\/sets$/)).toBe(2)
    expect(srv.calls.filter((c) => c.m !== 'post')).toEqual([])
    expect(srv.serverSets()).toEqual([[1, 22.5, 10], [1, 25, 7]])
    expect(live.serverId).toBe(100)
    expect(live.queue).toEqual([])
    expect(live.items[0].rows.map((r) => r.serverId)).toEqual([101, 102])
    // dikirim lagi pun nggak nambah apa-apa
    await flush(live, srv.api)
    expect(srv.calls).toHaveLength(3)
  })

  it('berhenti di error jaringan pertama & urutan tetep (start dulu)', async () => {
    const srv = fakeServer()
    const live = start()
    checkRow(live, 0, 0, at(2))
    srv.offline = true
    const res = await flush(live, srv.api)
    expect(res.done).toBe(false)
    expect(live.queue.map((o) => o.op)).toEqual(['start', 'add'])
  })

  it('kirim ulang add yang sama abis jawaban ilang (timeout) → server balikin set lama, nggak dobel', async () => {
    const srv = fakeServer()
    const live = start()
    await flush(live, srv.api)
    checkRow(live, 0, 0, at(2))
    srv.dropNext = true
    expect((await flush(live, srv.api)).done).toBe(false)
    expect(srv.sets).toHaveLength(1)
    expect(live.queue).toHaveLength(1)
    expect((await flush(live, srv.api)).done).toBe(true)
    expect(srv.sets).toHaveLength(1)
    expect(live.items[0].rows[0].serverId).toBe(srv.sets[0].id)
  })

  it('jawaban add ilang lalu angkanya dibenerin → kirim ulang + PATCH angka baru', async () => {
    const srv = fakeServer()
    const live = start()
    await flush(live, srv.api)
    checkRow(live, 0, 0, at(2))
    srv.dropNext = true
    await flush(live, srv.api)
    editRow(live, 0, 0, { weight: 25, reps: 6 })
    await flush(live, srv.api)
    expect(live.queue).toEqual([])
    expect(srv.serverSets()).toEqual([[1, 25, 6]])
  })

  it('jawaban add ilang lalu setnya dihapus → server tetep dihapusin (nggak ada set nyasar)', async () => {
    const srv = fakeServer()
    const live = start()
    await flush(live, srv.api)
    checkRow(live, 0, 0, at(2))
    srv.dropNext = true
    await flush(live, srv.api)
    deleteRow(live, 0, 0)
    expect(live.queue.map((o) => o.op)).toEqual(['cancel'])
    await flush(live, srv.api)
    expect(live.queue).toEqual([])
    expect(srv.sets).toEqual([])
  })

  it('set dihapus / dibenerin pas add-nya lagi di jalan → server ikut', async () => {
    const srv = fakeServer()
    const live = start()
    await flush(live, srv.api)
    checkRow(live, 0, 0, at(2))
    checkRow(live, 0, 1, at(3))
    let release
    const gate = new Promise((r) => (release = r))
    const slow = { ...srv.api, post: async (url, body) => (await gate, srv.api.post(url, body)) }
    const running = flush(live, slow)
    await Promise.resolve()
    deleteRow(live, 0, 0) // add pertama lagi di jalan
    editRow(live, 0, 0, { weight: 27.5, reps: 5 }) // baris kedua (sekarang indeks 0), add-nya masih ngantri
    release()
    await running
    await flush(live, srv.api)
    expect(live.queue).toEqual([])
    expect(srv.serverSets()).toEqual([[1, 27.5, 5]])
  })

  it('PATCH lagi di jalan terus angkanya diubah lagi → angka terakhir yang nyampe', async () => {
    const srv = fakeServer()
    const live = start()
    checkRow(live, 0, 0, at(2))
    await flush(live, srv.api)
    editRow(live, 0, 0, { weight: 25, reps: 8 })
    let release
    const gate = new Promise((r) => (release = r))
    const slow = { ...srv.api, patch: async (url, body) => (await gate, srv.api.patch(url, body)) }
    const running = flush(live, slow)
    await Promise.resolve()
    editRow(live, 0, 0, { weight: 25, reps: 9 })
    release()
    await running
    await flush(live, srv.api)
    expect(srv.serverSets()).toEqual([[1, 25, 9]])
    expect(live.queue).toEqual([])
  })

  it('start 409 (sesi lain udah jalan) → set nyambung ke sesi itu, joined true', async () => {
    const srv = fakeServer()
    srv.sessions.push({ id: 7, clientId: 'ipad', program: 'pull', planned: [9], startedAt: T0, endedAt: null })
    const live = start()
    checkRow(live, 0, 0, at(2))
    const res = await flush(live, srv.api)
    expect(res.done).toBe(true)
    expect(res.joined).toMatchObject({ id: 7, program: 'pull' })
    expect(live.serverId).toBe(7)
    expect(live.joined).toBe(true)
    expect(srv.sets.map((x) => x.sessionId)).toEqual([7])
  })

  it('add 409 (sesinya udah diselesaiin) → dibuang + lost 1, nggak dicoba terus', async () => {
    const srv = fakeServer()
    const live = start()
    await flush(live, srv.api)
    srv.sessions[0].endedAt = at(1).toISOString()
    checkRow(live, 0, 0, at(2))
    const res = await flush(live, srv.api)
    expect(res).toMatchObject({ done: true, lost: 1, rejected: 0, dropped: 1 })
    expect(live.lost).toBe(1)
    expect(live.queue).toEqual([])
    expect(srv.sets).toEqual([])
    expect(live.items[0].rows[0]).toMatchObject({ done: false, doneAt: null, weight: 22.5, reps: 10 }) // nggak keliatan kesimpen
  })

  it('add 404 / 422 → baris balik belum ✓ (angka tetep), rejected naik, bukan lost', async () => {
    for (const status of [404, 422]) {
      const live = start()
      live.queue = []
      live.serverId = 100
      checkRow(live, 0, 0, at(2), { weight: 25, reps: 8 })
      const api = { post: async () => { throw new ApiError('x', status) } }
      expect(await flush(live, api)).toMatchObject({ done: true, lost: 0, rejected: 1, dropped: 1 })
      expect(live.lost).toBe(0)
      expect(live.items[0].rows[0]).toMatchObject({ done: false, weight: 25, reps: 8 })
      expect(checkRow(live, 0, 0, at(5))).toBe(true) // bisa dicentang lagi
    }
  })

  it('add lagi di jalan, barisnya dihapus sendiri, lalu ditolak 409 → diem (nggak diitung), cancel ikut kebuang', async () => {
    const live = start()
    live.queue = []
    live.serverId = 100
    checkRow(live, 0, 0, at(2))
    let release
    const gate = new Promise((r) => (release = r))
    const api = { post: async () => { await gate; throw new ApiError('Sesinya udah diselesaiin.', 409) } }
    const running = flush(live, api)
    await Promise.resolve()
    deleteRow(live, 0, 0)
    expect(live.queue.map((o) => o.op)).toEqual(['cancel'])
    release()
    expect(await running).toMatchObject({ done: true, lost: 0, rejected: 0 })
    expect(live.queue).toEqual([])
  })

  it('beban 3 desimal dibulatin 2 desimal; server yang ngebulatin nggak bikin PATCH muter terus', async () => {
    const live = start()
    let calls = 0
    const r2 = (x) => Math.round(x * 100) / 100
    const api = {
      post: async (url, b) => (calls++, url === '/gym/sessions' ? { id: 100 } : { id: 500, ...b, weight: r2(b.weight) }),
      patch: async (url, b) => {
        if (++calls > 20) throw new ApiError('loop', 0)
        return { id: 500, ...b, weight: r2(b.weight) }
      },
    }
    checkRow(live, 0, 0, at(2), { weight: 22.555, reps: 10 })
    expect(live.items[0].rows[0].weight).toBe(22.56)
    expect(await flush(live, api)).toMatchObject({ done: true })
    expect(calls).toBe(2)
    editRow(live, 0, 0, { weight: 102.505, reps: 9 })
    expect(live.items[0].rows[0].weight).toBe(102.51)
    expect(await flush(live, api)).toMatchObject({ done: true })
    expect(calls).toBe(3)
  })

  it('server yang jawab angka aneh terus → paling banyak 1 PATCH susulan, nggak muter', async () => {
    const live = start()
    let patches = 0
    const api = {
      post: async (url, b) => (url === '/gym/sessions' ? { id: 100 } : { id: 500, ...b, weight: b.weight + 1 }),
      patch: async (url, b) => {
        if (++patches > 5) throw new ApiError('loop', 0)
        return { id: 500, ...b, weight: b.weight + 1 }
      },
    }
    checkRow(live, 0, 0, at(2))
    expect(await flush(live, api)).toMatchObject({ done: true })
    expect(patches).toBe(1)
  })

  it('PATCH jawab tanpa data + angka diubah lagi pas PATCH jalan → angka terakhir tetep nyampe', async () => {
    const srv = fakeServer()
    const live = start()
    checkRow(live, 0, 0, at(2))
    await flush(live, srv.api)
    editRow(live, 0, 0, { weight: 25, reps: 8 })
    let release
    const gate = new Promise((r) => (release = r))
    const slow = { ...srv.api, patch: async (url, body) => (await gate, await srv.api.patch(url, body), null) }
    const running = flush(live, slow)
    await Promise.resolve()
    editRow(live, 0, 0, { weight: 25, reps: 9 })
    release()
    await running
    expect(live.queue).toEqual([])
    expect(srv.serverSets()).toEqual([[1, 25, 9]])
  })

  it('edit / del ditolak pasti (409 / 404) → dibuang, dropped naik, bukan lost', async () => {
    const live = start()
    live.queue = [
      { op: 'edit', key: 'k2', serverId: 1 },
      { op: 'del', key: 'gone', serverId: 2 },
    ]
    live.serverId = 100
    live.items[0].rows[0].done = true
    const api = {
      patch: async () => {
        throw new ApiError('Sesi ini udah selesai. Ubah lewat Riwayat.', 409)
      },
      del: async () => {
        throw new ApiError('Setnya nggak ketemu.', 404)
      },
    }
    expect(await flush(live, api)).toMatchObject({ done: true, lost: 0, dropped: 2 })
    expect(live.queue).toEqual([])
  })

  it('5xx / 401 → tetep di antrian, dicoba lagi nanti', async () => {
    const live = start()
    for (const status of [500, 401]) {
      const api = { post: async () => { throw new ApiError('x', status) } }
      expect((await flush(live, api)).done).toBe(false)
      expect(live.queue).toEqual([{ op: 'start', tried: true }])
    }
  })

  it('onChange dipanggil sebelum request & abis tiap perubahan antrian', async () => {
    const srv = fakeServer()
    const storage = memStorage()
    const live = start()
    let seen = null
    const api = { ...srv.api, post: async (url, body) => ((seen = load(storage)), srv.api.post(url, body)) }
    await flush(live, api, { onChange: () => save(storage, live) })
    expect(seen.queue).toEqual([{ op: 'start', tried: true }]) // udah kesimpen pas request jalan
    expect(load(storage)).toMatchObject({ serverId: 100, queue: [] })
  })
})

describe('fromServer: gabung sesi server + draf HP', () => {
  const S = (sets, over = {}) => ({ id: 100, clientId: 'k1', program: 'push', planned: [1, 2, 3], startedAt: T0, endedAt: null, sets, ...over })
  const st = (id, exerciseId, weight, reps, min, clientId = `c${id}`) => ({ id, clientId, exerciseId, weight, reps, doneAt: at(min).toISOString() })

  it('tanpa draf: set server + sisa patokan, gerakan di luar planned jadi extra', () => {
    const live = fromServer(S([st(1, 1, 25, 8, 2), st(2, 9, 15, 12, 5)]), EXERCISES, null, seq('n'))
    expect(live).toMatchObject({ clientId: 'k1', serverId: 100, program: 'push', planned: [1, 2, 3], queue: [] })
    expect(live.items.map((i) => [i.exerciseId, i.extra])).toEqual([[1, false], [2, false], [3, false], [9, true]])
    expect(live.items[0].rows).toEqual([
      { key: 'c1', weight: 25, reps: 8, done: true, doneAt: at(2).toISOString(), serverId: 1, prev: [22.5, 10] },
      { key: 'n1', weight: 22.5, reps: 9, done: false, doneAt: null, serverId: null, prev: [22.5, 9] },
    ])
    expect(live.items[3].rows).toHaveLength(1)
  })

  it('draf sama: angka belum ✓ & yang ngantri dipertahanin, set device lain masuk, yang dihapus di device lain ilang', () => {
    const local = start()
    local.queue = []
    local.serverId = 100
    checkRow(local, 0, 0, at(2))
    local.items[0].rows[0].serverId = 1
    local.queue = []
    checkRow(local, 1, 0, at(3)) // masih ngantri
    editRow(local, 1, 1, { weight: 32.5, reps: 6 }) // belum ✓
    const k10 = local.items[0].rows[0].key
    const merged = fromServer(S([st(5, 1, 20, 12, 4, 'other')]), EXERCISES, local, seq('n')) // set 1 dihapus di device lain
    expect(merged).toBe(local)
    expect(merged.items[0].rows.find((r) => r.key === k10)).toBeUndefined()
    expect(merged.items[0].rows[0]).toMatchObject({ key: 'other', serverId: 5, done: true, weight: 20 })
    expect(merged.items[1].rows[0]).toMatchObject({ done: true, serverId: null })
    expect(merged.items[1].rows[1]).toMatchObject({ weight: 32.5, reps: 6, done: false })
    expect(merged.queue.map((o) => o.op)).toEqual(['add'])
  })

  it('draf sama: angka server menang kecuali ada edit yang ngantri; set yang lagi dihapus nggak balik lagi', () => {
    const local = start()
    local.queue = []
    local.serverId = 100
    checkRow(local, 0, 0, at(2))
    checkRow(local, 0, 1, at(3))
    checkRow(local, 1, 0, at(4))
    local.queue = []
    local.items[0].rows[0].serverId = 1
    local.items[0].rows[1].serverId = 2
    local.items[1].rows[0].serverId = 3
    editRow(local, 0, 1, { weight: 30, reps: 5 })
    deleteRow(local, 1, 0)
    const merged = fromServer(
      S([st(1, 1, 24, 10, 2, local.items[0].rows[0].key), st(2, 1, 22.5, 9, 3, local.items[0].rows[1].key), st(3, 2, 30, 8, 4)]),
      EXERCISES,
      local,
    )
    expect(merged.items[0].rows.slice(0, 2).map((r) => [r.weight, r.reps])).toEqual([[24, 10], [30, 5]])
    expect(merged.items[1].rows.every((r) => r.serverId !== 3)).toBe(true)
  })

  it('disambung ke sesi lain: program & planned ikut sesi server, gerakan lama jadi extra', () => {
    const local = start()
    checkRow(local, 0, 0, at(2))
    local.serverId = 7
    local.open = 1
    const merged = fromServer(S([], { id: 7, clientId: 'ipad', program: 'pull', planned: [9, 2] }), EXERCISES, local, seq('n'))
    expect(merged.program).toBe('pull')
    expect(merged.items.map((i) => [i.exerciseId, i.extra])).toEqual([[9, false], [2, false], [1, true], [3, true]])
    expect(merged.items[merged.open].exerciseId).toBe(2)
  })
})

describe('clearGhosts: sesi yang dibuang pas offline', () => {
  const ghost = (over = {}) => ({ clientId: 'g1', program: 'push', startedAt: T0, serverId: null, ...over })

  // GET /gym/active palsu: sesi yang masih jalan (atau null)
  const activeOf = (id) => async (url) => {
    if (url !== '/gym/active') throw new Error(url)
    return id == null ? null : { id, program: 'push', startedAt: T0, lastSetAt: null, sets: 0 }
  }

  it('id belum tau → kirim ulang start (clientId sama) buat dapet id → masih jalan → DELETE', async () => {
    const srv = fakeServer()
    srv.sessions.push({ id: 7, clientId: 'g1', program: 'push', planned: [1], startedAt: T0, endedAt: null })
    srv.api.del = async (url) => (srv.calls.push({ m: 'del', url }), null)
    srv.api.get = async (url) => (srv.calls.push({ m: 'get', url }), activeOf(7)(url))
    const ghosts = [ghost()]
    let saved = 0
    expect(await clearGhosts(ghosts, srv.api, { onChange: () => saved++ })).toBe(true)
    expect(ghosts).toEqual([])
    expect(srv.calls.map((c) => `${c.m} ${c.url}`)).toEqual(['post /gym/sessions', 'get /gym/active', 'del /gym/sessions/7'])
    expect(srv.calls[0].body).toEqual({ program: 'push', startedAt: T0, clientId: 'g1' })
    expect(saved).toBeGreaterThan(0)
  })

  it('409 (sesi lain dari device lain lagi jalan) / balikan clientId beda → sesi orang NGGAK dihapus', async () => {
    for (const post of [
      async () => { throw new ApiError('Masih ada sesi Pull yang jalan.', 409, { active: { id: 9, clientId: 'ipad' } }) },
      async () => ({ id: 9, clientId: 'ipad' }),
    ]) {
      let deleted = false
      const ghosts = [ghost()]
      expect(await clearGhosts(ghosts, { post, get: activeOf(9), del: async () => (deleted = true) })).toBe(true)
      expect(ghosts).toEqual([])
      expect(deleted).toBe(false)
    }
  })

  it('409 tapi yang jalan ternyata sesi kita sendiri (clientId sama) → tetep dihapus', async () => {
    const urls = []
    const post = async () => { throw new ApiError('Masih ada sesi Push yang jalan.', 409, { active: { id: 7, clientId: 'g1', endedAt: null } }) }
    const ghosts = [ghost()]
    expect(await clearGhosts(ghosts, { post, get: activeOf(7), del: async (u) => urls.push(u) })).toBe(true)
    expect(urls).toEqual(['/gym/sessions/7'])
  })

  it('kirim ulang start balikin sesi yang udah diselesaiin (di device lain) → NGGAK dihapus', async () => {
    let deleted = false
    let asked = false
    const api = {
      post: async () => ({ id: 7, clientId: 'g1', endedAt: '2026-11-23T12:00:00.000Z' }),
      get: async () => ((asked = true), null),
      del: async () => (deleted = true),
    }
    const ghosts = [ghost()]
    expect(await clearGhosts(ghosts, api)).toBe(true)
    expect(ghosts).toEqual([])
    expect(deleted).toBe(false)
    expect(asked).toBe(false)
  })

  it('id udah tau tapi sesinya udah diselesaiin di device lain (bukan yang jalan) → NGGAK dihapus', async () => {
    for (const get of [activeOf(null), activeOf(12)]) {
      let deleted = false
      const ghosts = [ghost({ serverId: 5 })]
      expect(await clearGhosts(ghosts, { get, del: async () => (deleted = true) })).toBe(true)
      expect(ghosts).toEqual([])
      expect(deleted).toBe(false)
    }
  })

  it('id udah tau & masih jalan → DELETE; 404 = udah nggak ada; putus → false, hantu tetep (id yang udah dapet diinget)', async () => {
    const urls = []
    expect(await clearGhosts([ghost({ serverId: 5 })], { get: activeOf(5), del: async (u) => urls.push(u) })).toBe(true)
    expect(urls).toEqual(['/gym/sessions/5'])
    const gone = [ghost({ serverId: 5 })]
    const api404 = { get: activeOf(5), del: async () => { throw new ApiError('Sesinya nggak ketemu.', 404) } }
    expect(await clearGhosts(gone, api404)).toBe(true)
    expect(gone).toEqual([])
    const stuck = [ghost()]
    const api = { post: async () => ({ id: 8, clientId: 'g1', endedAt: null }), get: async () => { throw new ApiError('x', 0) } }
    expect(await clearGhosts(stuck, api)).toBe(false)
    expect(stuck).toEqual([ghost({ serverId: 8 })])
  })

  it('saveGhosts / loadGhosts bolak-balik; kosong = kunci dihapus; isi rusak = []', () => {
    const storage = memStorage()
    saveGhosts(storage, [ghost()])
    expect(loadGhosts(storage)).toEqual([ghost()])
    saveGhosts(storage, [])
    expect(storage.map.has(GHOST_KEY)).toBe(false)
    storage.setItem(GHOST_KEY, '{rusak')
    expect(loadGhosts(storage)).toEqual([])
  })
})

describe('save / load', () => {
  it('bolak-balik utuh di kunci aio-gym-live; null = hapus', () => {
    const storage = memStorage()
    const live = start()
    checkRow(live, 0, 0, at(2))
    addExercise(live, EXERCISES[3], seq('n'))
    save(storage, live)
    expect(LIVE_KEY).toBe('aio-gym-live')
    expect(storage.map.has('aio-gym-live')).toBe(true)
    expect(load(storage)).toEqual(live)
    save(storage, null)
    expect(load(storage)).toBeNull()
  })

  it('isi rusak / storage error → null, nggak lempar', () => {
    const storage = memStorage()
    storage.setItem(LIVE_KEY, '{rusak')
    expect(load(storage)).toBeNull()
    storage.setItem(LIVE_KEY, '{"a":1}')
    expect(load(storage)).toBeNull()
    const broken = { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') } }
    expect(load(broken)).toBeNull()
    expect(() => save(broken, start())).not.toThrow()
  })
})

describe('OfflineError', () => {
  it('teks bawaan', () => {
    const e = new OfflineError()
    expect(e.name).toBe('OfflineError')
    expect(e.message).toBe(OFFLINE_TEXT)
    expect(OFFLINE_TEXT).toBe('Belum ada sinyal. Set lo aman di HP ini, coba Selesai lagi bentar.')
  })
})
