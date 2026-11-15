import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { setAgendaApi, useAgendaStore } from '@/stores/agenda.js'
import AgendaTodoForm from './AgendaTodoForm.vue'

const sheet = vi.hoisted(() => ({ present: vi.fn(), onDidDismiss: vi.fn() }))
const sheetCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), actionSheetController: { create: sheetCreate } }))

const TODAY = '2026-11-15' // Minggu
const NONE = { freq: 'none', days: [], until: null }
let api
function mountForm(props = {}) {
  api = {
    get: vi.fn(),
    post: vi.fn(() => new Promise((resolve) => setTimeout(() => resolve({ todo: { id: 9 } }), 5))),
    put: vi.fn(async () => ({ todo: { id: 9 } })),
    del: vi.fn(async () => null),
  }
  setAgendaApi(api)
  setActivePinia(createPinia())
  useAgendaStore().today = TODAY
  return mount(AgendaTodoForm, { props: { date: TODAY, ...props } })
}
const chip = (w, text) => w.findAll('button').find((b) => b.text() === text)
const save = async (w) => {
  await w.find('form').trigger('submit')
  await new Promise((r) => setTimeout(r, 10))
  await flushPromises()
}

beforeEach(() => {
  sheet.onDidDismiss.mockReset().mockResolvedValue({ data: 'one' })
  sheetCreate.mockReset().mockResolvedValue(sheet)
})

describe('AgendaTodoForm', () => {
  it('saves a to-do for the open date', async () => {
    const w = mountForm({ date: '2026-11-17' })
    await w.find('[data-test="title"]').setValue('  Ambil laundry  ')
    expect(chip(w, 'Sel 17 Nov').classes()).toContain('on')
    await save(w)
    expect(api.post).toHaveBeenCalledWith('/agenda/todos', { title: 'Ambil laundry', dueOn: '2026-11-17', reminders: [], repeat: NONE, note: null })
    expect(w.emitted('saved')).toHaveLength(1)
  })

  it('defaults to today when the open date has passed', () => {
    const w = mountForm({ date: '2026-11-10' })
    expect(chip(w, 'Hari ini').classes()).toContain('on')
  })

  it('puts it in Kapan-kapan without reminders or repeat', async () => {
    const w = mountForm()
    await w.find('[data-test="title"]').setValue('Beli kado')
    await w.find('[data-when=""]').trigger('click')
    expect(w.find('[data-test="reminders"]').exists()).toBe(false)
    expect(w.find('[data-test="repeat"]').exists()).toBe(false)
    await save(w)
    expect(api.post).toHaveBeenCalledWith('/agenda/todos', expect.objectContaining({ dueOn: null, reminders: [], repeat: NONE }))
  })

  it('takes up to 3 reminders, including one set by hand', async () => {
    const w = mountForm()
    await w.find('[data-test="title"]').setValue('Bayar listrik')
    await w.find('[data-test="rem-add"]').trigger('click')
    await chip(w, 'Hari itu 08:00').trigger('click')
    await w.find('[data-test="rem-add"]').trigger('click')
    await w.find('[data-test="rem-day"]').setValue('-1')
    await w.find('[data-test="rem-time"]').setValue('07:00')
    await w.find('[data-test="rem-custom"]').trigger('click')
    await w.find('[data-test="rem-add"]').trigger('click')
    await chip(w, 'Hari itu 12:00').trigger('click')
    expect(w.findAll('[data-test="rem-chip"]').map((c) => c.text())).toEqual(['Hari itu 08:00', 'H-1 07:00', 'Hari itu 12:00'])
    expect(w.find('[data-test="rem-add"]').exists()).toBe(false)
    await w.findAll('[data-test="rem-chip"]')[2].trigger('click')
    expect(w.findAll('[data-test="rem-chip"]')).toHaveLength(2)
    await save(w)
    expect(api.post.mock.calls[0][1].reminders).toEqual([
      { type: 'day', offset: 0, time: '08:00' },
      { type: 'day', offset: -1, time: '07:00' },
    ])
  })

  it('repeats weekly on the day of the date by default, until a date', async () => {
    const w = mountForm({ date: '2026-11-17' })
    await w.find('[data-test="title"]').setValue('Buang sampah')
    await w.find('[data-rep="weekly"]').trigger('click')
    expect(w.find('[data-rep-day="2"]').classes()).toContain('on')
    await w.find('[data-rep-day="5"]').trigger('click')
    await w.find('[data-test="until-date"]').setValue('2026-12-31')
    await save(w)
    expect(api.post.mock.calls[0][1].repeat).toEqual({ freq: 'weekly', days: [2, 5], until: '2026-12-31' })
  })

  it('changes a repeating to-do from the tapped date on, without asking', async () => {
    const todo = { id: 4, title: 'Buang sampah', dueOn: '2026-10-20', note: null, reminders: [], repeat: { freq: 'weekly', days: [2], until: null } }
    const w = mountForm({ todo, occurrence: '2026-11-17' })
    expect(chip(w, 'Sel 17 Nov').classes()).toContain('on')
    await w.find('[data-test="title"]').setValue('Buang sampah pagi')
    await save(w)
    expect(sheetCreate).not.toHaveBeenCalled()
    expect(api.put).toHaveBeenCalledWith('/agenda/todos/4', { title: 'Buang sampah pagi', dueOn: '2026-11-17', reminders: [], repeat: { freq: 'weekly', days: [2], until: null }, note: null, occurrence: '2026-11-17' })
  })

  it('shows what the server refused next to its field', async () => {
    const w = mountForm()
    api.post.mockRejectedValueOnce(new ApiError('Data tidak valid.', 422, { title: ['Kepanjangan (maks 120 huruf).'] }))
    await w.find('[data-test="title"]').setValue('x')
    await save(w)
    expect(w.find('[data-test="title-error"]').text()).toBe('Kepanjangan (maks 120 huruf).')
  })

  it('asks for a title, and saves once on a double tap', async () => {
    const w = mountForm()
    await save(w)
    expect(w.find('[data-test="title-error"]').text()).toBe('Judulnya wajib diisi.')
    expect(api.post).not.toHaveBeenCalled()
    await w.find('[data-test="title"]').setValue('Beli galon')
    w.find('form').trigger('submit')
    await save(w)
    expect(api.post).toHaveBeenCalledTimes(1)
  })

  it('does not save when Enter is pressed in the title', async () => {
    const w = mountForm()
    await w.find('[data-test="title"]').setValue('Beli galon')
    await w.find('[data-test="title"]').trigger('keydown', { key: 'Enter' })
    expect(api.post).not.toHaveBeenCalled()
  })

  it('asks only once when Hapus is tapped twice', async () => {
    // Action sheet masih kebuka (belum dipilih) pas tap kedua.
    sheet.onDidDismiss.mockReturnValue(new Promise(() => {}))
    const w = mountForm({ todo: { id: 4, title: 'Beli galon', dueOn: TODAY, note: null, reminders: [], repeat: NONE } })
    await w.find('[data-test="delete"]').trigger('click')
    await w.find('[data-test="delete"]').trigger('click')
    await flushPromises()
    expect(sheetCreate).toHaveBeenCalledTimes(1)
  })

  it('deletes only the tapped date of a repeating to-do', async () => {
    const todo = { id: 4, title: 'Buang sampah', dueOn: '2026-10-20', note: null, reminders: [], repeat: { freq: 'weekly', days: [2], until: null } }
    const w = mountForm({ todo, occurrence: '2026-11-17' })
    await w.find('[data-test="delete"]').trigger('click')
    await flushPromises()
    expect(sheetCreate).toHaveBeenCalledWith(expect.objectContaining({ header: 'Hapus to-do berulang' }))
    expect(api.del).toHaveBeenCalledWith('/agenda/todos/4?scope=one&occurrence=2026-11-17')
    expect(w.emitted('deleted')).toHaveLength(1)
  })
})
