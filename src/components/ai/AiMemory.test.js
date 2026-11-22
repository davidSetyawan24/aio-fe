import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { wibNow } from '@/lib/home.js'
import { setAiApi, setAiToast } from '@/stores/ai.js'
import AiMemory from './AiMemory.vue'

const toastCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), toastController: { create: toastCreate } }))

const ym = wibNow().date.slice(0, 7)
const mems = [
  { id: 1, text: 'lutut kanan cedera', source: 'ai', createdAt: '2026-11-23T03:00:00Z' },
  { id: 2, text: 'lagi cutting', source: 'manual', createdAt: '2026-11-21T03:00:00Z' },
]
const usage = { kursIdr: 18260, months: [{ month: ym, rupiah: 23400, evaluations: 18, messages: 64 }, { month: '2026-10', rupiah: 61200, evaluations: 21, messages: 88 }] }

let api
async function mountIt({ memories = mems, use = usage } = {}) {
  api = {
    get: vi.fn(async (url) => (url === '/ai/memories' ? { items: memories } : use)),
    post: vi.fn(async (_u, b) => ({ id: 9, text: b.text, source: 'manual', createdAt: '2026-11-22T03:00:00Z' })),
    put: vi.fn(), patch: vi.fn(), del: vi.fn(async () => null),
  }
  setAiApi(api)
  setAiToast(vi.fn())
  const pinia = createPinia()
  setActivePinia(pinia)
  const w = mount(AiMemory, { global: { plugins: [pinia] }, attachTo: document.body })
  await flushPromises()
  return w
}
const toasts = () => toastCreate.mock.calls.map((c) => c[0].message)
beforeEach(() => {
  toastCreate.mockReset()
  toastCreate.mockResolvedValue({ present: vi.fn() })
})

describe('AiMemory', () => {
  it('ingatan: jumlah, baris + sumber + tanggal, catatan bawah', async () => {
    const w = await mountIt()
    expect(w.text()).toContain('Ingatan AI')
    expect(w.find('[data-test="count"]').text()).toBe('2 catatan')
    const rows = w.findAll('[data-test="mem"]')
    expect(rows[0].text()).toContain('lutut kanan cedera')
    expect(rows[0].text()).toContain('dari obrolan · 23 Nov')
    expect(rows[1].text()).toContain('lo tambahin sendiri · 21 Nov')
    expect(w.find('[data-test="mem-input"]').attributes('placeholder')).toBe('Tambah sendiri, mis. lutut kanan cedera')
    expect(w.text()).toContain('AI nyatet sendiri hal penting dari obrolan biar inget di obrolan berikutnya. Yang nggak bener, hapus aja.')
  })

  it('kosong: "Belum ada catatan."', async () => {
    const w = await mountIt({ memories: [] })
    expect(w.find('[data-test="mem-empty"]').text()).toBe('Belum ada catatan.')
    expect(w.find('[data-test="count"]').text()).toBe('0 catatan')
  })

  it('✕ langsung hapus + toast', async () => {
    const w = await mountIt()
    await w.findAll('[data-test="mem-del"]')[0].trigger('click')
    await flushPromises()
    expect(api.del).toHaveBeenCalledWith('/ai/memories/1')
    expect(w.findAll('[data-test="mem"]')).toHaveLength(1)
    expect(toasts()).toContain('Catatan dihapus')
  })

  it('✕ gagal: catatan tetep ada, nggak ada toast sukses', async () => {
    const w = await mountIt()
    api.del.mockRejectedValue(new ApiError('Server error', 500))
    await w.findAll('[data-test="mem-del"]')[0].trigger('click')
    await flushPromises()
    expect(w.findAll('[data-test="mem"]')).toHaveLength(2)
    expect(toasts()).not.toContain('Catatan dihapus')
  })

  it('tambah (submit / Enter): masuk paling atas, kolom kosong lagi, toast', async () => {
    const w = await mountIt()
    await w.find('[data-test="mem-input"]').setValue('  alergi udang ')
    await w.find('[data-test="mem-form"]').trigger('submit')
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/ai/memories', { text: 'alergi udang' })
    expect(w.findAll('[data-test="mem"]')[0].text()).toContain('alergi udang')
    expect(w.find('[data-test="mem-input"]').element.value).toBe('')
    expect(toasts()).toContain('Kecatet ✓')
  })

  it('422 tampil di bawah kolom, teks tetep, nggak di-toast', async () => {
    const w = await mountIt()
    api.post.mockRejectedValue(new ApiError('Catatannya kosong.', 422))
    await w.find('[data-test="mem-input"]').setValue('x')
    await w.find('[data-test="mem-form"]').trigger('submit')
    await flushPromises()
    expect(w.find('[data-test="mem-error"]').text()).toBe('Catatannya kosong.')
    expect(w.find('[data-test="mem-input"]').element.value).toBe('x')
    expect(toasts()).toEqual([])
  })

  it('pemakaian: bulan ini + bulan sebelumnya + kurs dari data', async () => {
    const w = await mountIt()
    expect(w.find('.usage .k').text()).toMatch(/^Bulan ini · [A-Z][a-z]+/)
    expect(w.find('[data-test="usage-big"]').text()).toBe('Rp23.400')
    expect(w.find('[data-test="usage-sub"]').text()).toBe('18 evaluasi · 64 pesan chat')
    const rows = w.findAll('[data-test="usage-row"]')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('Oktober')
    expect(rows[0].text()).toContain('Rp61.200 · 21 evaluasi · 88 pesan')
    expect(w.find('[data-test="kurs"]').text()).toBe('Hitungan AIO: token × harga Mistral Large 4 × kurs Rp18.260/$. Bisa beda dikit dari tagihan asli Mistral.')
  })

  it('bulan ini belum ada datanya: Rp0, 0 evaluasi', async () => {
    const w = await mountIt({ use: { kursIdr: 18260, months: [] } })
    expect(w.find('[data-test="usage-big"]').text()).toBe('Rp0')
    expect(w.find('[data-test="usage-sub"]').text()).toBe('0 evaluasi · 0 pesan chat')
  })

  it('gagal muat: pesan + Coba lagi, nggak ada error nyasar', async () => {
    api = null
    const bad = { get: vi.fn(async () => { throw new ApiError('x', 500) }), post: vi.fn(), put: vi.fn(), patch: vi.fn(), del: vi.fn() }
    setAiApi(bad)
    setAiToast(vi.fn())
    const pinia = createPinia()
    setActivePinia(pinia)
    const w = mount(AiMemory, { global: { plugins: [pinia] } })
    await flushPromises()
    expect(w.find('[data-test="mem-failed"]').text()).toContain('Ingatannya nggak kebuka.')
    expect(w.find('[data-test="use-failed"]').text()).toContain('Pemakaiannya nggak kebuka.')
    bad.get.mockImplementation(async (url) => (url === '/ai/memories' ? { items: mems } : usage))
    await w.find('[data-test="mem-retry"]').trigger('click')
    await w.find('[data-test="use-retry"]').trigger('click')
    await flushPromises()
    expect(w.findAll('[data-test="mem"]')).toHaveLength(2)
    expect(w.find('[data-test="usage-big"]').text()).toBe('Rp23.400')
  })
})
