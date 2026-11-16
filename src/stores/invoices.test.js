import { createPinia, setActivePinia } from 'pinia'
import { setInvoicesApi, useInvoicesStore } from './invoices.js'

const inv = (id, over = {}) => ({ id, number: `INV/DS/2026/11/00${id}`, paidOn: null, ...over })
const listing = (invoices) => ({ today: '2026-11-16', summary: { unpaid: 100, unpaidCount: 1, lateCount: 0, nearestDue: null, received: [], receivedYear: 0 }, invoices })

let api
beforeEach(() => {
  setActivePinia(createPinia())
  api = {
    get: vi.fn(async (url) => {
      if (url === '/invoices') return listing([inv(1), inv(2)])
      if (url === '/invoice-settings') return { settings: { name: 'David' } }
      if (url === '/invoices/suggestions') return { clients: [], items: [] }
      if (url.startsWith('/invoices/next-number')) return { number: 'INV/DS/2026/11/003' }
    }),
    post: vi.fn(async () => ({ invoice: inv(3) })),
    put: vi.fn(async (url) => (url.endsWith('/paid') ? { invoice: inv(2, { paidOn: '2026-11-17' }) } : url === '/invoice-settings' ? { settings: { name: 'Baru' } } : { invoice: inv(1, { subject: 'x' }) })),
    del: vi.fn(async (url) => (url.endsWith('/paid') ? { invoice: inv(2) } : null)),
  }
  setInvoicesApi(api)
})

describe('invoices store', () => {
  it('load isi list, summary, today', async () => {
    const s = useInvoicesStore()
    await s.load()
    expect(s.list).toHaveLength(2)
    expect(s.summary.unpaid).toBe(100)
    expect(s.today).toBe('2026-11-16')
    expect(s.byId('2').number).toBe('INV/DS/2026/11/002')
  })

  it('setPaid ganti item di list', async () => {
    const s = useInvoicesStore()
    await s.load()
    api.get.mockImplementation(async () => listing([inv(1), inv(2, { paidOn: '2026-11-17' })]))
    await s.setPaid(2, '2026-11-17')
    expect(api.put).toHaveBeenCalledWith('/invoices/2/paid', { paidOn: '2026-11-17' })
    expect(s.byId(2).paidOn).toBe('2026-11-17')
    api.get.mockImplementation(async () => listing([inv(1), inv(2)]))
    await s.unsetPaid(2)
    expect(api.del).toHaveBeenCalledWith('/invoices/2/paid')
    expect(s.byId(2).paidOn).toBeNull()
  })

  it('create / update / remove', async () => {
    const s = useInvoicesStore()
    await s.load()
    expect((await s.create({ a: 1 })).id).toBe(3)
    expect(api.post).toHaveBeenCalledWith('/invoices', { a: 1 })
    await s.update(1, { b: 2 })
    expect(api.put).toHaveBeenCalledWith('/invoices/1', { b: 2 })
    api.get.mockImplementation(async () => listing([inv(2)]))
    await s.remove(1)
    expect(api.del).toHaveBeenCalledWith('/invoices/1')
    expect(s.byId(1)).toBeUndefined()
  })

  it('pengaturan, saran, nomor berikutnya', async () => {
    const s = useInvoicesStore()
    await s.loadSettings()
    expect(s.settings.name).toBe('David')
    await s.saveSettings({ name: 'Baru' })
    expect(s.settings.name).toBe('Baru')
    await s.loadSuggestions()
    expect(s.suggestions.items).toEqual([])
    expect(await s.nextNumber('2026-11-16')).toBe('INV/DS/2026/11/003')
    expect(api.get).toHaveBeenCalledWith('/invoices/next-number?date=2026-11-16')
  })
})
