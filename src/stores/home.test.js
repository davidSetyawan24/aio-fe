import { createPinia, setActivePinia } from 'pinia'
import { todayTodoItem } from '@/lib/home.js'
import { setHomeApi, useHomeStore } from './home.js'

const base = (over = {}) => ({
  today: '2026-11-16',
  attention: [{ kind: 'bill', billId: 3, period: '2026-11', group: 'late' }],
  agenda: { events: [], todos: [{ id: 5, title: 'a' }] },
  money: null, owed: null, ...over,
})
const bill = { kind: 'bill', billId: 3, period: '2026-11' }
const card = { kind: 'card', sourceId: 2, dueOn: '2026-11-14' }

let api
let store
beforeEach(() => {
  setActivePinia(createPinia())
  api = { get: vi.fn(async () => base()), put: vi.fn(async () => ({})), del: vi.fn(async () => null), patch: vi.fn(async () => ({})) }
  setHomeApi(api)
  store = useHomeStore()
})

describe('stores/home', () => {
  it('muat; refresh keep pertahanin Perlu diurus & to-do hari ini kalau harinya sama', async () => {
    await store.load()
    expect(api.get).toHaveBeenCalledWith('/home')
    const oldAttention = store.data.attention
    const oldTodos = store.data.agenda.todos
    api.get.mockResolvedValue(base({ attention: [], agenda: { events: [{ id: 1 }], todos: [] }, money: { total: 1 } }))
    await store.refresh()
    expect(store.data.attention).toEqual(oldAttention)
    expect(store.data.agenda.todos).toEqual(oldTodos)
    expect(store.data.agenda.events).toEqual([{ id: 1 }])
    expect(store.data.money).toEqual({ total: 1 })
  })

  it('keep tapi hari beda → ganti semua, done dibuang', async () => {
    await store.load()
    store.done = { 'bill:3:2026-11': true }
    api.get.mockResolvedValue(base({ today: '2026-11-17', attention: [], agenda: { events: [], todos: [] } }))
    await store.load({ keep: true })
    expect(store.data.attention).toEqual([])
    expect(store.data.agenda.todos).toEqual([])
    expect(store.done).toEqual({})
  })

  it('refresh diem kalau gagal', async () => {
    await store.load()
    api.get.mockRejectedValue(new Error('x'))
    await expect(store.refresh()).resolves.toBeUndefined()
    expect(store.data.today).toBe('2026-11-16')
  })

  it('URL centang tiap jenis', async () => {
    await store.load()
    expect(await store.toggle(bill)).toBe(true)
    expect(api.put).toHaveBeenCalledWith('/recurring-bills/3/payments/2026-11', {})
    expect(await store.toggle(bill)).toBe(false)
    expect(api.del).toHaveBeenCalledWith('/recurring-bills/3/payments/2026-11')
    await store.toggle(card)
    expect(api.put).toHaveBeenCalledWith('/payment-sources/2/bill-paid/2026-11-14', {})
    await store.toggle({ kind: 'todo', todoId: 5, occurrence: '2026-11-14', recurring: false })
    expect(api.patch).toHaveBeenCalledWith('/agenda/todos/5/check', { done: true, occurrence: null })
    await store.toggle({ kind: 'todo', todoId: 6, occurrence: '2026-11-14', recurring: true })
    expect(api.patch).toHaveBeenCalledWith('/agenda/todos/6/check', { done: true, occurrence: '2026-11-14' })
    await store.toggle(todayTodoItem({ id: 7, title: 't', occurrence: '2026-11-16', repeat: { freq: 'none' } }))
    expect(api.patch).toHaveBeenCalledWith('/agenda/todos/7/check', { done: true, occurrence: null })
  })

  it('invoice & budget nggak bisa dicentang: error, nggak ada permintaan, nggak ketandain', async () => {
    await store.load()
    for (const item of [{ kind: 'invoice', invoiceId: 7 }, { kind: 'budget', categoryId: 2 }]) {
      await expect(store.toggle(item)).rejects.toThrow('nggak bisa dicentang')
      expect(store.isDone(item)).toBe(false)
      expect(store.isPending(item)).toBe(false)
    }
    expect(api.put).not.toHaveBeenCalled()
    expect(api.del).not.toHaveBeenCalled()
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('tap dobel cuma 1 permintaan (hasil kedua null)', async () => {
    await store.load()
    const [a, b] = await Promise.all([store.toggle(bill), store.toggle(bill)])
    expect(a).toBe(true)
    expect(b).toBeNull()
    expect(api.put).toHaveBeenCalledTimes(1)
  })

  it('gagal → balik belum dicentang & error dilempar', async () => {
    await store.load()
    api.put.mockRejectedValue(new Error('boom'))
    await expect(store.toggle(bill)).rejects.toThrow('boom')
    expect(store.isDone(bill)).toBe(false)
    expect(store.isPending(bill)).toBe(false)
  })

  it('ensureToday: tanggal beda → muat ulang, sama → nggak', async () => {
    await store.load()
    api.get.mockClear()
    expect(store.ensureToday('2026-11-16')).toBeUndefined()
    expect(api.get).not.toHaveBeenCalled()
    await store.ensureToday('2026-11-17')
    expect(api.get).toHaveBeenCalledTimes(1)
  })
})
