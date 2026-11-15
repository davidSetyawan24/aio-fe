import { createPinia, setActivePinia } from 'pinia'
import { setOverviewApi, useOverviewStore } from './overview.js'

const bill = { kind: 'bill', billId: 2, period: '2026-11', name: 'Motor', amount: 1_250_000, dueOn: '2026-11-12', status: 'late', lateDays: 3, daysLeft: 0 }
const card = { kind: 'card', sourceId: 10, name: 'CC BCA', bank: 'BCA', dueOn: '2026-11-17', daysLeft: 2 }
const data = (month = '2026-11') => ({ month, today: '2026-11-15', isCurrent: month === '2026-11', firstMonth: '2026-09', total: 1_105_500, attention: [bill, card] })

let api
beforeEach(() => {
  setActivePinia(createPinia())
  api = {
    get: vi.fn(async (url) => data(url.split('month=')[1])),
    put: vi.fn(async () => ({})),
    del: vi.fn(async () => null),
  }
  setOverviewApi(api)
})

describe('overview store', () => {
  it('muat bulan ini / bulan tertentu', async () => {
    const store = useOverviewStore()
    await store.load()
    expect(api.get).toHaveBeenCalledWith('/overview')
    expect(store.data.total).toBe(1_105_500)
    expect(store.month).toBe('2026-11')
    await store.load('2026-10')
    expect(api.get).toHaveBeenLastCalledWith('/overview?month=2026-10')
    expect(store.month).toBe('2026-10')
  })

  it('ganti bulan cepet → jawaban terakhir yang menang', async () => {
    let release
    api.get.mockImplementationOnce(() => new Promise((r) => (release = () => r(data('2026-10')))))
    const store = useOverviewStore()
    const slow = store.load('2026-10')
    await store.load('2026-09')
    release()
    await slow
    expect(store.month).toBe('2026-09')
  })

  it('muat ulang ngosongin yang barusan dicentang', async () => {
    const store = useOverviewStore()
    await store.load()
    await store.toggleBill(bill)
    expect(store.isDone(bill)).toBe(true)
    await store.load()
    expect(store.isDone(bill)).toBe(false)
  })

  it('refresh diem kalau gagal', async () => {
    const store = useOverviewStore()
    await store.load('2026-10')
    api.get.mockRejectedValueOnce(new Error('putus'))
    await expect(store.refresh()).resolves.toBeUndefined()
    expect(api.get).toHaveBeenLastCalledWith('/overview?month=2026-10')
  })

  it('Lunas? → langsung hijau, tap dobel cuma 1 permintaan, tap lagi → batal', async () => {
    const store = useOverviewStore()
    await store.load()
    const a = store.toggleBill(bill)
    const b = store.toggleBill(bill)
    expect(store.isDone(bill)).toBe(true)
    expect(await a).toBe(true)
    expect(await b).toBeNull()
    expect(api.put).toHaveBeenCalledTimes(1)
    expect(api.put).toHaveBeenCalledWith('/recurring-bills/2/payments/2026-11', {})
    expect(store.data.attention).toHaveLength(2)

    expect(await store.toggleBill(bill)).toBe(false)
    expect(api.del).toHaveBeenCalledWith('/recurring-bills/2/payments/2026-11')
    expect(store.isDone(bill)).toBe(false)
  })

  it('Lunas? gagal → balik lagi', async () => {
    const store = useOverviewStore()
    await store.load()
    api.put.mockRejectedValueOnce(new Error('putus'))
    await expect(store.toggleBill(bill)).rejects.toThrow('putus')
    expect(store.isDone(bill)).toBe(false)
    expect(store.isPending(bill)).toBe(false)
  })

  it('Udah bayar? CC pakai endpoint Kartu & Rekening', async () => {
    const store = useOverviewStore()
    await store.load()
    expect(await store.toggleCard(card)).toBe(true)
    expect(api.put).toHaveBeenCalledWith('/payment-sources/10/bill-paid/2026-11-17', {})
    expect(store.isDone(card)).toBe(true)
    expect(await store.toggleCard(card)).toBe(false)
    expect(api.del).toHaveBeenCalledWith('/payment-sources/10/bill-paid/2026-11-17')
    api.put.mockRejectedValueOnce(new Error('putus'))
    await expect(store.toggleCard(card)).rejects.toThrow('putus')
    expect(store.isDone(card)).toBe(false)
  })
})
