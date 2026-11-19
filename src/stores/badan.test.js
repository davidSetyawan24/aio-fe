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
})
