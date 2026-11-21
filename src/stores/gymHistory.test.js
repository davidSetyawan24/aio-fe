import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { setGymApi, setGymStorage, useGymStore } from './gym.js'

const report = (id, over = {}) => ({ session: { id, program: 'push', startedAt: '2026-11-23T11:05:00.000Z', endedAt: '2026-11-23T12:17:00.000Z', sets: [] }, exercises: [], skipped: [], summary: { sets: 3 }, ...over })
const week = (start, ids) => ({ start, count: ids.length, volume: 100 * ids.length, sessions: ids.map((id) => ({ id, program: 'push', startedAt: `${start}T03:00:00.000Z`, endedAt: `${start}T04:00:00.000Z`, sets: 5, volume: 100, prs: 0 })) })

let api, store
const memStorage = () => {
  const m = new Map()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
}
beforeEach(() => {
  setActivePinia(createPinia())
  setGymStorage(memStorage())
  api = {
    get: vi.fn(async (url) => {
      if (url === '/gym') return { programs: [], exercises: [], active: null, recent: [], week: { days: [], count: 0, minutes: 0 }, totalSessions: 0, firstOn: null, mini: null }
      if (url.startsWith('/gym/sessions/')) return report(Number(url.split('/').pop()))
      if (url === '/gym/sessions') return { weeks: [week('2026-11-16', [3, 2])], next: '2026-11-16' }
      if (url === '/gym/sessions?beforeWeek=2026-11-16') return { weeks: [week('2026-11-09', [1])], next: null }
      throw new Error(url)
    }),
    post: vi.fn(), patch: vi.fn(),
    put: vi.fn(async (url) => report(Number(url.split('/').pop()), { summary: { sets: 2 } })),
    del: vi.fn(async () => null),
  }
  setGymApi(api)
  store = useGymStore()
})

describe('gym store: riwayat & detail sesi', () => {
  it('report: ambil dari server sekali, berikutnya dari simpenan; force = ambil lagi', async () => {
    await store.report(7)
    await store.report(7)
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(store.reports[7].session.id).toBe(7)
    await store.report(7, { force: true })
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('report 404 → simpenan dibuang & error dilempar', async () => {
    store.reports[7] = report(7)
    api.get.mockRejectedValue(new ApiError('Sesinya nggak ketemu.', 404))
    await expect(store.report(7, { force: true })).rejects.toMatchObject({ status: 404 })
    expect(store.reports[7]).toBeUndefined()
  })

  it('finish nyimpen Report-nya (halaman Selesai nggak fetch lagi) dan nandain riwayat basi', async () => {
    store.live = { clientId: 'c', serverId: 9, program: 'push', startedAt: 'x', planned: [], open: 0, timer: null, queue: [], items: [], joined: false, lost: 0 }
    api.post.mockResolvedValue(report(9))
    await store.finish()
    expect(store.reports[9].session.id).toBe(9)
    expect(store.hist.stale).toBe(true)
    await store.report(9)
    expect(api.get).not.toHaveBeenCalledWith('/gym/sessions/9')
  })

  it('loadHistory: halaman pertama; moreHistory nyambung pake next sampe habis', async () => {
    await store.loadHistory()
    expect(store.hist.weeks.map((w) => w.start)).toEqual(['2026-11-16'])
    expect(store.hist.next).toBe('2026-11-16')
    expect(store.hist.loaded).toBe(true)
    await store.moreHistory()
    expect(api.get).toHaveBeenLastCalledWith('/gym/sessions?beforeWeek=2026-11-16')
    expect(store.hist.weeks.map((w) => w.start)).toEqual(['2026-11-16', '2026-11-09'])
    expect(store.hist.next).toBeNull()
    await store.moreHistory()
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('minggu yang sama nggak dobel pas disambung', async () => {
    await store.loadHistory()
    api.get.mockResolvedValueOnce({ weeks: [week('2026-11-16', [1]), week('2026-11-09', [0])], next: null })
    await store.moreHistory()
    expect(store.hist.weeks.map((w) => w.start)).toEqual(['2026-11-16', '2026-11-09'])
  })

  it('saveSession: PUT, Report baru masuk simpenan, riwayat basi, /gym dimuat ulang', async () => {
    const body = { startedAt: 'a', endedAt: 'b', sets: [{ id: 1, weight: 20, reps: 8 }], deleteSetIds: [2] }
    const res = await store.saveSession(5, body)
    expect(api.put).toHaveBeenCalledWith('/gym/sessions/5', body)
    expect(res.summary.sets).toBe(2)
    expect(store.reports[5].summary.sets).toBe(2)
    expect(store.hist.stale).toBe(true)
    await Promise.resolve()
    expect(api.get).toHaveBeenCalledWith('/gym')
  })

  it('deleteSession: DELETE, riwayat basi, /gym dimuat ulang', async () => {
    await store.deleteSession(5)
    expect(api.del).toHaveBeenCalledWith('/gym/sessions/5')
    expect(store.hist.stale).toBe(true)
    await Promise.resolve()
    expect(api.get).toHaveBeenCalledWith('/gym')
  })

  it('loadHistory ulang ngeganti isi & nurunin tanda basi', async () => {
    await store.loadHistory()
    store.hist.stale = true
    await store.loadHistory()
    expect(store.hist.stale).toBe(false)
    expect(store.hist.weeks).toHaveLength(1)
  })

  it('saveSession: simpenan Report lain dibuang, cuma yang barusan disimpen tersisa', async () => {
    store.reports[1] = report(1)
    store.reports[2] = report(2)
    await store.saveSession(5, { startedAt: 'a', endedAt: 'b', sets: [], deleteSetIds: [] })
    expect(Object.keys(store.reports)).toEqual(['5'])
  })

  it('deleteSession: semua simpenan Report dibuang (termasuk yang dihapus)', async () => {
    store.reports[5] = report(5)
    store.reports[2] = report(2)
    await store.deleteSession(5)
    expect(store.reports).toEqual({})
  })
})
