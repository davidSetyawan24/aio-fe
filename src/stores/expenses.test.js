import { createPinia, setActivePinia } from 'pinia'
import { setExpensesApi, useExpensesStore } from './expenses.js'

const kopi = { id: 1, spentOn: '2026-11-14', amount: 18000, note: 'Kopi Kenangan', category: { id: 2 }, source: { id: 3 } }
const lama = { id: 2, spentOn: '2026-10-30', amount: 50000, note: null, category: { id: 1 }, source: { id: 1 } }
const summary = { today: '2026-11-14', todayTotal: 18000, todayCount: 1, monthTotal: 18000, last7Days: [], lastSourceId: 3 }

function fakeApi() {
  return {
    get: vi.fn(async (url) => {
      if (url === '/expenses/summary') return summary
      if (url === '/expenses/suggestions') return { suggestions: [{ note: 'Kopi Kenangan', categoryId: 2 }] }
      if (url === '/expenses?month=2026-10') return { month: '2026-10', expenses: [lama] }
      return { month: '2026-11', expenses: [kopi] }
    }),
    post: vi.fn(async (url, body) => ({ expense: { id: 9, ...body, spentOn: body.spentOn ?? '2026-11-14' } })),
    patch: vi.fn(async (url, body) => ({ expense: { ...lama, ...body } })),
    del: vi.fn(async () => null),
  }
}

beforeEach(() => setActivePinia(createPinia()))

describe('expenses store', () => {
  it('loads a month, the summary and the suggestions', async () => {
    const api = fakeApi()
    setExpensesApi(api)
    const store = useExpensesStore()
    await Promise.all([store.loadMonth('2026-11'), store.loadMonth('2026-10'), store.loadSummary(), store.loadSuggestions()])
    expect(api.get).toHaveBeenCalledWith('/expenses?month=2026-11')
    expect(store.months['2026-11']).toEqual([kopi])
    expect(store.months['2026-10']).toEqual([lama])
    expect(store.summary).toEqual(summary)
    expect(store.suggestions).toEqual([{ note: 'Kopi Kenangan', categoryId: 2 }])
    expect(store.byId(2)).toEqual(lama)
    expect(store.byId('1')).toEqual(kopi)
  })

  it('after recording, refreshes the summary, suggestions and that month', async () => {
    const api = fakeApi()
    setExpensesApi(api)
    const store = useExpensesStore()
    const body = { spentOn: '2026-10-30', amount: 1000, note: null, categoryId: 1, sourceId: 1 }
    const saved = await store.create(body)
    expect(saved.id).toBe(9)
    expect(api.post).toHaveBeenCalledWith('/expenses', body)
    const urls = api.get.mock.calls.map((c) => c[0])
    expect(urls).toEqual(expect.arrayContaining(['/expenses/summary', '/expenses/suggestions', '/expenses?month=2026-10']))
  })

  it('returns the saved expense even when refreshing the lists fails', async () => {
    const api = fakeApi()
    api.get.mockRejectedValue(new Error('putus'))
    setExpensesApi(api)
    const store = useExpensesStore()
    const saved = await store.create({ amount: 1000, categoryId: 1, sourceId: 1 })
    expect(saved.id).toBe(9)
    await expect(store.remove(9)).resolves.toBeUndefined()
  })

  it('after editing a date into another month, refreshes both months', async () => {
    const api = fakeApi()
    setExpensesApi(api)
    const store = useExpensesStore()
    await store.loadMonth('2026-10')
    api.get.mockClear()
    await store.update(2, { spentOn: '2026-11-01' })
    expect(api.patch).toHaveBeenCalledWith('/expenses/2', { spentOn: '2026-11-01' })
    const urls = api.get.mock.calls.map((c) => c[0])
    expect(urls).toEqual(expect.arrayContaining(['/expenses?month=2026-10', '/expenses?month=2026-11', '/expenses/summary']))
  })

  it('deletes and refreshes that month', async () => {
    const api = fakeApi()
    setExpensesApi(api)
    const store = useExpensesStore()
    await store.loadMonth('2026-10')
    await store.remove(2)
    expect(api.del).toHaveBeenCalledWith('/expenses/2')
    expect(api.get.mock.calls.map((c) => c[0])).toEqual(expect.arrayContaining(['/expenses/summary']))
  })
})
