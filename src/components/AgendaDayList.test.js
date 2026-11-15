import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AgendaDayList from './AgendaDayList.vue'

const NONE = { freq: 'none', days: [], until: null }
const conf = (dayIndex) => ({ id: 1, title: 'Konferensi', allDay: false, startDate: '2026-11-16', endDate: '2026-11-18', startTime: '09:00', endTime: '17:00', location: null, note: null, reminders: [], repeat: NONE, occurrence: '2026-11-16', dayIndex, dayCount: 3 })
const timeOf = (dayIndex) => {
  setActivePinia(createPinia())
  return mount(AgendaDayList, { props: { day: { events: [conf(dayIndex)], todos: [] } } }).find('.time').text()
}

describe('AgendaDayList', () => {
  it('shows which day of a timed event that lasts several days it is', () => {
    expect(timeOf(1)).toBe('09:00hari 1/3')
    expect(timeOf(2)).toBe('Seharianhari 2/3')
    expect(timeOf(3)).toBe('s.d. 17:00hari 3/3')
  })
})
