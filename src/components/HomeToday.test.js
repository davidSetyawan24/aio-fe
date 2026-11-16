import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { setHomeApi, useHomeStore } from '@/stores/home.js'
import HomeToday from './HomeToday.vue'

const ionRouter = vi.hoisted(() => ({ push: vi.fn() }))
const toastCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  toastController: { create: toastCreate },
}))

const TODAY = '2026-11-16'
const ev = (o) => ({ id: 1, title: 'Meeting', allDay: false, startTime: '10:00', endTime: '11:00', location: null, occurrence: TODAY, dayIndex: 1, dayCount: 1, ...o })
const td = (o) => ({ id: 1, title: 'Bayar listrik', dueOn: TODAY, note: null, occurrence: TODAY, done: false, late: false, repeat: { freq: 'none' }, ...o })
const todos = (n) => Array.from({ length: n }, (_, i) => td({ id: 10 + i, title: `To-do ${i}`, occurrence: TODAY }))

let api
const mounted = []
function mountIt(props, patch = () => Promise.resolve({})) {
  api = { get: vi.fn(), put: vi.fn(), del: vi.fn(), patch: vi.fn(patch) }
  setHomeApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  useHomeStore().refresh = vi.fn()
  const w = mount(HomeToday, { props: { events: [], todos: [], today: TODAY, minutes: 492, ...props }, global: { plugins: [pinia] } })
  mounted.push(w)
  return w
}
beforeEach(() => {
  ionRouter.push.mockClear()
  toastCreate.mockReset().mockResolvedValue({ present: vi.fn() })
})
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

describe('HomeToday', () => {
  it('acara selesai nggak tampil, chip di acara berjam pertama yang belum selesai, ganti pas menit berubah', async () => {
    const events = [ev({ id: 1, title: 'Seharian', allDay: true }), ev({ id: 2, title: 'Pagi', startTime: '07:00', endTime: '08:00' }), ev({ id: 3, title: 'Siang', startTime: '10:00', endTime: '11:00' }), ev({ id: 4, title: 'Sore', startTime: '13:00', endTime: '14:00' })]
    const w = mountIt({ events, minutes: 492 })
    const rows = () => w.findAll('[data-test="today-event"]')
    expect(rows().map((r) => r.find('.h-et').text())).toEqual(['Seharian', 'Siang', 'Sore'])
    expect(w.findAll('[data-test="today-chip"]')).toHaveLength(1)
    expect(rows()[1].find('[data-test="today-chip"]').text()).toBe('1 jam lagi')
    await w.setProps({ minutes: 700 })
    expect(rows().map((r) => r.find('.h-et').text())).toEqual(['Seharian', 'Sore'])
    expect(rows()[1].find('[data-test="today-chip"]').text()).toBe('1 jam lagi')
    expect(rows()[0].find('[data-test="today-chip"]').exists()).toBe(false)
  })

  it('jam "Seharian" & "s.d." pakai huruf lebih kecil biar muat satu baris', () => {
    const w = mountIt({ events: [ev({ id: 1, allDay: true }), ev({ id: 2, startTime: '10:00', endTime: '11:00' }), ev({ id: 3, startTime: '09:00', endTime: '21:00', dayIndex: 2, dayCount: 2 })], todos: [] })
    const tms = w.findAll('[data-test="today-event"] .tm')
    expect(tms.map((t) => t.find('b').text())).toEqual(['Seharian', '10:00', 's.d. 21:00'])
    expect(tms.map((t) => t.classes('long'))).toEqual([true, false, true])
  })

  it('maks 4 baris + footer', () => {
    const events = [1, 2, 3].map((i) => ev({ id: i, title: `E${i}`, startTime: '15:00', endTime: '16:00' }))
    const w = mountIt({ events, todos: todos(3) })
    expect(w.findAll('[data-test="today-event"]')).toHaveLength(2)
    expect(w.findAll('[data-test="today-todo"]')).toHaveLength(2)
    expect(w.find('[data-test="today-footer"]').text()).toBe('1 acara · 1 to-do lagi di Agenda')
    const few = mountIt({ events: [ev()], todos: todos(1) })
    expect(few.find('[data-test="today-footer"]').text()).toBe('Buka Agenda')
  })

  it('kosong → ☕', () => {
    const w = mountIt({})
    expect(w.text()).toContain('Nggak ada acara atau to-do lagi hari ini')
    expect(w.text()).toContain('Mau nambah? Tinggal buka Agenda.')
    expect(w.find('[data-test="today-footer"]').exists()).toBe(false)
  })

  it('acara semua selesai & nggak ada to-do → ☕', () => {
    const w = mountIt({ events: [ev()], minutes: 900 })
    expect(w.text()).toContain('Nggak ada acara atau to-do lagi hari ini')
  })

  it('centang to-do → dicoret + toast "Bayar listrik beres ✓"; batal "Dibatalin"; tap dobel 1 permintaan', async () => {
    let release
    const w = mountIt({ todos: [td({ note: 'Token PLN\nbaris 2' })] }, () => new Promise((r) => (release = r)))
    expect(w.find('[data-test="today-todo"]').text()).toContain('Token PLN')
    expect(w.find('[data-test="today-todo"]').text()).not.toContain('baris 2')
    const btn = w.find('[data-test="today-todo"] button')
    await btn.trigger('click')
    await btn.trigger('click')
    expect(api.patch).toHaveBeenCalledTimes(1)
    expect(api.patch).toHaveBeenCalledWith('/agenda/todos/1/check', { done: true, occurrence: null })
    release({})
    await flushPromises()
    expect(w.find('[data-test="today-todo"]').classes()).toContain('done')
    expect(toastCreate).toHaveBeenLastCalledWith(expect.objectContaining({ message: 'Bayar listrik beres ✓', position: 'top', cssClass: 'aio-toast' }))
    api.patch.mockImplementation(() => Promise.resolve({}))
    await w.find('[data-test="today-todo"] button').trigger('click')
    await flushPromises()
    expect(toastCreate).toHaveBeenLastCalledWith(expect.objectContaining({ message: 'Dibatalin' }))
    expect(w.find('[data-test="today-todo"]').classes()).not.toContain('done')
  })

  it('gagal centang → toast pesan BE', async () => {
    const w = mountIt({ todos: [td()] }, () => Promise.reject(Object.assign(new Error('x'), { message: 'Server lagi bermasalah' })))
    await w.find('[data-test="today-todo"] button').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="today-todo"]').classes()).not.toContain('done')
    expect(toastCreate).toHaveBeenLastCalledWith(expect.objectContaining({ message: 'Server lagi bermasalah' }))
  })

  it('tap acara → Agenda + detail acara; footer & Agenda › → Agenda di hari ini', async () => {
    const w = mountIt({ events: [ev({ id: 5 })], todos: todos(1) })
    await w.find('[data-test="today-event"]').trigger('click')
    expect(ionRouter.push).toHaveBeenLastCalledWith(`/tabs/agenda?tanggal=${TODAY}&acara=5`)
    await w.find('[data-test="today-footer"]').trigger('click')
    expect(ionRouter.push).toHaveBeenLastCalledWith(`/tabs/agenda?tanggal=${TODAY}`)
    ionRouter.push.mockClear()
    await w.find('[data-test="today-link"]').trigger('click')
    expect(ionRouter.push).toHaveBeenLastCalledWith(`/tabs/agenda?tanggal=${TODAY}`)
    ionRouter.push.mockClear()
    await w.find('[data-test="today-todo"] button').trigger('click')
    await flushPromises()
    expect(ionRouter.push).not.toHaveBeenCalled()
  })
})
