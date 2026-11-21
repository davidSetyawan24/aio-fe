import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { LIVE_KEY } from '@/lib/gymLive.js'
import { FORGOT_KEY, setGymApi, setGymStorage, setGymUid, useGymStore } from './gym.js'

const T0 = '2026-11-23T11:05:00.000Z' // 18.05 WIB
const at = (min) => new Date(Date.parse(T0) + min * 60000)
const iso = (min) => at(min).toISOString()

const ex = (id) => ({ id, name: `G${id}`, restSec: 120, step: 2.5, dumbbell: false, last: null, record: null })
const gymData = (active = null) => ({ programs: [{ key: 'push', exerciseIds: [1], lastOn: null }], exercises: [ex(1)], active, recent: [], week: { days: [], count: 0, minutes: 0 }, totalSessions: 0, firstOn: null, mini: null })
const net = () => new ApiError('Nggak bisa nyambung ke server.', 0)

function memStorage() {
  const map = new Map()
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k), map }
}

const row = (key, doneAt, serverId = null) => ({ key, weight: 20, reps: 10, done: !!doneAt, doneAt, serverId, prev: null })
/** Draf HP: sesi sudah ada di server (id 100), baris dengan serverId = udah kekirim, tanpa = ngantri. */
const draft = (rows, queue = []) => ({ clientId: 'c1', serverId: 100, program: 'push', startedAt: T0, planned: [1], open: 0, timer: null, queue, joined: false, lost: 0, items: [{ exerciseId: 1, extra: false, rows }] })

let api, storage, store
const active = (over = {}) => ({ id: 100, program: 'push', startedAt: T0, lastSetAt: iso(72), sets: 5, ...over })
function server(act) {
  api.get.mockImplementation(async (url) => (url === '/gym/active' ? act : gymData(act && { id: act.id, clientId: 'c1', program: act.program, planned: [1], startedAt: act.startedAt, endedAt: null, sets: [] })))
}

beforeEach(() => {
  setActivePinia(createPinia())
  setGymUid(() => 'u')
  storage = memStorage()
  setGymStorage(storage)
  api = { get: vi.fn(), post: vi.fn(() => new Promise(() => {})), patch: vi.fn(), put: vi.fn(), del: vi.fn() }
  setGymApi(api)
  store = useGymStore()
})

function withDraft(rows, queue) {
  storage.setItem(LIVE_KEY, JSON.stringify(draft(rows, queue)))
}

describe('checkForgot', () => {
  it('server: set terakhir 61 menit lalu → tampil (usulan = set terakhir + 5 menit)', async () => {
    server(active({ sets: 1 }))
    withDraft([row('a', iso(72), 1)])
    await store.checkForgot(at(72 + 61))
    expect(store.forgot).toMatchObject({ program: 'push', startedAt: T0, lastAt: iso(72), sets: 1, suggest: iso(77) })
  })

  it('59 menit → nggak tampil', async () => {
    server(active())
    withDraft([row('a', iso(72), 1)])
    await store.checkForgot(at(72 + 59))
    expect(store.forgot).toBeNull()
  })

  it('tepat 60 menit belum tampil, lewat sedikit baru tampil', async () => {
    server(active())
    withDraft([row('a', iso(72), 1)])
    await store.checkForgot(at(72 + 60))
    expect(store.forgot).toBeNull()
    await store.checkForgot(new Date(at(72 + 60).getTime() + 1000))
    expect(store.forgot).not.toBeNull()
  })

  it('set ngantri 10 menit lalu (server bilang 2 jam) → nggak tampil', async () => {
    server(active({ lastSetAt: iso(0) }))
    withDraft([row('a', iso(0), 1), row('b', iso(110))], [{ op: 'add', key: 'b' }])
    await store.checkForgot(at(120))
    expect(store.forgot).toBeNull()
  })

  it('draf HP basi (cuma 1 set ✓) tapi server punya 5 set → sets 5 (biar nggak ditawarin buang)', async () => {
    server(active({ sets: 5 }))
    withDraft([row('a', iso(72), 1)])
    await store.checkForgot(at(72 + 61))
    expect(store.forgot.sets).toBe(5)
  })

  it('belum ada set sama sekali: dihitung dari jam mulai, sets 0', async () => {
    server(active({ lastSetAt: null, sets: 0 }))
    withDraft([row('a', null)])
    await store.checkForgot(at(61))
    expect(store.forgot).toMatchObject({ sets: 0, lastAt: T0, suggest: iso(5) })
  })

  it('sesi dari device lain (belum ada draf di HP) → draf dibuka dari server lalu dicek', async () => {
    server(active())
    await store.checkForgot(at(72 + 90))
    expect(store.live).not.toBeNull()
    expect(store.forgot).toMatchObject({ program: 'push', lastAt: iso(72) })
  })

  it('nggak ada sesi jalan → nggak tampil; sesi udah selesai di tempat lain (draf bersih) → nggak tampil', async () => {
    server(null)
    await store.checkForgot(at(500))
    expect(store.forgot).toBeNull()
    withDraft([row('a', iso(10), 1)])
    store.restore()
    await store.checkForgot(at(500))
    expect(store.forgot).toBeNull()
  })

  it('offline (GET aktif gagal) → pake draf HP aja', async () => {
    api.get.mockRejectedValue(net())
    withDraft([row('a', iso(10), 1)])
    await store.checkForgot(at(200))
    expect(store.forgot).toMatchObject({ lastAt: iso(10), sets: 1 })
    store.forgot = null
    await store.checkForgot(at(30))
    expect(store.forgot).toBeNull()
  })

  it('usulan nggak lewat dari sekarang', async () => {
    server(active({ lastSetAt: iso(10) }))
    withDraft([row('a', iso(10), 1)])
    await store.checkForgot(at(71))
    expect(store.forgot.suggest).toBe(iso(15))
  })

  it('Lanjut sesi → diem sampe ada set baru ATAU 60 menit lagi; kesimpen biar reload nggak nanya lagi', async () => {
    server(active())
    withDraft([row('a', iso(72), 1)])
    await store.checkForgot(at(150))
    expect(store.forgot).not.toBeNull()
    store.snoozeForgot(at(150))
    expect(store.forgot).toBeNull()
    expect(storage.map.has(FORGOT_KEY)).toBe(true)
    await store.checkForgot(at(151))
    expect(store.forgot).toBeNull()
    // reload: store baru, simpenan sama
    setActivePinia(createPinia())
    store = useGymStore()
    await store.checkForgot(at(200))
    expect(store.forgot).toBeNull()
    // 60 menit lagi
    await store.checkForgot(at(150 + 61))
    expect(store.forgot).not.toBeNull()
  })

  it('Lanjut sesi lalu ada set baru → set itu juga lewat 60 menit → nanya lagi, tapi nggak sebelum itu', async () => {
    server(active())
    withDraft([row('a', iso(72), 1)])
    await store.checkForgot(at(150))
    store.snoozeForgot(at(150))
    store.live.items[0].rows.push(row('b', iso(155)))
    await store.checkForgot(at(155 + 30))
    expect(store.forgot).toBeNull()
    await store.checkForgot(at(155 + 61))
    expect(store.forgot).not.toBeNull()
  })

  it('dialog udah kebuka → dicek lagi nggak ngubah / numpuk', async () => {
    server(active())
    withDraft([row('a', iso(72), 1)])
    await store.checkForgot(at(150))
    const first = store.forgot
    await store.checkForgot(at(151))
    expect(store.forgot).toBe(first)
  })

  it('sesi selesai di tempat lain pas dialog kebuka → dialog ditutup', async () => {
    server(active())
    withDraft([row('a', iso(72), 1)])
    await store.checkForgot(at(150))
    server(null)
    store.live.queue = []
    await store.checkForgot(at(151))
    expect(store.forgot).toBeNull()
  })
})
