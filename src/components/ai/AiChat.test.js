import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { SUGG } from '@/lib/ai.js'
import { setAiApi, setAiToast, useAiStore } from '@/stores/ai.js'
import AiChat from './AiChat.vue'

const msg = (id, role, text, over = {}) => ({ id, role, text, status: 'jadi', tools: [], memory: null, createdAt: '2026-11-26T00:00:00Z', ...over })
const conv = (over = {}) => ({ id: 7, context: 'gym', kind: 'chat', sessionId: null, program: null, on: null, title: '', messages: [], quote: null, updatedAt: '2026-11-26T00:00:00Z', ...over })
const quote = { label: 'Push 23 Nov', content: { ringkas: 'r', poin: [{ ikon: '📈', judul: 'Progres', isi: 'Naik **2 kg** dari minggu lalu.' }, { ikon: '🎯', judul: 'Fokus', isi: 'Pelan-pelan aja.' }] } }

let api
let toast
const mounted = []
async function mountChat({ props = {}, opened = conv() } = {}) {
  api = {
    get: vi.fn(async () => opened),
    post: vi.fn(async (url, body) => (url === '/ai/conversations' ? opened : { user: msg(101, 'user', body.text), assistant: msg(102, 'assistant', 'Jawaban **bagus**') })),
    del: vi.fn(async () => null),
    put: vi.fn(),
    patch: vi.fn(),
  }
  toast = vi.fn()
  setAiApi(api)
  setAiToast(toast)
  const pinia = createPinia()
  setActivePinia(pinia)
  const w = mount(AiChat, { props: { context: 'gym', ...props }, global: { plugins: [pinia] }, attachTo: document.body })
  mounted.push(w)
  await flushPromises()
  return w
}
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

describe('AiChat', () => {
  it('obrolan baru Gym: header, kosong + 3 contoh pertanyaan, tap = kirim', async () => {
    const w = await mountChat()
    expect(api.post).toHaveBeenCalledWith('/ai/conversations', { context: 'gym' })
    expect(w.find('[data-test="back"]').text()).toBe('Gym')
    expect(w.text()).toContain('Chat AI')
    expect(w.find('[data-test="chip"]').text()).toBe('🏋️ Gym')
    expect(w.find('[data-test="empty"]').text()).toContain('Tanya soal gym lo')
    expect(w.find('[data-test="empty"]').text()).toContain('AI baca data sesi gym, timbangan, target makan, sama tidur lo, terus jawab pake angka lo sendiri.')
    const sugg = w.findAll('[data-test="sugg"]')
    expect(sugg.map((s) => s.text())).toEqual(SUGG.gym)
    await sugg[0].trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/ai/conversations/7/messages', { text: SUGG.gym[0] })
  })

  it('Badan: balik "Badan", chip ⚖️, kosong versi badan', async () => {
    const w = await mountChat({ props: { context: 'badan' }, opened: conv({ context: 'badan' }) })
    expect(w.find('[data-test="back"]').text()).toBe('Badan')
    expect(w.find('[data-test="chip"]').text()).toBe('⚖️ Badan')
    expect(w.find('[data-test="empty"]').text()).toContain('Tanya soal badan lo')
    expect(w.find('[data-test="empty"]').text()).toContain('timbangan, target makan, sama tidur lo')
    expect(w.findAll('[data-test="sugg"]').map((s) => s.text())).toEqual(SUGG.badan)
  })

  it('obrolan evaluasi: balik "Ringkasan", chip program + tanggal, kutipan 3 baris + Liat semua', async () => {
    const w = await mountChat({ props: { sessionId: 5 }, opened: conv({ kind: 'eval', sessionId: 5, program: 'push', on: '2026-11-23', quote }) })
    expect(api.post).toHaveBeenCalledWith('/ai/conversations', { context: 'gym', sessionId: 5 })
    expect(w.find('[data-test="back"]').text()).toBe('Ringkasan')
    expect(w.find('[data-test="chip"]').text()).toBe('🏋️ Gym · Push 23 Nov')
    expect(w.find('[data-test="quote"]').text()).toContain('Evaluasi AI · Push 23 Nov')
    expect(w.find('[data-test="quote-text"]').text()).toBe('Naik 2 kg dari minggu lalu. Pelan-pelan aja.')
    expect(w.find('[data-test="empty"]').exists()).toBe(false)
    await w.find('[data-test="quote-toggle"]').trigger('click')
    expect(w.find('[data-test="quote-full"]').text()).toContain('Progres')
    expect(w.find('[data-test="quote-full"]').html()).toContain('<b>2 kg</b>')
  })

  it('buka dari riwayat (convId) → GET obrolan itu', async () => {
    await mountChat({ props: { convId: 9 } })
    expect(api.get).toHaveBeenCalledWith('/ai/conversations/9')
  })

  it('PC: tombol ✕ ganti tombol balik, ✕ emit close', async () => {
    const w = await mountChat({ props: { panel: true } })
    expect(w.find('[data-test="back"]').exists()).toBe(false)
    await w.find('[data-test="close"]').trigger('click')
    expect(w.emitted('close')).toHaveLength(1)
  })

  it('tombol balik emit close', async () => {
    const w = await mountChat()
    await w.find('[data-test="back"]').trigger('click')
    expect(w.emitted('close')).toHaveLength(1)
  })

  it('kirim: pesan kanan + "lagi mikir…" + tombol kirim mati, abis jawab: gelembung kiri render aman', async () => {
    const w = await mountChat()
    let resolve
    api.post.mockImplementation((url, body) => (url === '/ai/conversations' ? conv() : new Promise((r) => (resolve = () => r({ user: msg(101, 'user', body.text), assistant: msg(102, 'assistant', 'Jawaban **bagus** <img src=x onerror=1>', { tools: ['riwayat Barbell Squat'] }) })))))
    await w.find('[data-test="input"]').setValue('halo AI')
    expect(w.find('[data-test="send"]').attributes('disabled')).toBeUndefined()
    await w.find('[data-test="send"]').trigger('click')
    expect(w.find('[data-test="msg-me"]').text()).toBe('halo AI')
    expect(w.find('[data-test="thinking"]').text()).toContain('lagi mikir…')
    await w.find('[data-test="input"]').setValue('lagi')
    expect(w.find('[data-test="send"]').attributes('disabled')).toBeDefined()
    resolve()
    await flushPromises()
    const html = w.find('[data-test="answer"]').html()
    expect(html).toContain('<b>bagus</b>')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
    expect(w.find('[data-test="tool"]').text()).toBe('ngambil: riwayat Barbell Squat')
    expect(w.find('[data-test="thinking"]').exists()).toBe(false)
  })

  it('Enter kirim, Shift+Enter baris baru (nggak kirim)', async () => {
    const w = await mountChat()
    const input = w.find('[data-test="input"]')
    await input.setValue('satu')
    await input.trigger('keydown', { key: 'Enter', shiftKey: true })
    expect(api.post).toHaveBeenCalledTimes(1)
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(api.post).toHaveBeenLastCalledWith('/ai/conversations/7/messages', { text: 'satu' })
    expect(input.element.value).toBe('')
  })

  it('jawaban punya ingatan: chip lime "Gue catet" di atas jawaban, Batal → hapus & chip ilang', async () => {
    const m = [msg(1, 'user', 'lutut gue cedera'), msg(2, 'assistant', 'Oke.', { memory: { id: 33, text: 'lutut kanan cedera' } })]
    const w = await mountChat({ opened: conv({ messages: m }) })
    const chip = w.find('[data-test="memory"]')
    expect(chip.text()).toContain('📝 Gue catet: lutut kanan cedera')
    await w.find('[data-test="undo"]').trigger('click')
    await flushPromises()
    expect(api.del).toHaveBeenCalledWith('/ai/memories/33')
    expect(w.find('[data-test="memory"]').exists()).toBe(false)
  })

  it('jawaban gagal: teks gagal + Kirim ulang (kirim teks user sebelumnya)', async () => {
    const m = [msg(1, 'user', 'progres gue?'), msg(2, 'assistant', 'Jawabannya gagal. Kirim ulang?', { status: 'gagal' })]
    const w = await mountChat({ opened: conv({ messages: m }) })
    expect(w.find('[data-test="failed"]').text()).toContain('Jawabannya gagal. Kirim ulang?')
    await w.find('[data-test="resend"]').trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenLastCalledWith('/ai/conversations/7/messages', { text: 'progres gue?' })
  })

  it('pesan gagal kekirim (jaringan putus) tetep keliatan + Kirim ulang', async () => {
    vi.useFakeTimers()
    try {
      const w = await mountChat()
      api.post.mockImplementation((url) => (url === '/ai/conversations' ? conv() : Promise.reject(new TypeError('network'))))
      api.get.mockResolvedValue(conv())
      await w.find('[data-test="input"]').setValue('halo')
      await w.find('[data-test="send"]').trigger('click')
      await vi.advanceTimersByTimeAsync(3100)
      await flushPromises()
      expect(w.find('[data-test="msg-me"]').text()).toBe('halo')
      expect(w.find('[data-test="failed"]').text()).toContain('Pesannya gagal kekirim. Kirim ulang?')
      expect(w.find('[data-test="resend"]').exists()).toBe(true)
    } finally {
      useAiStore().stopWatching()
      vi.useRealTimers()
    }
  })

  it('obrolan yang kebuka masih "lagi mikir…": kirim mati sampe jawaban jadi', async () => {
    vi.useFakeTimers()
    try {
      const jalan = conv({ messages: [msg(1, 'user', 'halo'), msg(2, 'assistant', '', { status: 'jalan' })] })
      const w = await mountChat({ opened: jalan })
      api.get.mockResolvedValue(conv({ messages: [msg(1, 'user', 'halo'), msg(2, 'assistant', 'Udah jadi')] }))
      await w.find('[data-test="input"]').setValue('teks')
      expect(w.find('[data-test="send"]').attributes('disabled')).toBeDefined()
      await vi.advanceTimersByTimeAsync(3100)
      await flushPromises()
      expect(w.find('[data-test="answer"]').text()).toBe('Udah jadi')
      expect(w.find('[data-test="send"]').attributes('disabled')).toBeUndefined()
    } finally {
      useAiStore().stopWatching()
      vi.useRealTimers()
    }
  })

  it('🕘 / 🧠 ngaktifin tombol (hitam), pencet lagi balik ke chat', async () => {
    const w = await mountChat()
    await w.find('[data-test="hist"]').trigger('click')
    expect(w.find('[data-test="hist"]').classes()).toContain('on')
    expect(w.find('[data-test="input"]').exists()).toBe(false)
    await w.find('[data-test="hist"]').trigger('click')
    expect(w.find('[data-test="input"]').exists()).toBe(true)
  })

  it('obrolan nggak kebuka: pesan + Coba lagi', async () => {
    const w = await mountChat()
    api.post.mockRejectedValueOnce(new Error('x'))
    await w.vm.open()
    await flushPromises()
    expect(w.find('[data-test="open-failed"]').text()).toContain('Obrolannya nggak kebuka.')
    await w.find('[data-test="retry-open"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="open-failed"]').exists()).toBe(false)
  })
})
