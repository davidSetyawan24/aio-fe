import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { setPersonalApi, usePersonalStore } from './personal.js'

const status = (over) => ({ configured: true, hasPin: true, unlocked: false, ...over })
const doc = { id: 1, type: 'ktp', label: null, values: ['3275012407970001'], dates: [] }
const full = { today: '2026-11-18', bio: { fields: { name: 'David' }, extra: [] }, documents: [doc], addresses: [{ id: 5, name: 'Rumah' }] }

let calls
let api
function setup(handlers = {}) {
  calls = []
  const make = (method) => vi.fn(async (url, body) => {
    calls.push(`${method} ${url}`)
    const h = handlers[`${method} ${url}`]
    if (h instanceof Error) throw h
    return typeof h === 'function' ? h(body) : h ?? {}
  })
  api = { get: make('GET'), post: make('POST'), put: make('PUT'), del: make('DELETE'), patch: make('PATCH') }
  setPersonalApi(api)
  setActivePinia(createPinia())
  return usePersonalStore()
}

describe('personal store', () => {
  it('locks first on boot, then reads the status, once', async () => {
    // Bentuk respons BE asli: GET /personal/status → data { status: {...} }
    const s = setup({ 'POST /personal/lock': { status: status() }, 'GET /personal/status': { status: status() } })
    await s.boot()
    await s.boot()
    expect(calls).toEqual(['POST /personal/lock', 'GET /personal/status'])
    expect(s.status).toEqual({ configured: true, hasPin: true, unlocked: false })
    expect(s.unlocked).toBe(false)
    expect(s.booted).toBe(true)
  })

  it('still reads the status when the first lock fails', async () => {
    const s = setup({ 'POST /personal/lock': new ApiError('x', 0), 'GET /personal/status': { status: status() } })
    await s.boot()
    expect(s.status.configured).toBe(true)
    expect(s.status.hasPin).toBe(true)
  })

  it('reads an unlocked status the way the server sends it', async () => {
    const s = setup({ 'GET /personal/status': { status: status({ unlocked: true }) } })
    await s.loadStatus()
    expect(s.status).toEqual({ configured: true, hasPin: true, unlocked: true })
    expect(s.unlocked).toBe(true)
  })

  it('unlocks and carries the remaining tries on a wrong pin', async () => {
    const s = setup({ 'POST /personal/unlock': (b) => (b.pin === '123456' ? { status: status({ unlocked: true }) } : Promise.reject(new ApiError('PIN salah.', 422, { left: 4 }))) })
    await expect(s.unlock('000000')).rejects.toMatchObject({ status: 422, fields: { left: 4 } })
    await s.unlock('123456')
    expect(s.unlocked).toBe(true)
  })

  it('sets and resets the pin', async () => {
    const s = setup({ 'PUT /personal/pin': { status: status({ hasPin: true, unlocked: true }) }, 'POST /personal/pin/reset': { status: status({ unlocked: true }) } })
    await s.setPin('123456')
    expect(api.put).toHaveBeenCalledWith('/personal/pin', { pin: '123456' })
    await s.resetPin('rahasia', '654321')
    expect(api.post).toHaveBeenCalledWith('/personal/pin/reset', { password: 'rahasia', pin: '654321' })
    expect(s.unlocked).toBe(true)
  })

  it('loads everything once unlocked', async () => {
    const s = setup({ 'GET /personal': full })
    await s.load()
    expect(s.documents).toHaveLength(1)
    expect(s.bio.fields.name).toBe('David')
    expect(s.today).toBe('2026-11-18')
  })

  it('forgets everything and locks on 423 (load and save)', async () => {
    const s = setup({ 'GET /personal': full, 'PUT /personal/bio': new ApiError('Data Pribadi kekunci.', 423) })
    s.status = status({ unlocked: true })
    await s.load()
    await expect(s.saveBio({ fields: {}, extra: [] })).rejects.toMatchObject({ status: 423 })
    expect(s.documents).toEqual([])
    expect(s.bio).toBeNull()
    expect(s.addresses).toEqual([])
    expect(s.unlocked).toBe(false)

    const s2 = setup({ 'GET /personal': new ApiError('Data Pribadi kekunci.', 423) })
    s2.status = status({ unlocked: true })
    await expect(s2.load()).rejects.toMatchObject({ status: 423 })
    expect(s2.unlocked).toBe(false)
  })

  it('does not forget on other errors', async () => {
    const s = setup({ 'PUT /personal/bio': new ApiError('Ada yang error.', 500) })
    s.status = status({ unlocked: true })
    s.bio = { fields: {}, extra: [] }
    await expect(s.saveBio({})).rejects.toMatchObject({ status: 500 })
    expect(s.unlocked).toBe(true)
    expect(s.bio).not.toBeNull()
  })

  it('empties the content first, even when the lock call fails', async () => {
    const s = setup({ 'GET /personal': full, 'POST /personal/lock': new ApiError('x', 0) })
    s.status = status({ unlocked: true })
    await s.load()
    const pending = s.lock()
    expect(s.documents).toEqual([])
    expect(s.unlocked).toBe(false)
    await expect(pending).resolves.toBeUndefined()
  })

  it('keeps documents and addresses in step with the server', async () => {
    const s = setup({
      'POST /personal/documents': { document: { ...doc, id: 2 } },
      'PUT /personal/documents/2': { document: { ...doc, id: 2, label: 'baru' } },
      'PUT /personal/documents/2/dates/expiry': { document: { ...doc, id: 2, label: 'diperpanjang' } },
      'POST /personal/documents/2/tax-paid': { document: { ...doc, id: 2, label: 'pajak' } },
      'DELETE /personal/documents/2': null,
      'POST /personal/addresses': { address: { id: 9, name: 'A' } },
      'PUT /personal/addresses/9': { address: { id: 9, name: 'B' } },
      'DELETE /personal/addresses/9': null,
    })
    await s.createDoc({ type: 'ktp' })
    expect(s.documents.map((d) => d.id)).toEqual([2])
    await s.updateDoc(2, {})
    expect(s.documents[0].label).toBe('baru')
    await s.renewDate(2, 'expiry', '2032-01-01')
    expect(api.put).toHaveBeenCalledWith('/personal/documents/2/dates/expiry', { on: '2032-01-01' })
    expect(s.documents[0].label).toBe('diperpanjang')
    await s.taxPaid(2)
    expect(s.documents[0].label).toBe('pajak')
    await s.removeDoc(2)
    expect(s.documents).toEqual([])
    await s.createAddress({})
    await s.updateAddress(9, {})
    expect(s.addresses[0].name).toBe('B')
    await s.removeAddress(9)
    expect(s.addresses).toEqual([])
  })
})
