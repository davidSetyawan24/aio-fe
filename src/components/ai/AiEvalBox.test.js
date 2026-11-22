import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { setAiApi, setAiToast, useAiStore } from '@/stores/ai.js'
import AiEvalBox from './AiEvalBox.vue'

const content = { ringkas: 'r', poin: [{ ikon: '📈', judul: 'Progres', isi: 'Naik **2 kg** <b>x</b>' }, { ikon: '🎯', judul: 'Fokus', isi: 'Pelan-pelan' }] }
const ev = (over = {}) => ({ sessionId: 5, program: 'push', on: '2026-11-23', status: 'none', content: null, doneAt: null, error: null, stale: false, ...over })

let api
const mounted = []
async function mountBox({ evaluation = ev(), settings = { autoEval: false, enabled: true }, mode = 'summary' } = {}) {
  api = {
    get: vi.fn(async (url) => (url === '/ai/settings' ? settings : evaluation)),
    put: vi.fn(async (url, body) => ({ ...settings, ...body })),
    post: vi.fn(async () => ev({ status: 'jalan' })),
    del: vi.fn(),
    patch: vi.fn(),
  }
  setAiApi(api)
  setAiToast(vi.fn())
  const pinia = createPinia()
  setActivePinia(pinia)
  useAiStore()
  const w = mount(AiEvalBox, { props: { sessionId: 5, program: 'push', mode }, global: { plugins: [pinia] } })
  mounted.push(w)
  await flushPromises()
  return w
}
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

describe('AiEvalBox', () => {
  it('none + summary: tombol Evaluasi + saklar mati', async () => {
    const w = await mountBox()
    expect(w.text()).toContain('Evaluasi AI')
    expect(w.text()).toContain('Sesi ini belum dievaluasi')
    expect(w.text()).toContain('Evaluasi sesi ini ✨')
    expect(w.text()).toContain('Langsung evaluasi tiap selesai')
    expect(w.text()).toContain('Mati: AI baru jalan kalau lo pencet tombol di atas.')
  })

  it('saklar nyala: sub nyala', async () => {
    const w = await mountBox({ settings: { autoEval: true, enabled: true } })
    expect(w.text()).toContain('Nyala: tiap pencet Selesai, AI langsung jalan.')
  })

  it('none + detail: tanpa saklar', async () => {
    const w = await mountBox({ mode: 'detail' })
    expect(w.text()).toContain('Evaluasi sesi ini ✨')
    expect(w.find('[data-test="auto-switch"]').exists()).toBe(false)
  })

  it('pencet saklar: setAutoEval(true) aja, nggak startEval', async () => {
    const w = await mountBox()
    await w.find('[data-test="auto-switch"]').trigger('click')
    await flushPromises()
    expect(api.put).toHaveBeenCalledWith('/ai/settings', { autoEval: true })
    expect(api.post).not.toHaveBeenCalled()
  })

  it('pencet tombol Evaluasi: startEval', async () => {
    const w = await mountBox()
    await w.find('[data-test="start"]').trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/ai/evaluations', { sessionId: 5 })
    expect(w.text()).toContain('Lagi dikerjain di belakang')
  })

  it('running: spinner + teks layar 10 ngikut nama latihan', async () => {
    const w = await mountBox({ evaluation: ev({ status: 'jalan' }) })
    expect(w.text()).toContain('Lagi dikerjain di belakang')
    expect(w.text()).toContain('AI lagi baca sesi Push lo (±1–2 menit).')
    expect(w.text()).toContain('Lo bisa tinggal mandi atau ngopi. Begitu jadi, notifnya masuk.')
    expect(w.find('[data-test="spin"]').exists()).toBe(true)
  })

  it('done: kepala WIB, poin dirender aman, Bahas di chat emit talk, kaki + saklar kecil', async () => {
    const w = await mountBox({ evaluation: ev({ status: 'jadi', content, doneAt: '2026-11-23T12:22:00.000Z' }) })
    expect(w.text()).toContain('Abis Push · 23 Nov 19.22')
    const pts = w.findAll('[data-test="point"]')
    expect(pts).toHaveLength(2)
    expect(pts[0].text()).toContain('Progres')
    expect(pts[0].html()).toContain('<b>2 kg</b>')
    expect(pts[0].html()).not.toContain('<b>x</b>')
    expect(w.text()).toContain('Kesimpen di riwayat sesi ini')
    expect(w.text()).toContain('Langsung tiap selesai')
    await w.find('[data-test="talk"]').trigger('click')
    expect(w.emitted('talk')).toHaveLength(1)
  })

  it('done + detail: tanpa kaki & saklar', async () => {
    const w = await mountBox({ mode: 'detail', evaluation: ev({ status: 'jadi', content, doneAt: '2026-11-23T12:22:00.000Z' }) })
    expect(w.text()).not.toContain('Kesimpen di riwayat sesi ini')
    expect(w.find('[data-test="auto-switch"]').exists()).toBe(false)
    expect(w.find('[data-test="talk"]').exists()).toBe(true)
  })

  it('stale: catatan + Evaluasi ulang', async () => {
    const w = await mountBox({ evaluation: ev({ status: 'jadi', content, doneAt: '2026-11-23T12:22:00.000Z', stale: true }) })
    expect(w.text()).toContain('Sesi ini diubah abis dievaluasi.')
    await w.find('[data-test="rerun"]').trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/ai/evaluations', { sessionId: 5 })
  })

  it('failed: alasan + belum kepotong biaya', async () => {
    const w = await mountBox({ evaluation: ev({ status: 'gagal', error: { message: 'Mistral lagi nggak bisa dihubungin.', chargedRp: null } }) })
    expect(w.text()).toContain('Evaluasi sesi ini gagal')
    expect(w.text()).toContain('Mistral lagi nggak bisa dihubungin.')
    expect(w.text()).toContain('Belum kepotong biaya.')
    expect(w.text()).toContain('Coba lagi ↻')
  })

  it('failed berbayar: Kepotong ±Rp480.', async () => {
    const w = await mountBox({ evaluation: ev({ status: 'gagal', error: { message: 'Jawaban AI-nya rusak.', chargedRp: 480 } }) })
    expect(w.text()).toContain('Kepotong ±Rp480.')
    expect(w.text()).not.toContain('Belum kepotong biaya.')
  })

  it('rerunning: isi lama + baris muter', async () => {
    const w = await mountBox({ evaluation: ev({ status: 'jalan', content, doneAt: '2026-11-23T12:22:00.000Z' }) })
    expect(w.findAll('[data-test="point"]')).toHaveLength(2)
    expect(w.text()).toContain('Lagi dievaluasi ulang…')
  })

  it('rerunFailed: isi lama + catatan merah + Coba lagi', async () => {
    const w = await mountBox({ evaluation: ev({ status: 'gagal', content, doneAt: '2026-11-23T12:22:00.000Z', error: { message: 'AI-nya kelamaan jawab.', chargedRp: null } }) })
    expect(w.findAll('[data-test="point"]')).toHaveLength(2)
    expect(w.text()).toContain('Evaluasi ulang gagal')
    expect(w.text()).toContain('AI-nya kelamaan jawab.')
    await w.find('[data-test="rerun"]').trigger('click')
    expect(api.post).toHaveBeenCalled()
  })

  it('AI belum disetel: kotak redup tanpa tombol', async () => {
    const w = await mountBox({ settings: { autoEval: false, enabled: false } })
    expect(w.text()).toContain('AI belum disetel.')
    expect(w.find('[data-test="start"]').exists()).toBe(false)
    expect(w.find('[data-test="auto-switch"]').exists()).toBe(false)
  })

  describe('polling', () => {
    afterEach(() => vi.useRealTimers())
    const visible = () => vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')

    it('berhenti polling pas dicopot', async () => {
      vi.useFakeTimers()
      visible()
      const w = await mountBox({ evaluation: ev({ status: 'jalan' }) })
      api.get.mockClear()
      await vi.advanceTimersByTimeAsync(5000)
      expect(api.get).toHaveBeenCalled()
      w.unmount()
      mounted.pop()
      api.get.mockClear()
      await vi.advanceTimersByTimeAsync(20000)
      expect(api.get).not.toHaveBeenCalled()
    })

    it('dicopot pas muat belum kelar: nggak mulai polling', async () => {
      vi.useFakeTimers()
      visible()
      let release
      const gate = new Promise((r) => { release = r })
      const pinia = createPinia()
      setActivePinia(pinia)
      api = {
        get: vi.fn(async (url) => { await gate; return url === '/ai/settings' ? { autoEval: false, enabled: true } : ev({ status: 'jalan' }) }),
        put: vi.fn(), post: vi.fn(), del: vi.fn(), patch: vi.fn(),
      }
      setAiApi(api)
      setAiToast(vi.fn())
      const w = mount(AiEvalBox, { props: { sessionId: 5, program: 'push', mode: 'summary' }, global: { plugins: [pinia] } })
      w.unmount()
      release()
      await vi.advanceTimersByTimeAsync(0)
      api.get.mockClear()
      await vi.advanceTimersByTimeAsync(20000)
      expect(api.get).not.toHaveBeenCalled()
    })
  })

  it('setelan belum kebaca: nggak nongol "AI belum disetel."', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    api = { get: vi.fn(() => new Promise(() => {})), put: vi.fn(), post: vi.fn(), del: vi.fn(), patch: vi.fn() }
    setAiApi(api)
    setAiToast(vi.fn())
    const w = mount(AiEvalBox, { props: { sessionId: 5, program: 'push', mode: 'summary' }, global: { plugins: [pinia] } })
    mounted.push(w)
    await flushPromises()
    expect(w.text()).not.toContain('AI belum disetel.')
    expect(w.find('[data-test="start"]').exists()).toBe(false)
    expect(w.find('[data-test="eval-box"]').classes()).not.toContain('dim')
  })
})
