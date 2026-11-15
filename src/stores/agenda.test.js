import { createPinia, setActivePinia } from 'pinia'
import { setAgendaApi, useAgendaStore } from './agenda.js'

const NONE = { freq: 'none', days: [], until: null }
const WEEKLY = { freq: 'weekly', days: [2], until: null }
const row = (over) => ({ id: 1, title: 'Bayar listrik', dueOn: '2026-11-15', note: null, reminders: [], repeat: NONE, occurrence: '2026-11-15', done: false, late: 0, ...over })
const data = () => ({
  today: '2026-11-15',
  days: { '2026-11-15': { events: [], todos: [row({}), row({ id: 2, title: 'Buang sampah', repeat: WEEKLY, occurrence: '2026-11-10', late: 5 })] } },
  undated: [row({ id: 3, title: 'Beli kado', dueOn: null, occurrence: null })],
})

let api
beforeEach(() => {
  setActivePinia(createPinia())
  api = {
    get: vi.fn(async () => data()),
    post: vi.fn(async (url) => (url.includes('events') ? { event: { id: 9 } } : { todo: { id: 9 } })),
    put: vi.fn(async () => ({ todo: { id: 3 } })),
    patch: vi.fn(async () => ({ todo: { id: 1 } })),
    del: vi.fn(async () => null),
  }
  setAgendaApi(api)
})

describe('agenda store', () => {
  it('loads the range a view needs and exposes each day', async () => {
    const store = useAgendaStore()
    await store.load('month', '2026-11-15', false)
    expect(api.get).toHaveBeenCalledWith('/agenda?from=2026-10-26&to=2026-12-06')
    expect(store.today).toBe('2026-11-15')
    expect(store.day('2026-11-15').todos).toHaveLength(2)
    expect(store.day('2026-11-20')).toEqual({ events: [], todos: [] })
    expect(store.undated.map((t) => t.title)).toEqual(['Beli kado'])
  })

  it('keeps the newest range when an older answer arrives late', async () => {
    const store = useAgendaStore()
    let slow
    api.get.mockImplementationOnce(() => new Promise((resolve) => (slow = resolve)))
    const first = store.load('day', '2026-11-01', false)
    await store.load('day', '2026-11-15', false)
    slow({ today: '2026-11-15', days: { '2026-10-26': { events: [], todos: [] } }, undated: [] })
    await first
    expect(store.range).toEqual({ from: '2026-11-09', to: '2026-11-15' })
    expect(store.day('2026-11-15').todos).toHaveLength(2)
  })

  it('ticks a to-do on screen right away, sending the occurrence only for repeating ones', async () => {
    const store = useAgendaStore()
    await store.load('day', '2026-11-15', false)
    const p = store.toggle(store.day('2026-11-15').todos[0])
    expect(store.day('2026-11-15').todos[0].done).toBe(true)
    await p
    expect(api.patch).toHaveBeenCalledWith('/agenda/todos/1/check', { done: true, occurrence: null })
    await store.toggle(store.day('2026-11-15').todos.find((t) => t.id === 2))
    expect(api.patch).toHaveBeenCalledWith('/agenda/todos/2/check', { done: true, occurrence: '2026-11-10' })
  })

  it('ignores a second tap while the first tick is still saving', async () => {
    const store = useAgendaStore()
    await store.load('day', '2026-11-15', false)
    const first = store.day('2026-11-15').todos[0]
    const p = store.toggle(first)
    await store.toggle(store.day('2026-11-15').todos[0])
    await p
    expect(api.patch).toHaveBeenCalledTimes(1)
  })

  it('puts the tick back when saving fails', async () => {
    const store = useAgendaStore()
    await store.load('day', '2026-11-15', false)
    api.patch.mockRejectedValueOnce(new Error('Nggak bisa nyambung ke server.'))
    await expect(store.toggle(store.day('2026-11-15').todos[0])).rejects.toThrow('Nggak bisa nyambung ke server.')
    expect(store.day('2026-11-15').todos[0].done).toBe(false)
  })

  it('schedules a Kapan-kapan to-do with its whole content and reloads behind the scenes', async () => {
    const store = useAgendaStore()
    await store.load('day', '2026-11-15', false)
    api.get.mockClear()
    await store.schedule(store.undated[0], '2026-11-16')
    expect(api.put).toHaveBeenCalledWith('/agenda/todos/3', { title: 'Beli kado', dueOn: '2026-11-16', note: null, reminders: [], repeat: NONE })
    expect(api.get).toHaveBeenCalledWith('/agenda?from=2026-11-09&to=2026-11-15')
  })

  it('saves and deletes events and to-dos, passing the scope of a repeating one', async () => {
    const store = useAgendaStore()
    await store.load('day', '2026-11-15', false)
    await store.createEvent({ title: 'Futsal' })
    expect(api.post).toHaveBeenCalledWith('/agenda/events', { title: 'Futsal' })
    await store.updateEvent(9, { title: 'Futsal', scope: 'one', occurrence: '2026-11-21' })
    expect(api.put).toHaveBeenCalledWith('/agenda/events/9', { title: 'Futsal', scope: 'one', occurrence: '2026-11-21' })
    await store.deleteEvent(9, 'following', '2026-11-21')
    expect(api.del).toHaveBeenCalledWith('/agenda/events/9?scope=following&occurrence=2026-11-21')
    await store.deleteEvent(4)
    expect(api.del).toHaveBeenCalledWith('/agenda/events/4')
    await store.createTodo({ title: 'Beli galon' })
    expect(api.post).toHaveBeenCalledWith('/agenda/todos', { title: 'Beli galon' })
    await store.deleteTodo(2, 'one', '2026-11-17')
    expect(api.del).toHaveBeenCalledWith('/agenda/todos/2?scope=one&occurrence=2026-11-17')
  })
})
