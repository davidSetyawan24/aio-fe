import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { setBadanApi, useBadanStore } from './badan.js'

const w = (id, weighedOn, weighedAt = '06:40', over = {}) => ({ id, weighedOn, weighedAt, weight: 75, fat: 25, muscle: 55, ...over })
let api, store

beforeEach(() => {
  setActivePinia(createPinia())
  api = {
    get: vi.fn(async () => ({ weighings: [w(2, '2026-11-19'), w(1, '2026-11-18')], target: null })),
    post: vi.fn(async () => w(3, '2026-11-19')),
    patch: vi.fn(async () => w(1, '2026-11-18')),
    put: vi.fn(async () => ({})),
    del: vi.fn(async () => null),
  }
  setBadanApi(api)
  store = useBadanStore()
})

describe('badan store', () => {
  it('load: isi timbangan + target, last = yang terbaru', async () => {
    expect(store.loaded).toBe(false)
    await store.load()
    expect(store.loaded).toBe(true)
    expect(store.rows).toHaveLength(2)
    expect(store.last.id).toBe(2)
    expect(store.summary.lastOn).toBe('2026-11-19')
  })

  it('profile: default semua null, load baca data.profile', async () => {
    expect(store.profile).toEqual({ height: null, age: null, gender: null })
    api.get.mockResolvedValue({ weighings: [], target: null, profile: { height: 166, age: 31, gender: 'male' } })
    await store.load()
    expect(store.profile).toEqual({ height: 166, age: 31, gender: 'male' })
    api.get.mockResolvedValue({ weighings: [], target: null })
    await store.load()
    expect(store.profile).toEqual({ height: null, age: null, gender: null })
  })

  it('last kosong = null, summary null', async () => {
    api.get.mockResolvedValue({ weighings: [], target: null })
    await store.load()
    expect(store.last).toBeNull()
    expect(store.summary).toBeNull()
  })

  it('save: POST lalu muat ulang, balikin timbangannya', async () => {
    const res = await store.save({ weighedOn: '2026-11-19', weight: 75 })
    expect(api.post).toHaveBeenCalledWith('/body/weighings', { weighedOn: '2026-11-19', weight: 75 })
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(res.weighing.id).toBe(3)
  })

  it('save replace kirim replace:true', async () => {
    await store.save({ weight: 75 }, { replace: true })
    expect(api.post).toHaveBeenCalledWith('/body/weighings', { weight: 75, replace: true })
  })

  it('409 sameDay dilempar apa adanya (reason + existing kebawa)', async () => {
    api.post.mockRejectedValue(new ApiError('Udah ada', 409, { reason: 'sameDay', existing: { id: 9 } }))
    const err = await store.save({ weight: 75 }).catch((e) => e)
    expect(err.status).toBe(409)
    expect(err.fields.reason).toBe('sameDay')
    expect(err.fields.existing.id).toBe(9)
    expect(api.get).not.toHaveBeenCalled()
  })

  it('update, remove, target', async () => {
    await store.update(1, { weight: 74 }, { replace: true })
    expect(api.patch).toHaveBeenCalledWith('/body/weighings/1', { weight: 74, replace: true })
    await store.remove(1)
    expect(api.del).toHaveBeenCalledWith('/body/weighings/1')
    await store.saveTarget({ arah: 'cutting' })
    expect(api.put).toHaveBeenCalledWith('/body/target', { arah: 'cutting' })
    await store.deleteTarget()
    expect(api.del).toHaveBeenCalledWith('/body/target')
  })

  it('scan: FormData photo + timeout panjang', async () => {
    api.post.mockResolvedValue({ read: {} })
    await store.scan(new Blob(['x'], { type: 'image/jpeg' }))
    const [url, form, opts] = api.post.mock.calls[0]
    expect(url).toBe('/body/scan')
    expect(form.get('photo')).toBeTruthy()
    expect(opts.timeout).toBe(60000)
  })

  it('load: isi aktivitas + tidur; kosong = null / []', async () => {
    await store.load()
    expect(store.activity).toBeNull()
    expect(store.sleeps).toEqual([])
    expect(store.lastSleep).toBeNull()
    expect(store.sleepSum).toBeNull()
    expect(store.food).toEqual({ state: 'needTarget' })
    expect(store.pace).toBeNull()
    expect(store.paceEtaInfo).toBeNull()
  })

  it('getter tidur, makan, kecepatan dari data David', async () => {
    const days = ['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']
    const weighings = days.map((d, i) => w(i + 1, d, '06:40', { weight: 74.9, fat: 25.6, muscle: null, bmr: 1650 }))
    const activity = { workType: 'stand_walk', workHours: 10, workDays: 7, gymPerWeek: 5, gymMinutes: 75, otherSport: null, notes: null, level: 'active', levelManual: false }
    const target = { arah: 'cutting', pace: 'normal', fat: 20, muscle: 55, weightMin: 65, weightMax: 69, startedOn: '2026-11-14' }
    const s = (id, sleptOn, totalMin) => ({ id, sleptOn, bedAt: '23:30', wakeAt: '06:10', totalMin, deepMin: null, lightMin: null, remMin: null, score: 80, awakeCount: null, avgHr: null, avgHrv: null, source: 'manual' })
    api.get.mockResolvedValue({ weighings, target, activity, sleeps: [s(1, '2026-11-18', 400), s(2, '2026-11-20', 420)] })
    await store.load()
    expect(store.activity.level).toBe('active')
    expect(store.sleepsSorted.map((x) => x.id)).toEqual([2, 1])
    expect(store.lastSleep.id).toBe(2)
    expect(store.sleepSum).toMatchObject({ lastOn: '2026-11-20', totalMin: 420, avg7Min: 410, nights: 2 })
    expect(store.food).toMatchObject({ state: 'ok', kcal: 2050 })
    expect(store.pace).toMatchObject({ actual: null, state: null })
    expect(store.pace.lo).toBeCloseTo(0.3745, 4)
    expect(store.paceEtaInfo).toEqual({ goal: 69, now: null, plan: '2027-02' })
  })

  it('load: gymAuto dari server (default null) & makan pakai pengali dari server', async () => {
    const weighings = ['2026-11-14', '2026-11-15'].map((d, i) => w(i + 1, d, '06:40', { weight: 74.9, fat: 25.6, muscle: null, bmr: 1650 }))
    const target = { arah: 'recomp', pace: null, fat: null, muscle: null, weightMin: null, weightMax: null, startedOn: '2026-11-14' }
    const activity = { workType: 'sit', workHours: 8, workDays: 5, gymPerWeek: 5, gymMinutes: 70, otherSport: null, notes: null, level: 'active', levelManual: false }
    api.get.mockResolvedValue({ weighings, target, activity, sleeps: [] })
    await store.load()
    expect(store.gymAuto).toBeNull()
    api.get.mockResolvedValue({ weighings, target, activity, gymAuto: { perWeek: 5, minutes: 70 }, sleeps: [] })
    await store.load()
    expect(store.gymAuto).toEqual({ perWeek: 5, minutes: 70 })
    expect(store.food).toMatchObject({ state: 'ok', level: 'active', mult: 1.55 })
  })

  it('saveActivity: PUT tanpa muat ulang', async () => {
    await store.saveActivity({ workType: 'sit' })
    expect(api.put).toHaveBeenCalledWith('/body/activity', { workType: 'sit' })
    expect(api.get).not.toHaveBeenCalled()
  })

  it('tidur: simpen / ubah (replace) / hapus lalu muat ulang', async () => {
    api.post.mockResolvedValue({ sleep: { id: 5 } })
    const res = await store.saveSleep({ sleptOn: '2026-11-20', totalMin: 400 }, { replace: true })
    expect(api.post).toHaveBeenCalledWith('/body/sleeps', { sleptOn: '2026-11-20', totalMin: 400, replace: true })
    expect(res.sleep.id).toBe(5)
    api.patch.mockResolvedValue({ id: 5 })
    const up = await store.updateSleep(5, { totalMin: 410 })
    expect(api.patch).toHaveBeenCalledWith('/body/sleeps/5', { totalMin: 410 })
    expect(up.sleep.id).toBe(5)
    await store.removeSleep(5)
    expect(api.del).toHaveBeenCalledWith('/body/sleeps/5')
    expect(api.get).toHaveBeenCalledTimes(3)
  })

  it('tidur 409 dilempar apa adanya tanpa muat ulang', async () => {
    api.post.mockRejectedValue(new ApiError('Udah ada', 409, { reason: 'sameDay', existing: { id: 9 } }))
    const err = await store.saveSleep({ totalMin: 400 }).catch((e) => e)
    expect(err.status).toBe(409)
    expect(err.fields.existing.id).toBe(9)
    expect(api.get).not.toHaveBeenCalled()
  })

  it('scanSleep: FormData photo tidur.jpg + timeout panjang', async () => {
    api.post.mockResolvedValue({ read: {} })
    await store.scanSleep(new Blob(['x'], { type: 'image/jpeg' }))
    const [url, form, opts] = api.post.mock.calls[0]
    expect(url).toBe('/body/sleeps/scan')
    expect(form.get('photo').name).toBe('tidur.jpg')
    expect(opts.timeout).toBe(60000)
  })
})
