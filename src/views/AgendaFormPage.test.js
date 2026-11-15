import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { setAgendaApi, useAgendaStore } from '@/stores/agenda.js'
import AgendaFormPage from './AgendaFormPage.vue'

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), useIonRouter: () => ionRouter, onIonViewDidEnter: () => {} }))

const futsal = { id: 5, title: 'Futsal', allDay: false, startDate: '2026-10-31', endDate: '2026-10-31', startTime: '08:00', endTime: '10:00', location: 'Futsal Kuningan City', note: null, reminders: [], repeat: { freq: 'weekly', days: [6], until: null } }
let api
async function mountPage(path, seed) {
  api = { get: vi.fn(async () => ({ event: futsal })), post: vi.fn(async () => ({ todo: { id: 1 } })), put: vi.fn(async () => ({ todo: { id: 10 } })), del: vi.fn() }
  setAgendaApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useAgendaStore()
  store.today = '2026-11-15'
  seed?.(store)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/tabs/agenda/baru', component: AgendaFormPage },
      { path: '/tabs/agenda/acara/:id/ubah', component: AgendaFormPage },
      { path: '/tabs/agenda/todo/:id/ubah', component: AgendaFormPage },
    ],
  })
  router.push(path)
  await router.isReady()
  const w = mount(AgendaFormPage, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return w
}

beforeEach(() => ionRouter.back.mockClear())

describe('AgendaFormPage', () => {
  it('adds an event or a to-do for the date it was opened with, then goes back', async () => {
    const w = await mountPage('/tabs/agenda/baru?tanggal=2026-11-18&jenis=acara')
    expect(w.find('[data-kind="event"]').classes()).toContain('on')
    expect(w.find('[data-test="start-date"]').element.value).toBe('2026-11-18')
    await w.find('[data-kind="todo"]').trigger('click')
    await w.find('[data-test="title"]').setValue('Ambil laundry')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/agenda/todos', expect.objectContaining({ title: 'Ambil laundry', dueOn: '2026-11-18' }))
    expect(ionRouter.back).toHaveBeenCalled()
  })

  it('edits a to-do from the open Agenda, from the tapped date', async () => {
    const row = { id: 10, title: 'Buang sampah', dueOn: '2026-10-20', note: null, reminders: [], repeat: { freq: 'weekly', days: [2], until: null }, occurrence: '2026-11-10', done: false, late: 5 }
    const w = await mountPage('/tabs/agenda/todo/10/ubah?tanggal=2026-11-10', (s) => (s.days = { '2026-11-15': { events: [], todos: [row] } }))
    expect(w.text()).toContain('Ubah to-do')
    expect(w.find('[data-kind="todo"]').exists()).toBe(false)
    expect(w.find('[data-test="title"]').element.value).toBe('Buang sampah')
  })

  it('loads an event to edit and starts it on the tapped date', async () => {
    const w = await mountPage('/tabs/agenda/acara/5/ubah?tanggal=2026-11-21')
    expect(api.get).toHaveBeenCalledWith('/agenda/events/5')
    expect(w.text()).toContain('Ubah acara')
    expect(w.find('[data-test="title"]').element.value).toBe('Futsal')
    expect(w.find('[data-test="start-date"]').element.value).toBe('2026-11-21')
  })

  it('says so when the to-do is gone', async () => {
    const w = await mountPage('/tabs/agenda/todo/99/ubah')
    expect(w.text()).toContain('To-do nggak ketemu. Mungkin udah dihapus.')
  })
})
