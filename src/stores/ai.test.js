import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { setAiApi, setAiToast, useAiStore } from './ai.js'

const msg = (id, role, status, over = {}) => ({ id, role, text: 't', status, tools: [], memory: null, createdAt: '2026-11-26T00:00:00Z', ...over })
const conv = (messages) => ({ id: 7, context: 'gym', kind: 'chat', sessionId: null, title: 't', updatedAt: '2026-11-26T00:00:00Z', quote: null, messages })
const ev = (status, content = null) => ({ sessionId: 1, program: 'push', on: '2026-11-26', status, content, doneAt: null, error: null, stale: false })

let api, store, toast
const setOnline = (v) => Object.defineProperty(navigator, 'onLine', { value: v, configurable: true })

beforeEach(() => {
  vi.useFakeTimers()
  setActivePinia(createPinia())
  api = { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), del: vi.fn(async () => null) }
  toast = vi.fn()
  setAiApi(api)
  setAiToast(toast)
  store = useAiStore()
  setOnline(true)
})
afterEach(() => {
  store.stopWatching()
  vi.useRealTimers()
  setOnline(true)
})

describe('ai store: evaluasi', () => {
  it('startEval offline: toast & nggak manggil API', async () => {
    setOnline(false)
    expect(await store.startEval(1)).toBeNull()
    expect(toast).toHaveBeenCalledWith('Butuh internet buat evaluasi.')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('startEval simpen hasilnya', async () => {
    api.post.mockResolvedValue(ev('jalan'))
    await store.startEval(1)
    expect(api.post).toHaveBeenCalledWith('/ai/evaluations', { sessionId: 1 })
    expect(store.evals[1].status).toBe('jalan')
  })

  it('pollEval berhenti pas jadi', async () => {
    store.evals = { 1: ev('jalan') }
    api.get.mockResolvedValueOnce(ev('jalan')).mockResolvedValue(ev('jadi', { ringkas: 'x', poin: [] }))
    store.pollEval(1)
    await vi.advanceTimersByTimeAsync(5000)
    expect(api.get).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(5000)
    expect(store.evals[1].status).toBe('jadi')
    await vi.advanceTimersByTimeAsync(30000)
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('pollEval berhenti pas stop dipanggil', async () => {
    store.evals = { 1: ev('jalan') }
    api.get.mockResolvedValue(ev('jalan'))
    const stop = store.pollEval(1)
    await vi.advanceTimersByTimeAsync(5000)
    stop()
    await vi.advanceTimersByTimeAsync(20000)
    expect(api.get).toHaveBeenCalledTimes(1)
  })

  it('pollEval nggak nembak pas halaman nggak keliatan', async () => {
    store.evals = { 1: ev('jalan') }
    api.get.mockResolvedValue(ev('jalan'))
    const spy = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    const stop = store.pollEval(1)
    await vi.advanceTimersByTimeAsync(15000)
    expect(api.get).not.toHaveBeenCalled()
    stop()
    spy.mockRestore()
  })
})

describe('ai store: chat', () => {
  it('send sukses: ganti pesan sementara dengan dari server', async () => {
    store.current = conv([])
    api.post.mockResolvedValue({ user: msg(1, 'user', 'jadi'), assistant: msg(2, 'assistant', 'jadi') })
    await store.send('halo')
    expect(api.post).toHaveBeenCalledWith('/ai/conversations/7/messages', { text: 'halo' })
    expect(store.current.messages.map((m) => m.id)).toEqual([1, 2])
  })

  it('send optimistis: user + assistant jalan langsung nongol', async () => {
    store.current = conv([])
    let resolve
    api.post.mockReturnValue(new Promise((r) => (resolve = r)))
    const p = store.send('halo')
    expect(store.current.messages.map((m) => [m.role, m.status])).toEqual([['user', 'jadi'], ['assistant', 'jalan']])
    resolve({ user: msg(1, 'user', 'jadi'), assistant: msg(2, 'assistant', 'jadi') })
    await p
  })

  it('send putus: cek tiap 3 dtk sampe jawaban jadi', async () => {
    store.current = conv([])
    api.post.mockRejectedValue(new ApiError('putus', 0))
    api.get
      .mockResolvedValueOnce(conv([msg(1, 'user', 'jadi'), msg(2, 'assistant', 'jalan')]))
      .mockResolvedValue(conv([msg(1, 'user', 'jadi'), msg(2, 'assistant', 'jadi')]))
    await store.send('halo')
    await vi.advanceTimersByTimeAsync(3000)
    expect(store.current.messages[1].status).toBe('jalan')
    await vi.advanceTimersByTimeAsync(3000)
    expect(store.current.messages[1].status).toBe('jadi')
    await vi.advanceTimersByTimeAsync(30000)
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('send 409: toast, ambil ulang obrolan, terus cek jawaban yang masih jalan', async () => {
    store.current = conv([])
    api.post.mockRejectedValue(new ApiError('Tunggu jawaban sebelumnya dulu.', 409))
    api.get
      .mockResolvedValueOnce(conv([msg(1, 'user', 'jadi'), msg(2, 'assistant', 'jalan')]))
      .mockResolvedValue(conv([msg(1, 'user', 'jadi'), msg(2, 'assistant', 'jadi')]))
    await store.send('halo')
    expect(toast).toHaveBeenCalledWith('Tunggu jawaban sebelumnya dulu.')
    expect(store.current.messages.map((m) => m.id)).toEqual([1, 2])
    expect(store.current.messages[1].status).toBe('jalan')
    await vi.advanceTimersByTimeAsync(3000)
    expect(store.current.messages[1].status).toBe('jadi')
  })

  it('send 409 tanpa pesan dari BE: pakai teks cadangan', async () => {
    store.current = conv([])
    api.post.mockRejectedValue(new ApiError('', 409))
    api.get.mockResolvedValue(conv([msg(1, 'user', 'jadi'), msg(2, 'assistant', 'jadi')]))
    await store.send('halo')
    expect(toast).toHaveBeenCalledWith('Tunggu jawaban sebelumnya dulu.')
  })

  it('send gagal nyampe BE (jaringan putus): pesan tetep keliatan + jawaban gagal + toast', async () => {
    store.current = conv([])
    api.post.mockRejectedValue(new TypeError('network'))
    api.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(conv([]))
    await store.send('halo')
    await vi.advanceTimersByTimeAsync(3000)
    expect(store.current.messages[1].status).toBe('jalan')
    await vi.advanceTimersByTimeAsync(3000)
    expect(store.current.messages.map((m) => [m.role, m.text, m.status])).toEqual([
      ['user', 'halo', 'jadi'],
      ['assistant', 'Pesannya gagal kekirim. Kirim ulang?', 'gagal'],
    ])
    expect(toast).toHaveBeenCalledWith('Pesannya gagal kekirim. Kirim ulang?')
    await vi.advanceTimersByTimeAsync(30000)
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('kirim ulang abis gagal kekirim: pasangan lokal diganti, nggak dobel', async () => {
    store.current = conv([])
    api.post.mockRejectedValueOnce(new TypeError('network'))
    api.get.mockResolvedValue(conv([]))
    await store.send('halo')
    await vi.advanceTimersByTimeAsync(3000)
    api.post.mockResolvedValue({ user: msg(1, 'user', 'jadi', { text: 'halo' }), assistant: msg(2, 'assistant', 'jadi') })
    await store.send('halo')
    expect(store.current.messages.map((m) => m.id)).toEqual([1, 2])
  })

  it('send diabaikan kalau jawaban terakhir masih jalan', async () => {
    store.current = conv([msg(1, 'user', 'jadi'), msg(2, 'assistant', 'jalan')])
    await store.send('lagi')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('openConv: dapet obrolan masih jalan → mulai cek', async () => {
    api.post.mockResolvedValue(conv([msg(1, 'user', 'jadi'), msg(2, 'assistant', 'jalan')]))
    api.get.mockResolvedValue(conv([msg(1, 'user', 'jadi'), msg(2, 'assistant', 'jadi')]))
    await store.openConv({ context: 'gym', sessionId: 4 })
    expect(api.post).toHaveBeenCalledWith('/ai/conversations', { context: 'gym', sessionId: 4 })
    await vi.advanceTimersByTimeAsync(3000)
    expect(store.current.messages[1].status).toBe('jadi')
  })

  it('openConv pakai id → GET', async () => {
    api.get.mockResolvedValue(conv([]))
    await store.openConv({ id: 7 })
    expect(api.get).toHaveBeenCalledWith('/ai/conversations/7')
  })

  it('undoMemory: DELETE & id jadi null', async () => {
    const m = msg(2, 'assistant', 'jadi', { memory: { id: 9, text: 'bahu kiri' } })
    store.current = conv([msg(1, 'user', 'jadi'), m])
    store.memories = [{ id: 9, text: 'bahu kiri', source: 'ai', createdAt: 'x' }]
    await store.undoMemory(m)
    expect(api.del).toHaveBeenCalledWith('/ai/memories/9')
    expect(store.current.messages[1].memory).toEqual({ id: null, text: 'bahu kiri' })
    expect(store.memories).toEqual([])
  })
})

describe('ai store: daftar, ingatan, pemakaian', () => {
  it('loadConvs / removeConv / memori / usage', async () => {
    api.get.mockResolvedValueOnce({ items: [{ id: 1 }, { id: 2 }] })
    await store.loadConvs()
    expect(store.convs).toHaveLength(2)
    await store.removeConv(1)
    expect(api.del).toHaveBeenCalledWith('/ai/conversations/1')
    expect(store.convs).toEqual([{ id: 2 }])

    api.get.mockResolvedValueOnce({ items: [{ id: 5, text: 'a' }] })
    await store.loadMemories()
    api.post.mockResolvedValue({ id: 6, text: 'b' })
    await store.addMemory('b')
    expect(store.memories.map((m) => m.id)).toEqual([6, 5])
    await store.removeMemory(5)
    expect(store.memories.map((m) => m.id)).toEqual([6])

    api.get.mockResolvedValueOnce({ kursIdr: 18260, months: [] })
    await store.loadUsage()
    expect(store.usage.kursIdr).toBe(18260)
  })

  it('setAutoEval balik ke nilai lama + toast kalau gagal', async () => {
    api.put.mockRejectedValue(new ApiError('Server error', 500))
    await store.setAutoEval(true)
    expect(store.settings.autoEval).toBe(false)
    expect(toast).toHaveBeenCalled()
  })
})
