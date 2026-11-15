import { defineStore } from 'pinia'
import { api as defaultApi } from '@/lib/api.js'
import { isRecurring, rangeFor } from '@/lib/agenda.js'

let agendaApi = defaultApi

/** Buat test: ganti penghubung API dengan yang palsu. */
export function setAgendaApi(apiLike) {
  agendaApi = apiLike
}

const EMPTY_DAY = Object.freeze({ events: [], todos: [] })
const rowKey = (row) => `${row.id}:${row.occurrence ?? ''}`
const scopeQuery = (scope, occurrence) => (scope && occurrence ? `?scope=${scope}&occurrence=${occurrence}` : '')
/** Isian utuh to-do buat PUT (Jadwalin = isian sama, tanggal baru). */
export const todoBody = (t) => ({ title: t.title, dueOn: t.dueOn, note: t.note, reminders: t.reminders, repeat: t.repeat })

/** Agenda: isi tiap tanggal di rentang yang lagi keliatan + laci Kapan-kapan. Aturan telat & berulang udah diurus server. */
export const useAgendaStore = defineStore('agenda', {
  state: () => ({ today: null, days: {}, undated: [], range: null, pending: {} }),

  getters: {
    day: (state) => (date) => state.days[date] ?? EMPTY_DAY,
  },

  actions: {
    async load(view, date, wide) {
      const range = rangeFor(view, date, wide)
      const data = await agendaApi.get(`/agenda?from=${range.from}&to=${range.to}`)
      this.range = range
      this.today = data.today
      this.days = data.days
      this.undated = data.undated
    },

    /** Dimuat ulang di belakang layar abis nyimpen — yang udah sukses jangan keliatan gagal. */
    refresh() {
      if (!this.range) return Promise.resolve()
      const { from, to } = this.range
      return agendaApi
        .get(`/agenda?from=${from}&to=${to}`)
        .then((data) => {
          this.today = data.today
          this.days = data.days
          this.undated = data.undated
        })
        .catch(() => {})
    },

    /** Centang / batal — langsung berubah di layar, balik lagi kalau gagal. Tap dobel selama nyimpen diabaikan. */
    async toggle(row) {
      const key = rowKey(row)
      if (this.pending[key]) return
      const done = !row.done
      this.pending = { ...this.pending, [key]: true }
      this.setDone(row, done)
      try {
        await agendaApi.patch(`/agenda/todos/${row.id}/check`, { done, occurrence: isRecurring(row) ? row.occurrence : null })
        this.refresh()
      } catch (err) {
        this.setDone(row, !done)
        throw err
      } finally {
        const { [key]: _, ...rest } = this.pending
        this.pending = rest
      }
    },

    setDone(row, done) {
      const key = rowKey(row)
      const flip = (t) => (rowKey(t) === key ? { ...t, done } : t)
      this.days = Object.fromEntries(Object.entries(this.days).map(([date, d]) => [date, { ...d, todos: d.todos.map(flip) }]))
      this.undated = this.undated.map(flip)
    },

    async schedule(todo, dueOn) {
      const res = await agendaApi.put(`/agenda/todos/${todo.id}`, { ...todoBody(todo), dueOn })
      await this.refresh()
      return res
    },

    async getEvent(id) {
      return (await agendaApi.get(`/agenda/events/${id}`)).event
    },
    async createEvent(body) {
      const { event } = await agendaApi.post('/agenda/events', body)
      this.refresh()
      return event
    },
    async updateEvent(id, body) {
      const { event } = await agendaApi.put(`/agenda/events/${id}`, body)
      this.refresh()
      return event
    },
    async deleteEvent(id, scope, occurrence) {
      await agendaApi.del(`/agenda/events/${id}${scopeQuery(scope, occurrence)}`)
      this.refresh()
    },
    async createTodo(body) {
      const { todo } = await agendaApi.post('/agenda/todos', body)
      this.refresh()
      return todo
    },
    async updateTodo(id, body) {
      const { todo } = await agendaApi.put(`/agenda/todos/${id}`, body)
      this.refresh()
      return todo
    },
    async deleteTodo(id, scope, occurrence) {
      await agendaApi.del(`/agenda/todos/${id}${scopeQuery(scope, occurrence)}`)
      this.refresh()
    },
  },
})
