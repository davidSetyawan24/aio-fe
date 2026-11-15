import { createPinia, setActivePinia } from 'pinia'
import { setBayarRutinApi, useBayarRutinStore } from './bayarRutin.js'

const row = { billId: 1, name: 'Netflix', period: '2026-11', dueOn: '2026-11-15', status: 'open', amount: 186000 }
const lateRow = { billId: 2, name: 'Motor', period: '2026-11', dueOn: '2026-11-12', status: 'late', lateDays: 3, amount: 1250000 }
const list = (month = '2026-11') => ({
  month,
  today: '2026-11-15',
  firstMonth: '2026-10',
  summary: { total: 1436000, paid: 0, left: 1436000, count: 2, paidCount: 0, lateCount: 1 },
  rows: [lateRow, row],
  bySource: [],
  bills: [{ id: 1, name: 'Netflix' }, { id: 2, name: 'Motor' }],
})

let api
beforeEach(() => {
  setActivePinia(createPinia())
  api = {
    get: vi.fn(async (url) => list(url.split('month=')[1])),
    post: vi.fn(async () => ({ bill: { id: 3, name: 'Domain' } })),
    patch: vi.fn(async () => ({ bill: { id: 1, name: 'Netflix HD' } })),
    put: vi.fn(async () => ({ row: { ...row, status: 'paid' } })),
    del: vi.fn(async () => null),
  }
  setBayarRutinApi(api)
})

describe('bayarRutin store', () => {
  it('loads a month', async () => {
    const store = useBayarRutinStore()
    await store.load()
    expect(api.get).toHaveBeenCalledWith('/recurring-bills')
    expect(store.month).toBe('2026-11')
    expect(store.rows).toHaveLength(2)
    await store.load('2026-12')
    expect(api.get).toHaveBeenLastCalledWith('/recurring-bills?month=2026-12')
    expect(store.billById(2).name).toBe('Motor')
  })

  it('keeps only the newest answer when months are switched quickly', async () => {
    let release
    api.get.mockImplementationOnce(() => new Promise((r) => (release = () => r(list('2026-10')))))
    const store = useBayarRutinStore()
    const slow = store.load('2026-10')
    await store.load('2026-12')
    release()
    await slow
    expect(store.month).toBe('2026-12')
  })

  it('marks paid right away and calls the server once even on a double tap', async () => {
    const store = useBayarRutinStore()
    await store.load()
    const a = store.togglePaid(row)
    const b = store.togglePaid(row)
    expect(store.rows.find((r) => r.billId === 1).status).toBe('paid')
    await Promise.all([a, b])
    expect(api.put).toHaveBeenCalledTimes(1)
    expect(api.put).toHaveBeenCalledWith('/recurring-bills/1/payments/2026-11', {})
  })

  it('unmarks a paid row back to late when its due date passed', async () => {
    const store = useBayarRutinStore()
    await store.load()
    store.rows = [{ ...lateRow, status: 'paid' }]
    api.get.mockImplementation(() => new Promise(() => {}))
    await store.togglePaid(store.rows[0])
    expect(api.del).toHaveBeenCalledWith('/recurring-bills/2/payments/2026-11')
    expect(store.rows[0].status).toBe('late')
  })

  it('puts the row back when the server fails', async () => {
    api.put.mockRejectedValueOnce(new Error('Koneksi putus'))
    const store = useBayarRutinStore()
    await store.load()
    await expect(store.togglePaid(row)).rejects.toThrow('Koneksi putus')
    expect(store.rows.find((r) => r.billId === 1).status).toBe('open')
  })

  it('creates, updates and removes', async () => {
    const store = useBayarRutinStore()
    await store.load()
    expect(await store.create({ name: 'Domain' })).toEqual({ id: 3, name: 'Domain' })
    expect(api.post).toHaveBeenCalledWith('/recurring-bills', { name: 'Domain' })
    expect(await store.update(1, { name: 'Netflix HD' })).toEqual({ id: 1, name: 'Netflix HD' })
    expect(api.patch).toHaveBeenCalledWith('/recurring-bills/1', { name: 'Netflix HD' })
    api.get.mockImplementation(() => new Promise(() => {}))
    await store.remove(1)
    expect(api.del).toHaveBeenCalledWith('/recurring-bills/1')
    expect(store.bills.map((b) => b.id)).toEqual([2])
    expect(store.rows.map((r) => r.billId)).toEqual([2])
  })
})
