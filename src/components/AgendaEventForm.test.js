import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { setAgendaApi, useAgendaStore } from '@/stores/agenda.js'
import AgendaEventForm from './AgendaEventForm.vue'

const sheet = vi.hoisted(() => ({ present: vi.fn(), onDidDismiss: vi.fn() }))
const sheetCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), actionSheetController: { create: sheetCreate } }))

const TODAY = '2026-11-15'
const NONE = { freq: 'none', days: [], until: null }
let api
function mountForm(props = {}) {
  api = { get: vi.fn(), post: vi.fn(async () => ({ event: { id: 9 } })), put: vi.fn(async () => ({ event: { id: 9 } })), del: vi.fn() }
  setAgendaApi(api)
  setActivePinia(createPinia())
  useAgendaStore().today = TODAY
  return mount(AgendaEventForm, { props: { date: '2026-11-18', ...props } })
}
const save = async (w) => {
  await w.find('form').trigger('submit')
  await flushPromises()
}
const chips = (w) => w.findAll('[data-test="rem-chip"]').map((c) => c.text())

beforeEach(() => {
  sheet.onDidDismiss.mockReset().mockResolvedValue({ data: 'one' })
  sheetCreate.mockReset().mockResolvedValue(sheet)
})

describe('AgendaEventForm', () => {
  it('starts with one reminder 30 minutes before and saves the event', async () => {
    const w = mountForm()
    expect(chips(w)).toEqual(['30 mnt sebelum'])
    await w.find('[data-test="title"]').setValue('Nikahan Raka')
    await w.find('[data-test="location"]').setValue('Fairmont Jakarta, Senayan')
    await w.find('[data-test="note"]').setValue('Dress code batik')
    await save(w)
    expect(api.post).toHaveBeenCalledWith('/agenda/events', {
      title: 'Nikahan Raka',
      allDay: false,
      startDate: '2026-11-18',
      endDate: '2026-11-18',
      startTime: '19:00',
      endTime: '21:00',
      location: 'Fairmont Jakarta, Senayan',
      note: 'Dress code batik',
      reminders: [{ type: 'before', minutes: 30 }],
      repeat: NONE,
    })
    expect(w.emitted('saved')).toHaveLength(1)
  })

  it('hides the times for an all-day event and switches the reminder to the day before', async () => {
    const w = mountForm()
    await w.find('[data-test="allday"]').trigger('click')
    expect(w.find('[data-test="start-time"]').exists()).toBe(false)
    expect(chips(w)).toEqual(['H-1 20:00'])
    await w.find('[data-test="title"]').setValue('Trip Bandung')
    await w.find('[data-test="end-date"]').setValue('2026-11-20')
    await save(w)
    expect(api.post.mock.calls[0][1]).toMatchObject({ allDay: true, startTime: null, endTime: null, endDate: '2026-11-20', reminders: [{ type: 'day', offset: -1, time: '20:00' }] })
  })

  it('sets a reminder by hand in hours and keeps the end date after the start', async () => {
    const w = mountForm()
    await w.find('[data-test="rem-add"]').trigger('click')
    await w.find('[data-test="rem-num"]').setValue('2')
    await w.find('[data-test="rem-unit"]').setValue('60')
    await w.find('[data-test="rem-custom"]').trigger('click')
    expect(chips(w)).toEqual(['30 mnt sebelum', '2 jam sebelum'])
    await w.find('[data-test="start-date"]').setValue('2026-11-25')
    expect(w.find('[data-test="end-date"]').element.value).toBe('2026-11-25')
  })

  it('keeps a repeating event to one day', async () => {
    const w = mountForm()
    await w.find('[data-rep="weekly"]').trigger('click')
    expect(w.find('[data-test="end-date"]').exists()).toBe(false)
    expect(w.find('[data-test="end-time"]').exists()).toBe(true)
  })

  it('asks which dates a change to a repeating event applies to', async () => {
    const event = { id: 5, title: 'Futsal', allDay: false, startDate: '2026-10-31', endDate: '2026-10-31', startTime: '08:00', endTime: '10:00', location: null, note: null, reminders: [], repeat: { freq: 'weekly', days: [6], until: null } }
    const w = mountForm({ event, occurrence: '2026-11-21' })
    expect(w.find('[data-test="start-date"]').element.value).toBe('2026-11-21')
    await w.find('[data-test="title"]').setValue('Futsal sore')
    await save(w)
    expect(sheetCreate).toHaveBeenCalledWith(expect.objectContaining({ header: 'Ubah acara berulang' }))
    expect(api.put).toHaveBeenCalledWith('/agenda/events/5', expect.objectContaining({ title: 'Futsal sore', startDate: '2026-11-21', endDate: '2026-11-21', scope: 'one', occurrence: '2026-11-21' }))
  })

  it('shows what the server refused next to its field', async () => {
    const w = mountForm()
    api.post.mockRejectedValueOnce(new ApiError('Data tidak valid.', 422, { endTime: ['Selesai nggak boleh sebelum mulai.'] }))
    await w.find('[data-test="title"]').setValue('Rapat')
    await save(w)
    expect(w.find('[data-test="time-error"]').text()).toBe('Selesai nggak boleh sebelum mulai.')
  })
})
