import { createPinia, setActivePinia } from 'pinia'
import { setExpensesApi } from './expenses.js'
import { setBudgetsApi, useBudgetsStore } from './budgets.js'

const overview = (total) => ({ today: '2026-11-14', month: '2026-11', total, categories: [], history: [], lastMonth: null })

let api
let expensesApi
beforeEach(() => {
  setActivePinia(createPinia())
  api = {
    get: vi.fn(async () => overview(0)),
    put: vi.fn(async () => overview(450000)),
    del: vi.fn(async () => overview(0)),
  }
  expensesApi = { get: vi.fn(async () => ({ today: '2026-11-14' })) }
  setBudgetsApi(api)
  setExpensesApi(expensesApi)
})

describe('budgets store', () => {
  it('loads the overview', async () => {
    const store = useBudgetsStore()
    await store.load()
    expect(api.get).toHaveBeenCalledWith('/budgets')
    expect(store.overview.total).toBe(0)
  })

  it('sets a budget, keeps the fresh overview and refreshes the Duit numbers', async () => {
    const store = useBudgetsStore()
    await store.set(3, 450000)
    expect(api.put).toHaveBeenCalledWith('/budgets/3', { amount: 450000 })
    expect(store.overview.total).toBe(450000)
    expect(expensesApi.get).toHaveBeenCalledWith('/expenses/summary')
  })

  it('releases a budget', async () => {
    const store = useBudgetsStore()
    await store.release(3)
    expect(api.del).toHaveBeenCalledWith('/budgets/3')
    expect(store.overview.total).toBe(0)
  })

  it('still counts the save as done when refreshing the Duit numbers fails', async () => {
    expensesApi.get.mockRejectedValue(new Error('putus'))
    const store = useBudgetsStore()
    await expect(store.set(3, 450000)).resolves.toBeUndefined()
  })
})
