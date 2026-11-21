import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { GHOST_KEY, LIVE_KEY, OFFLINE_TEXT, OfflineError, load as loadDraft, loadGhosts } from '@/lib/gymLive.js'
import { EXERCISES_KEY, FLUSH_EVERY_MS, setGymApi, setGymStorage, setGymUid, useGymStore } from './gym.js'
import { useHomeStore } from './home.js'

const ex = (id, name, last = null) => ({ id, name, restSec: 120, step: 2.5, dumbbell: false, last, record: null })
const EXERCISES = [
  ex(1, 'Incline Dumbbell Press', { on: '2026-11-16', sets: [[22.5, 10], [22.5, 9]] }),
  ex(2, 'Shoulder Press', { on: '2026-11-16', sets: [[30, 8]] }),
]
const gymData = (active = null) => ({
  programs: [{ key: 'push', exerciseIds: [1, 2], lastOn: '2026-11-16' }],
  exercises: EXERCISES,
  active,
  recent: [],
  week: { days: [], count: 0, minutes: 0 },
  totalSessions: 3,
  firstOn: '2026-11-02',
  mini: null,
})
const session = (over = {}) => ({ id: 100, clientId: 'k1', program: 'push', planned: [1, 2], startedAt: '2026-11-23T11:05:00.000Z', endedAt: null, sets: [], ...over })
const net = () => new ApiError('Nggak bisa nyambung ke server.', 0)
const never = () => new Promise(() => {})
const tick = async (n = 30) => {
  for (let i = 0; i < n; i++) await Promise.resolve()
}

function memStorage() {
  const map = new Map()
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k), map }
}

let api, storage, store, nextId

/** Server palsu yang nurut: start → sesi 100, set → id urut. */
function okServer() {
  nextId = 500
  api.get.mockImplementation(async (url) => (url === '/gym/active' ? { id: 100, program: 'push', sets: 0 } : gymData()))
  api.post.mockImplementation(async (url, body) => {
    if (url === '/gym/sessions') return session({ clientId: body.clientId })
    if (url.endsWith('/sets')) return { id: nextId++, ...body }
    if (url.endsWith('/finish')) return { session: session({ endedAt: 'x' }), summary: { sets: 1 } }
    if (url === '/gym/exercises') return { exercise: ex(30, body.name) }
    throw new Error(url)
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  let n = 0
  setGymUid(() => `k${++n}`)
  storage = memStorage()
  setGymStorage(storage)
  api = {
    // `/gym/active` bawaan: nggak ada sinyal (dipake hantu); okServer() nyalain jawabannya
    get: vi.fn(async (url) => {
      if (url === '/gym/active') throw net()
      return gymData()
    }),
    post: vi.fn(never),
    // bentuk jawaban persis BE: set polos, gerakan dibungkus `{ exercise }`, program dibungkus `{ program }`
    patch: vi.fn(async (url, body) => (url.startsWith('/gym/exercises/') ? { exercise: { ...ex(Number(url.split('/').pop()), 'X'), ...body } } : { id: 1, ...body })),
    put: vi.fn(async (url, body) => ({ program: { key: url.split('/').pop(), exerciseIds: body.exerciseIds } })),
    del: vi.fn(async () => null),
  }
  setGymApi(api)
  store = useGymStore()
})

afterEach(() => {
  vi.useRealTimers()
})

async function started() {
  await store.load()
  store.start('push')
  await tick()
}

describe('gym store: mulai & centang nggak nunggu jaringan', () => {
  it('start: draf HP langsung ada + kesimpen, kirim di belakang', async () => {
    await store.load()
    const live = store.start('push') // POST nggak pernah jawab
    expect(live).not.toBeInstanceOf(Promise)
    expect(store.live).toMatchObject({ clientId: 'k1', program: 'push', serverId: null, planned: [1, 2] })
    expect(store.live.items[0].rows).toHaveLength(2)
    expect(loadDraft(storage)).toMatchObject({ clientId: 'k1', program: 'push' })
    await tick()
    expect(api.post).toHaveBeenCalledWith('/gym/sessions', { program: 'push', startedAt: live.startedAt, clientId: 'k1' })
    expect(store.pending).toBe(0)
  })

  it('start lagi pas draf masih ada → balikin draf yang sama', async () => {
    await started()
    const first = store.live
    expect(store.start('pull')).toBe(first)
    expect(store.live.program).toBe('push')
  })

  it('check: langsung kecentang + kesimpen sebelum request, pending naik', async () => {
    await started()
    expect(store.check(0, 0)).toBe(true)
    expect(store.live.items[0].rows[0].done).toBe(true)
    expect(loadDraft(storage).queue.map((o) => o.op)).toEqual(['start', 'add'])
    expect(store.pending).toBe(1)
    expect(store.check(1, 0, { weight: 0, reps: 8 })).toBe(false)
  })

  it('edit / remove / addSet / addExercise / setOpen ikut kesimpen', async () => {
    await started()
    store.edit(0, 1, { weight: 25, reps: null })
    store.addSet(0)
    store.addExercise(ex(9, 'Cable Fly'))
    store.setOpen(1)
    let saved = loadDraft(storage)
    expect(saved.items[0].rows[1]).toMatchObject({ weight: 25, reps: null })
    expect(saved.items[0].rows).toHaveLength(3)
    expect(saved.items[2]).toMatchObject({ exerciseId: 9, extra: true })
    expect(saved.open).toBe(1)
    store.remove(0, 2)
    saved = loadDraft(storage)
    expect(saved.items[0].rows).toHaveLength(2)
  })
})

describe('gym store: antrian', () => {
  it('online: start + set kekirim, pending balik 0, draf kesimpen dengan id server', async () => {
    okServer()
    await started()
    store.check(0, 0)
    await store.flush()
    expect(store.pending).toBe(0)
    expect(loadDraft(storage)).toMatchObject({ serverId: 100, queue: [] })
    expect(api.post).toHaveBeenCalledWith('/gym/sessions/100/sets', expect.objectContaining({ exerciseId: 1, weight: 22.5, reps: 10, clientId: 'k2' }))
  })

  it('cuma satu kiriman jalan barengan (nggak ada request dobel)', async () => {
    let release
    const gate = new Promise((r) => (release = r))
    okServer()
    const ok = api.post.getMockImplementation()
    api.post.mockImplementation(async (url, body) => (await gate, ok(url, body)))
    await store.load()
    store.start('push')
    store.check(0, 0)
    store.check(0, 1)
    const all = Promise.all([store.flush(), store.flush(), store.flush()])
    release()
    await all
    await tick()
    expect(api.post.mock.calls.map((c) => c[0])).toEqual(['/gym/sessions', '/gym/sessions/100/sets', '/gym/sessions/100/sets'])
  })

  it('dicoba lagi tiap 15 dtk selama ada antrian, + pas online', async () => {
    vi.useFakeTimers()
    api.post.mockRejectedValue(net())
    await store.load()
    store.start('push')
    await vi.advanceTimersByTimeAsync(0)
    expect(api.post).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(FLUSH_EVERY_MS)
    expect(api.post).toHaveBeenCalledTimes(2)
    okServer()
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(0)
    expect(api.post).toHaveBeenCalledTimes(3)
    expect(store.live.serverId).toBe(100)
    await vi.advanceTimersByTimeAsync(FLUSH_EVERY_MS * 2)
    expect(api.post).toHaveBeenCalledTimes(3) // antrian kosong → berhenti
  })

  it('app balik keliatan → coba kirim', async () => {
    api.post.mockRejectedValue(net())
    await store.load()
    store.start('push')
    await tick()
    okServer()
    document.dispatchEvent(new Event('visibilitychange'))
    await tick()
    expect(store.live.serverId).toBe(100)
  })

  it('start 409 → disambung ke sesi yang udah jalan + notice', async () => {
    const other = session({ id: 7, clientId: 'ipad', program: 'pull', planned: [2] })
    api.post.mockImplementation(async (url, body) => {
      if (url === '/gym/sessions') throw new ApiError('Masih ada sesi Pull yang jalan.', 409, { active: other })
      return { id: 900, ...body }
    })
    await store.load()
    store.start('push')
    store.check(0, 0)
    await store.flush()
    expect(store.live).toMatchObject({ serverId: 7, program: 'pull', joined: true })
    expect(store.notice.text).toBe('Disambung ke sesi Pull yang udah jalan')
    expect(api.post).toHaveBeenCalledWith('/gym/sessions/7/sets', expect.objectContaining({ exerciseId: 1 }))
  })

  it('set ditolak karena sesinya udah diselesaiin → notice + muat ulang buang draf', async () => {
    okServer()
    await started()
    api.post.mockRejectedValue(new ApiError('Sesinya udah diselesaiin.', 409))
    store.check(0, 0)
    store.check(0, 1)
    await store.flush()
    await tick()
    expect(store.notice.text).toBe('2 set nggak kesimpen — sesinya udah diselesaiin.')
    expect(api.get).toHaveBeenCalledTimes(2)
    expect(store.live).toBeNull()
    expect(storage.map.has(LIVE_KEY)).toBe(false)
  })
})

describe('gym store: ditolak server', () => {
  it('set ditolak 404 (sesinya dihapus di device lain) → kabar "Sesinya udah nggak ada.", bukan "Coba centang lagi"', async () => {
    okServer()
    await started()
    api.post.mockRejectedValue(new ApiError('Sesinya nggak ketemu.', 404))
    store.check(0, 0)
    await store.flush()
    await tick()
    expect(store.notice.text).toBe('Sesinya udah nggak ada.')
  })

  it('set ditolak 422 → baris balik belum ✓ + notice "Coba centang lagi"', async () => {
    okServer()
    await started()
    api.post.mockRejectedValue(new ApiError('Bebannya kegedean (maks 999 kg).', 422))
    api.get.mockResolvedValue(gymData(session())) // sesinya masih jalan di server
    store.check(0, 0)
    await store.flush()
    await tick()
    expect(store.notice.text).toBe('1 set nggak kesimpen. Coba centang lagi.')
    expect(store.live.items[0].rows[0]).toMatchObject({ done: false, weight: 22.5, reps: 10 })
    expect(store.pending).toBe(0)
  })

  it('cuma edit yang ditolak (sesi udah selesai di device lain) → muat ulang, draf basi dibuang', async () => {
    okServer()
    await started()
    store.check(0, 0)
    await store.flush()
    api.patch.mockRejectedValue(new ApiError('Sesi ini udah selesai. Ubah lewat Riwayat.', 409))
    store.edit(0, 0, { weight: 25, reps: 8 })
    await store.flush()
    await tick()
    expect(api.get).toHaveBeenCalledTimes(2)
    expect(store.live).toBeNull()
  })
})

describe('gym store: load + draf HP', () => {
  it('load isi data + loaded', async () => {
    await store.load()
    expect(store.loaded).toBe(true)
    expect(store.data.totalSessions).toBe(3)
    expect(store.live).toBeNull()
  })

  it('ada sesi jalan & draf HP sesi itu → digabung (angka belum ✓ tetep)', async () => {
    okServer()
    await started()
    store.edit(0, 1, { weight: 27.5, reps: 6 })
    setActivePinia(createPinia()) // app ditutup-buka
    store = useGymStore()
    api.get.mockResolvedValue(gymData(session({ sets: [{ id: 3, clientId: 'x', exerciseId: 2, weight: 30, reps: 8, doneAt: '2026-11-23T11:10:00.000Z' }] })))
    await store.load()
    expect(store.live.serverId).toBe(100)
    expect(store.live.items[0].rows[1]).toMatchObject({ weight: 27.5, reps: 6, done: false })
    expect(store.live.items[1].rows[0]).toMatchObject({ serverId: 3, done: true })
  })

  it('sesi jalan tanpa draf di HP ini → draf dibikin dari server', async () => {
    api.get.mockResolvedValue(gymData(session({ clientId: 'ipad' })))
    await store.load()
    expect(store.live).toMatchObject({ serverId: 100, clientId: 'ipad', queue: [] })
    expect(store.pending).toBe(0)
  })

  it('draf lama tanpa antrian & nggak ada sesi jalan → dibuang', async () => {
    okServer()
    await started()
    setActivePinia(createPinia())
    store = useGymStore()
    await store.load()
    expect(store.live).toBeNull()
    expect(storage.map.has(LIVE_KEY)).toBe(false)
  })

  it('draf lama tanpa antrian, server punya sesi lain → ganti ke sesi server', async () => {
    okServer()
    await started()
    setActivePinia(createPinia())
    store = useGymStore()
    api.get.mockResolvedValue(gymData(session({ id: 200, clientId: 'ipad' })))
    await store.load()
    expect(store.live).toMatchObject({ serverId: 200, clientId: 'ipad' })
  })

  it('draf mulai offline (antrian masih ada) & server belum tau → dipertahanin + dikirim', async () => {
    api.post.mockRejectedValue(net())
    await started()
    store.check(0, 0)
    setActivePinia(createPinia())
    store = useGymStore()
    okServer()
    const sent = { id: 500, clientId: 'k2', exerciseId: 1, weight: 22.5, reps: 10, doneAt: loadDraft(storage).items[0].rows[0].doneAt }
    api.get.mockResolvedValue(gymData(session({ sets: [sent] })))
    await store.load()
    await tick()
    expect(store.live.serverId).toBe(100)
    expect(store.live.items[0].rows[0]).toMatchObject({ serverId: 500, done: true })
    expect(store.pending).toBe(0)
    expect(api.post).toHaveBeenCalledWith('/gym/sessions/100/sets', expect.objectContaining({ clientId: 'k2' }))
  })

  it('load gagal (offline) → draf tetep kebuka dari HP, error dilempar', async () => {
    api.post.mockRejectedValue(net())
    await started()
    setActivePinia(createPinia())
    store = useGymStore()
    api.get.mockRejectedValue(net())
    await expect(store.load()).rejects.toThrow('Nggak bisa nyambung')
    expect(store.live).toMatchObject({ clientId: 'k1' })
  })

  it('restore() buka draf dari HP tanpa jaringan', () => {
    storage.setItem(LIVE_KEY, JSON.stringify({ clientId: 'z', serverId: 5, items: [], queue: [{ op: 'del', key: 'a', serverId: 1 }] }))
    expect(store.restore()).toMatchObject({ clientId: 'z' })
    expect(store.pending).toBe(1)
  })
})

describe('gym store: daftar gerakan kesimpen di HP (nama & rekor pas offline)', () => {
  it('disambung ke sesi device lain pas app dibuka tanpa GET /gym → patokan gerakan dari simpenan HP', async () => {
    storage.setItem(EXERCISES_KEY, JSON.stringify(EXERCISES))
    api.get.mockRejectedValue(net())
    store.restore()
    store.start('push')
    const other = session({ id: 7, clientId: 'ipad', program: 'pull', planned: [2] })
    api.post.mockImplementation(async (url) => {
      if (url === '/gym/sessions') throw new ApiError('Masih ada sesi Pull yang jalan.', 409, { active: other })
      throw net()
    })
    await store.flush()
    expect(store.live).toMatchObject({ serverId: 7, joined: true })
    expect(store.live.items[0].rows[0]).toMatchObject({ weight: 30, reps: 8, done: false })
  })

  it('load → daftar gerakan disimpen; app dibuka lagi tanpa sinyal → masih kebaca', async () => {
    expect(store.exercises).toEqual([])
    await store.load()
    expect(store.exercises).toEqual(EXERCISES)
    setActivePinia(createPinia())
    store = useGymStore()
    api.get.mockRejectedValue(net())
    store.restore()
    expect(store.exercises).toEqual(EXERCISES)
    await expect(store.load()).rejects.toThrow()
    expect(store.exercises).toEqual(EXERCISES)
  })
  it('isi simpenan rusak → kosong, nggak error', () => {
    storage.setItem(EXERCISES_KEY, '{rusak')
    store.restore()
    expect(store.exercises).toEqual([])
  })
})

describe('gym store: selesai & buang', () => {
  it('finish: kirim antrian dulu → POST finish → balikin Report, draf dibersihin, muat ulang', async () => {
    okServer()
    await started()
    store.check(0, 0)
    const report = await store.finish('2026-11-23T12:17:00.000Z')
    expect(api.post).toHaveBeenLastCalledWith('/gym/sessions/100/finish', { endedAt: '2026-11-23T12:17:00.000Z' })
    expect(report.summary.sets).toBe(1)
    expect(store.live).toBeNull()
    expect(store.pending).toBe(0)
    expect(storage.map.has(LIVE_KEY)).toBe(false)
    await tick()
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('finish tanpa jam → body kosong', async () => {
    okServer()
    await started()
    store.check(0, 0)
    await store.finish()
    expect(api.post).toHaveBeenLastCalledWith('/gym/sessions/100/finish', {})
  })

  it('finish pas antrian nggak bisa kekirim → OfflineError, draf aman', async () => {
    okServer()
    await started()
    api.post.mockRejectedValue(net())
    store.check(0, 0)
    const err = await store.finish().catch((e) => e)
    expect(err).toBeInstanceOf(OfflineError)
    expect(err.message).toBe(OFFLINE_TEXT)
    expect(store.live.items[0].rows[0].done).toBe(true)
    expect(loadDraft(storage).queue.map((o) => o.op)).toEqual(['add'])
    expect(api.post).not.toHaveBeenCalledWith('/gym/sessions/100/finish', expect.anything())
  })

  it('POST finish putus / 5xx → OfflineError', async () => {
    okServer()
    await started()
    store.check(0, 0)
    await store.flush()
    for (const e of [net(), new ApiError('x', 502)]) {
      api.post.mockRejectedValueOnce(e)
      await expect(store.finish()).rejects.toBeInstanceOf(OfflineError)
      expect(store.live).not.toBeNull()
    }
  })

  it('finish 0 set → 422 dilempar apa adanya (UI nawarin buang), draf tetep', async () => {
    okServer()
    await started()
    api.post.mockRejectedValue(new ApiError('Belum ada set yang dicentang.', 422))
    const err = await store.finish().catch((e) => e)
    expect(err.status).toBe(422)
    expect(err.message).toBe('Belum ada set yang dicentang.')
    expect(store.live).not.toBeNull()
  })

  it('discard: DELETE sesi server (cuma kalau masih jalan), draf dibersihin; 404 dianggep udah kebuang', async () => {
    okServer()
    await started()
    await store.discard()
    expect(api.del).toHaveBeenCalledWith('/gym/sessions/100?running=1')
    expect(store.live).toBeNull()
    expect(storage.map.has(LIVE_KEY)).toBe(false)

    await store.load()
    store.start('push')
    await tick()
    api.del.mockRejectedValue(new ApiError('Sesinya nggak ketemu.', 404))
    await store.discard()
    expect(store.live).toBeNull()
  })

  it('discard 409 (udah diselesaiin di device lain) → draf HP dibuang tanpa hantu, kabar, muat ulang', async () => {
    okServer()
    await started()
    api.del.mockRejectedValue(new ApiError('Sesinya udah diselesaiin.', 409))
    const loads = api.get.mock.calls.length
    await store.discard()
    await tick()
    expect(store.live).toBeNull()
    expect(storage.map.has(LIVE_KEY)).toBe(false)
    expect(loadGhosts(storage)).toEqual([])
    expect(store.notice.text).toBe('Sesinya udah diselesaiin di device lain.')
    expect(api.get.mock.calls.length).toBeGreaterThan(loads)
  })

  it('finish / discard sukses → kartu sesi di Beranda ikut dikosongin', async () => {
    const home = useHomeStore()
    okServer()
    await started()
    store.check(0, 0)
    home.data = { gym: { active: { id: 100, program: 'push', startedAt: 'x', sets: 1 } } }
    await store.finish()
    expect(home.data.gym).toBeNull()

    await store.load()
    store.start('push')
    await tick()
    home.data = { gym: { active: { id: 100, program: 'push', startedAt: 'x', sets: 0 } } }
    await store.discard()
    expect(home.data.gym).toBeNull()
  })

  it('discard pas start belum pernah nyampe server (offline) → cukup dibuang di HP', async () => {
    api.post.mockRejectedValue(net())
    await started()
    await store.discard()
    expect(api.del).not.toHaveBeenCalled()
    expect(store.live).toBeNull()
    expect(storage.map.has(LIVE_KEY)).toBe(false)
  })

  it('discard: start ternyata nyampe (jawaban ilang) → dikirim ulang dapet id, lalu DELETE', async () => {
    api.post.mockRejectedValue(net())
    await started()
    okServer()
    await store.discard()
    expect(api.del).toHaveBeenCalledWith('/gym/sessions/100?running=1')
    expect(store.live).toBeNull()
  })

  it('discard ketemu sesi lain yang jalan (409) → nggak ngehapus sesi orang, disambung aja', async () => {
    api.post.mockRejectedValue(net())
    await started()
    const other = session({ id: 7, clientId: 'ipad', program: 'pull' })
    api.post.mockRejectedValue(new ApiError('Masih ada sesi Pull yang jalan.', 409, { active: other }))
    api.get.mockResolvedValue(gymData(other))
    await store.discard()
    await tick()
    expect(api.del).not.toHaveBeenCalled()
    expect(store.live.serverId).toBe(7)
  })

  it('discard pas DELETE putus → langsung kebuang di HP, dicatet hantu, DELETE nyusul pas online', async () => {
    okServer()
    await started()
    api.del.mockRejectedValue(net())
    await store.discard()
    expect(store.live).toBeNull()
    expect(storage.map.has(LIVE_KEY)).toBe(false)
    expect(loadGhosts(storage)).toEqual([expect.objectContaining({ clientId: 'k1', serverId: 100 })])
    api.del.mockReset()
    api.del.mockResolvedValue(null)
    api.get.mockImplementation(async (url) => (url === '/gym/active' ? { id: 100, program: 'push', sets: 0 } : gymData()))
    await store.flush()
    expect(api.del).toHaveBeenCalledWith('/gym/sessions/100?running=1')
    expect(storage.map.has(GHOST_KEY)).toBe(false)
  })

  it('dibuang offline (start udah dicoba) → app ditutup-buka → hantu dihapus duluan, sesi baru nggak nyambung ke hantu', async () => {
    api.post.mockRejectedValue(net())
    await started()
    await store.discard()
    await tick() // kiriman & muat ulang di belakang punya store lama kelar dulu (offline → hantu tetep)
    expect(store.live).toBeNull()
    expect(loadGhosts(storage)).toEqual([expect.objectContaining({ clientId: 'k1', serverId: null, program: 'push' })])

    // server ternyata nerima start Push tadi (jawabannya ilang)
    const sessions = [session({ id: 100, clientId: 'k1' })]
    api.post.mockImplementation(async (url, body) => {
      if (url !== '/gym/sessions') return { id: 900, ...body }
      const same = sessions.find((x) => x.clientId === body.clientId)
      if (same) return same
      if (sessions.length) throw new ApiError('Masih ada sesi Push yang jalan.', 409, { active: sessions[0] })
      const made = session({ id: 200, clientId: body.clientId, program: body.program })
      sessions.push(made)
      return made
    })
    api.del.mockImplementation(async (url) => {
      sessions.splice(sessions.findIndex((x) => url.endsWith(`/${x.id}`)), 1)
      return null
    })
    setActivePinia(createPinia())
    store = useGymStore()
    api.get.mockImplementation(async (url) => {
      const running = sessions.find((x) => !x.endedAt) ?? null
      if (url === '/gym/active') return running && { id: running.id, program: running.program, sets: 0 }
      return gymData(running)
    })
    await store.load()
    store.start('pull')
    await store.flush()
    expect(api.del).toHaveBeenCalledWith('/gym/sessions/100?running=1')
    expect(store.live).toMatchObject({ serverId: 200, program: 'pull', joined: false })
    expect(storage.map.has(GHOST_KEY)).toBe(false)
  })

  it('hantu belum kehapus (server error) tapi GET nampilin sesinya → nggak diadopsi jadi sesi jalan', async () => {
    api.post.mockRejectedValue(net())
    await started()
    await store.discard()
    api.post.mockRejectedValue(new ApiError('x', 500))
    api.get.mockResolvedValue(gymData(session({ clientId: 'k1' })))
    await store.load()
    expect(store.live).toBeNull()
    expect(store.data.active).toBeNull()
  })
})

describe('gym store: hantu vs latihan yang udah diselesaiin', () => {
  it('dibuang offline → di iPad dilanjut & diselesaiin → HP online: latihannya NGGAK kehapus', async () => {
    okServer()
    await started()
    api.del.mockRejectedValue(net())
    await store.discard()
    await tick()
    expect(loadGhosts(storage)).toHaveLength(1)
    api.del.mockReset()
    api.del.mockResolvedValue(null)
    api.get.mockImplementation(async (url) => (url === '/gym/active' ? null : gymData()))
    await store.flush()
    expect(api.del).not.toHaveBeenCalled()
    expect(storage.map.has(GHOST_KEY)).toBe(false)
  })
})

describe('gym store: lagi Selesai', () => {
  it('pas finish jalan: ✓ / ubah / hapus / tambah set / tambah gerakan ditolak; gagal → bisa lagi', async () => {
    okServer()
    await started()
    store.check(0, 0)
    await store.flush()
    let reject
    api.post.mockImplementationOnce(() => new Promise((_, rj) => (reject = rj)))
    const running = store.finish()
    expect(store.finishing).toBe(true)
    await tick()
    expect(store.check(0, 1)).toBe(false)
    expect(store.edit(0, 0, { weight: 30, reps: 5 })).toBe(false)
    expect(store.remove(0, 0)).toBe(false)
    expect(store.addSet(0)).toBe(-1)
    expect(store.addExercise(ex(9, 'Cable Fly'))).toBe(-1)
    expect(store.live.items[0].rows[1].done).toBe(false)
    expect(store.live.queue).toEqual([])
    reject(net())
    await expect(running).rejects.toBeInstanceOf(OfflineError)
    expect(store.finishing).toBe(false)
    expect(store.check(0, 1)).toBe(true)
  })

  it('pas discard jalan juga ditolak', async () => {
    okServer()
    await started()
    let release
    api.del.mockImplementationOnce(() => new Promise((r) => (release = r)))
    const running = store.discard()
    await tick()
    expect(store.finishing).toBe(true)
    expect(store.check(0, 0)).toBe(false)
    release(null)
    await running
    expect(store.finishing).toBe(false)
  })
})

describe('gym store: gerakan & program', () => {
  it('saveExercise POST / PATCH lalu muat ulang', async () => {
    okServer()
    const made = await store.saveExercise({ name: 'Cable Fly' })
    expect(api.post).toHaveBeenCalledWith('/gym/exercises', { name: 'Cable Fly' })
    expect(made).toMatchObject({ id: 30, name: 'Cable Fly' })
    const edited = await store.saveExercise({ restSec: 300 }, 4)
    expect(api.patch).toHaveBeenCalledWith('/gym/exercises/4', { restSec: 300 })
    expect(edited).toMatchObject({ id: 4, restSec: 300 })
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('kontrak POST /gym/exercises `{ exercise }` → gerakan baru masuk daftar store + cache dengan id & nama', async () => {
    okServer()
    await store.load()
    api.get.mockImplementation(never)
    await store.saveExercise({ name: 'Cable Fly' })
    expect(store.exercises.find((x) => x.id === 30)?.name).toBe('Cable Fly')
    expect(JSON.parse(storage.getItem(EXERCISES_KEY)).find((x) => x.id === 30)?.name).toBe('Cable Fly')
  })

  it('saveExercise 409 → dilempar dengan existing', async () => {
    api.post.mockRejectedValue(new ApiError('Udah ada gerakan dengan nama itu.', 409, { existing: ex(5, 'Cable Fly') }))
    const err = await store.saveExercise({ name: 'cable fly' }).catch((e) => e)
    expect(err.status).toBe(409)
    expect(err.fields.existing.id).toBe(5)
  })

  it('saveProgram PUT lalu muat ulang', async () => {
    await store.saveProgram('lower', [1, 2])
    expect(api.put).toHaveBeenCalledWith('/gym/programs/lower', { exerciseIds: [1, 2] })
    expect(api.get).toHaveBeenCalledTimes(1)
  })

  it('kontrak PUT /gym/programs/:key `{ program }` → isi program langsung ikut jawaban (walau muat ulang gagal)', async () => {
    await store.load()
    api.get.mockRejectedValue(net())
    const res = await store.saveProgram('push', [2])
    expect(res).toEqual({ key: 'push', exerciseIds: [2] })
    expect(store.data.programs.find((p) => p.key === 'push').exerciseIds).toEqual([2])
  })
})
