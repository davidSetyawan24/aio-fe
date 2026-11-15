import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { addDays } from '@/lib/agenda.js'
import { setAgendaApi } from '@/stores/agenda.js'
import AgendaPage from './AgendaPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
const sheet = vi.hoisted(() => ({ present: vi.fn(), onDidDismiss: vi.fn() }))
const sheetCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  onIonViewWillEnter: (fn) => fn(),
  actionSheetController: { create: sheetCreate },
}))

const TODAY = '2026-11-15' // Minggu
const NONE = { freq: 'none', days: [], until: null }
const ev = (over) => ({ id: 1, title: 'Acara', allDay: false, startDate: TODAY, endDate: TODAY, startTime: '10:00', endTime: '12:00', location: null, note: null, reminders: [], repeat: NONE, occurrence: TODAY, dayIndex: 1, dayCount: 1, ...over })
const td = (over) => ({ id: 1, title: 'To-do', dueOn: TODAY, note: null, reminders: [], repeat: NONE, occurrence: TODAY, done: false, late: 0, ...over })
const content = {
  [TODAY]: {
    events: [
      ev({ id: 3, title: 'Brunch keluarga', location: 'Social House, Grand Indonesia', reminders: [{ type: 'before', minutes: 30 }] }),
      ev({ id: 4, title: 'Nonton sama Dia', startTime: '19:00', endTime: '21:30' }),
    ],
    todos: [
      td({ id: 10, title: 'Buang sampah', dueOn: '2026-10-20', repeat: { freq: 'weekly', days: [2], until: null }, occurrence: '2026-11-10', late: 5 }),
      td({ id: 1, title: 'Bayar iuran RT', dueOn: '2026-11-12', occurrence: '2026-11-12', late: 3 }),
      td({ id: 2, title: 'Bayar listrik', reminders: [{ type: 'day', offset: 0, time: '08:00' }] }),
      td({ id: 3, title: 'Beli galon' }),
      td({ id: 4, title: 'Balas email Pak Budi', done: true }),
    ],
  },
  '2026-11-16': { events: [], todos: [td({ id: 5, title: 'Siapin slide meeting', dueOn: '2026-11-16', occurrence: '2026-11-16' })] },
  '2026-11-21': {
    events: [ev({ id: 5, title: 'Futsal', startDate: '2026-10-31', endDate: '2026-10-31', startTime: '08:00', endTime: '10:00', location: 'Futsal Kuningan City', note: 'Bawa sepatu', repeat: { freq: 'weekly', days: [6], until: null }, occurrence: '2026-11-21' })],
    todos: [],
  },
}
const undated = [
  td({ id: 11, title: 'Beli kado buat nyokap', dueOn: null, occurrence: null }),
  td({ id: 12, title: 'Ganti oli motor', dueOn: null, occurrence: null }),
  td({ id: 13, title: 'Cari tukang servis AC', dueOn: null, occurrence: null }),
]

let api
function agendaFor(url) {
  const [, from, to] = url.match(/from=([\d-]+)&to=([\d-]+)/)
  const days = {}
  for (let d = from; d <= to; d = addDays(d, 1)) days[d] = content[d] ?? { events: [], todos: [] }
  return { today: TODAY, days, undated }
}
async function mountPage(path = '/tabs/agenda') {
  api = {
    get: vi.fn(async (url) => agendaFor(url)),
    put: vi.fn(async () => ({ todo: { id: 11 } })),
    patch: vi.fn(() => new Promise((resolve) => setTimeout(() => resolve({ todo: { id: 2 } }), 5))),
    del: vi.fn(async () => null),
  }
  setAgendaApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/agenda', component: AgendaPage }] })
  router.push(path)
  await router.isReady()
  const w = mount(AgendaPage, { global: { plugins: [pinia, router], stubs: { teleport: true } } })
  await flushPromises()
  return w
}
const todoRow = (w, title) => w.findAll('[data-test="todo"]').find((r) => r.text().includes(title))

beforeEach(() => {
  ionRouter.push.mockClear()
  sheet.onDidDismiss.mockReset().mockResolvedValue({ data: 'one' })
  sheetCreate.mockReset().mockResolvedValue(sheet)
})

describe('AgendaPage', () => {
  it("shows today's events and to-dos, late ones first with a red chip", async () => {
    const w = await mountPage()
    expect(w.find('h1').text()).toBe('Minggu, 15 NovHari ini · 2 acara · 5 to-do')
    expect(w.findAll('[data-test="event"]').map((e) => e.text())).toEqual([expect.stringContaining('Brunch keluarga'), expect.stringContaining('Nonton sama Dia')])
    expect(w.findAll('[data-test="todo"]')).toHaveLength(5)
    expect(todoRow(w, 'Buang sampah').text()).toContain('telat 5 hari')
    expect(todoRow(w, 'Buang sampah').text()).toContain('Tiap Sel')
    expect(todoRow(w, 'Bayar listrik').text()).toContain('Hari itu 08:00')
    expect(w.text()).toContain('1/5 beres')
    expect(w.find('[data-test="strip"]').findAll('button')).toHaveLength(7)
  })

  it('links a location to Google Maps', async () => {
    const w = await mountPage()
    expect(w.find('a.loc').attributes('href')).toBe('https://www.google.com/maps/search/?api=1&query=Social%20House%2C%20Grand%20Indonesia')
  })

  it('moves to another day from the strip, and back with "Hari ini"', async () => {
    const w = await mountPage()
    expect(w.find('[data-test="today"]').exists()).toBe(false)
    await w.find('[data-day="2026-11-14"]').trigger('click')
    expect(w.find('h1').text()).toBe('Sabtu, 14 Nov0 acara · 0 to-do')
    expect(w.find('[data-test="drawer"]').exists()).toBe(false)
    await w.find('[data-test="today"]').trigger('click')
    expect(w.find('h1').text()).toContain('Minggu, 15 Nov')
  })

  it('opens Kapan-kapan and schedules one for tomorrow, once even on a double tap', async () => {
    const w = await mountPage()
    expect(w.find('[data-test="drawer"]').text()).toContain('3')
    await w.find('[data-test="drawer"]').trigger('click')
    expect(w.findAll('[data-test="someday"]')).toHaveLength(3)
    await w.find('[data-sched="11"]').trigger('click')
    const tomorrow = w.find('[data-to="2026-11-16"]')
    await tomorrow.trigger('click')
    await tomorrow.trigger('click')
    await flushPromises()
    expect(api.put).toHaveBeenCalledTimes(1)
    expect(api.put).toHaveBeenCalledWith('/agenda/todos/11', { title: 'Beli kado buat nyokap', dueOn: '2026-11-16', note: null, reminders: [], repeat: NONE })
  })

  it('ticks a to-do once even on a double tap', async () => {
    const w = await mountPage()
    const check = todoRow(w, 'Bayar listrik').find('[data-test="check"]')
    await check.trigger('click')
    await check.trigger('click')
    await new Promise((r) => setTimeout(r, 10))
    await flushPromises()
    expect(api.patch).toHaveBeenCalledTimes(1)
    expect(api.patch).toHaveBeenCalledWith('/agenda/todos/2/check', { done: true, occurrence: null })
  })

  it('opens an event, and deletes only this date of a repeating one', async () => {
    const w = await mountPage()
    await w.find('[data-test="next"]').trigger('click')
    await flushPromises()
    await w.find('[data-day="2026-11-21"]').trigger('click')
    await w.find('[data-test="event"]').trigger('click')
    const detail = w.find('[data-test="event-detail"]')
    expect(detail.text()).toContain('Futsal')
    expect(detail.text()).toContain('Tiap Sab')
    expect(detail.text()).toContain('Bawa sepatu')
    expect(detail.find('[data-test="maps"]').attributes('href')).toContain('Futsal%20Kuningan%20City')
    await detail.find('[data-test="delete"]').trigger('click')
    await flushPromises()
    expect(sheetCreate).toHaveBeenCalledWith(expect.objectContaining({ header: 'Hapus acara berulang' }))
    expect(api.del).toHaveBeenCalledWith('/agenda/events/5?scope=one&occurrence=2026-11-21')
  })

  it('asks only once when Hapus is tapped twice', async () => {
    const w = await mountPage()
    // Action sheet masih kebuka (belum dipilih) pas tap kedua.
    sheet.onDidDismiss.mockReturnValue(new Promise(() => {}))
    await w.find('[data-test="event"]').trigger('click')
    const del = w.find('[data-test="event-detail"] [data-test="delete"]')
    await del.trigger('click')
    await del.trigger('click')
    await flushPromises()
    expect(sheetCreate).toHaveBeenCalledTimes(1)
  })

  it('goes to the edit page for an event or a to-do on a phone', async () => {
    const w = await mountPage()
    await todoRow(w, 'Buang sampah').find('[data-test="edit-todo"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/agenda/todo/10/ubah?tanggal=2026-11-10')
    await w.find('[data-test="event"]').trigger('click')
    await w.find('[data-test="event-detail"] [data-test="edit"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/agenda/acara/3/ubah?tanggal=2026-11-15')
  })

  it('adds for the open date', async () => {
    const w = await mountPage()
    await w.find('[data-day="2026-11-14"]').trigger('click')
    await w.find('[data-test="add"]').trigger('click')
    expect(ionRouter.push).toHaveBeenCalledWith('/tabs/agenda/baru?tanggal=2026-11-14')
  })

  it('opens the date from a notification link', async () => {
    const w = await mountPage('/tabs/agenda?tanggal=2026-11-16')
    expect(w.find('h1').text()).toContain('Senin, 16 Nov')
  })

  it('shows the week as day cards and the month as a calendar', async () => {
    const w = await mountPage()
    await w.find('[data-view="week"]').trigger('click')
    await flushPromises()
    expect(w.find('h1').text()).toBe('9 – 15 NovMinggu ini')
    expect(w.findAll('[data-test="wday"]')).toHaveLength(7)
    await w.find('[data-view="month"]').trigger('click')
    await flushPromises()
    expect(w.find('h1').text()).toBe('November2026')
    expect(api.get).toHaveBeenLastCalledWith('/agenda?from=2026-10-26&to=2026-12-06')
    await w.find('[data-day="2026-11-16"]').trigger('click')
    expect(w.text()).toContain('Siapin slide meeting')
  })

  describe('on a wide screen', () => {
    beforeEach(() => {
      window.matchMedia = vi.fn((q) => ({ matches: q.includes('1100') || q.includes('768'), addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    })
    afterEach(() => {
      delete window.matchMedia
    })

    it('keeps a small calendar and the open Kapan-kapan list on the left of the day', async () => {
      const w = await mountPage()
      expect(api.get).toHaveBeenCalledWith('/agenda?from=2026-10-26&to=2026-12-06')
      expect(w.find('[data-test="aside"] [data-test="calendar"]').exists()).toBe(true)
      expect(w.find('[data-test="aside"]').findAll('[data-test="someday"]')).toHaveLength(3)
      expect(w.find('[data-test="drawer"]').exists()).toBe(false)
      expect(w.find('[data-test="add"]').exists()).toBe(false)
      expect(w.find('[data-test="add-top"]').exists()).toBe(true)
    })

    it('adds and edits in a dialog instead of a new page', async () => {
      const w = await mountPage()
      await w.find('[data-test="add-top"]').trigger('click')
      expect(ionRouter.push).not.toHaveBeenCalled()
      expect(w.find('[data-test="form-dialog"] [data-kind="todo"]').exists()).toBe(true)
      await todoRow(w, 'Bayar listrik').find('[data-test="edit-todo"]').trigger('click')
      expect(ionRouter.push).not.toHaveBeenCalled()
      expect(w.find('[data-test="form-dialog"]').text()).toContain('Ubah to-do')
      expect(w.find('[data-test="form-dialog"] [data-test="title"]').element.value).toBe('Bayar listrik')
    })

    it('shows 7 columns for the week and a big month that lists items with "+N lagi"', async () => {
      const w = await mountPage()
      await w.find('[data-view="week"]').trigger('click')
      await flushPromises()
      expect(w.findAll('[data-test="wcol"]')).toHaveLength(7)
      expect(w.find('[data-test="drawer-top"]').text()).toContain('3')
      await w.find('[data-view="month"]').trigger('click')
      await flushPromises()
      const cell = w.find(`[data-cell="${TODAY}"]`)
      expect(cell.text()).toContain('10:00 Brunch keluarga')
      expect(cell.text()).toContain('+3 lagi')
      await cell.trigger('click')
      expect(w.find('h1').text()).toContain('Minggu, 15 Nov')
    })
  })
})
