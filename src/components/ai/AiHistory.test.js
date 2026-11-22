import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { setAiApi, setAiToast } from '@/stores/ai.js'
import AiHistory from './AiHistory.vue'

const sheet = vi.hoisted(() => ({ present: vi.fn(), onDidDismiss: vi.fn() }))
const sheetCreate = vi.hoisted(() => vi.fn())
const toastCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  actionSheetController: { create: sheetCreate },
  toastController: { create: toastCreate },
}))

const now = new Date().toISOString()
const item = (id, over = {}) => ({ id, context: 'gym', kind: 'chat', sessionId: null, program: null, on: null, title: `Judul ${id}`, messages: 4, updatedAt: now, ...over })

let api
async function mountIt(items) {
  api = { get: vi.fn(async () => ({ items })), post: vi.fn(), put: vi.fn(), patch: vi.fn(), del: vi.fn(async () => null) }
  setAiApi(api)
  setAiToast(vi.fn())
  const pinia = createPinia()
  setActivePinia(pinia)
  const w = mount(AiHistory, { global: { plugins: [pinia] }, attachTo: document.body })
  await flushPromises()
  return w
}
beforeEach(() => {
  sheetCreate.mockReset()
  toastCreate.mockReset()
  sheet.present.mockReset()
  sheet.onDidDismiss.mockReset()
  sheetCreate.mockResolvedValue(sheet)
  toastCreate.mockResolvedValue({ present: vi.fn() })
})

describe('AiHistory', () => {
  it('tombol baru, baris berikon + judul + sub + jam, catatan bawah', async () => {
    const w = await mountIt([item(1), item(2, { kind: 'eval', program: 'push', on: '2026-11-23', title: 'Evaluasi Push 23 Nov' }), item(3, { context: 'badan', messages: 2 })])
    expect(w.text()).toContain('＋ Obrolan baru')
    expect(w.text()).toContain('Hari ini')
    const rows = w.findAll('[data-test="row"]')
    expect(rows).toHaveLength(3)
    expect(rows[0].find('.em').text()).toBe('🏋️')
    expect(rows[1].find('.em').text()).toBe('🤖')
    expect(rows[1].text()).toContain('nempel ke sesi Push')
    expect(rows[2].find('.em').text()).toBe('⚖️')
    expect(rows[0].text()).toContain('Judul 1')
    expect(rows[0].text()).toContain('4 pesan')
    expect(rows[0].text()).toMatch(/\d\d\.\d\d/)
    expect(w.text()).toContain('Judul = pertanyaan pertama lo. Obrolan "Evaluasi …" kebuka juga dari ringkasan sesinya.')
  })

  it('tap baris emit open(id), tombol baru emit new', async () => {
    const w = await mountIt([item(9)])
    await w.find('[data-test="row"]').trigger('click')
    expect(w.emitted('open')[0]).toEqual([9])
    await w.find('[data-test="new"]').trigger('click')
    expect(w.emitted('new')).toHaveLength(1)
  })

  it('kosong: "Belum ada obrolan."', async () => {
    const w = await mountIt([])
    expect(w.find('[data-test="empty"]').text()).toBe('Belum ada obrolan.')
  })

  it('gagal muat: pesan + Coba lagi', async () => {
    const w = await mountIt([])
    api.get.mockRejectedValue(new ApiError('x', 500))
    await w.setProps({})
    const w2 = mount(AiHistory, { global: { plugins: [createPinia()] } })
    await flushPromises()
    expect(w2.find('[data-test="failed"]').text()).toContain('Riwayatnya nggak kebuka.')
    api.get.mockResolvedValue({ items: [item(1)] })
    await w2.find('[data-test="retry"]').trigger('click')
    await flushPromises()
    expect(w2.findAll('[data-test="row"]')).toHaveLength(1)
  })

  it('hapus: action sheet "Hapus obrolan ini?" → hapus + toast', async () => {
    sheet.onDidDismiss.mockResolvedValue({ data: 'delete' })
    const w = await mountIt([item(1), item(2)])
    await w.findAll('[data-test="del"]')[0].trigger('click')
    await flushPromises()
    expect(sheetCreate.mock.calls[0][0].header).toBe('Hapus obrolan ini?')
    expect(api.del).toHaveBeenCalledWith('/ai/conversations/1')
    expect(toastCreate.mock.calls[0][0].message).toBe('Obrolan dihapus')
    expect(w.findAll('[data-test="row"]')).toHaveLength(1)
  })

  it('batal: nggak ada yang kehapus', async () => {
    sheet.onDidDismiss.mockResolvedValue({ data: undefined, role: 'cancel' })
    const w = await mountIt([item(1)])
    await w.find('[data-test="del"]').trigger('click')
    await flushPromises()
    expect(api.del).not.toHaveBeenCalled()
  })

  it('hapus gagal: toast error, baris tetep ada, nggak ada toast "dihapus"', async () => {
    sheet.onDidDismiss.mockResolvedValue({ data: 'delete' })
    const w = await mountIt([item(1)])
    api.del.mockRejectedValue(new ApiError('Obrolannya nggak ketemu.', 404))
    await w.find('[data-test="del"]').trigger('click')
    await flushPromises()
    expect(w.findAll('[data-test="row"]')).toHaveLength(1)
    const msgs = toastCreate.mock.calls.map((c) => c[0].message)
    expect(msgs).not.toContain('Obrolan dihapus')
  })

  it('geser kiri buka tombol Hapus, tap baris cuma nutup lagi', async () => {
    const w = await mountIt([item(1)])
    const wrap = w.find('[data-test="row-wrap"]')
    const touch = (x, y = 0) => ({ touches: [{ clientX: x, clientY: y }] })
    await wrap.trigger('touchstart', touch(200))
    await wrap.trigger('touchmove', touch(100))
    await wrap.trigger('touchend')
    expect(w.find('[data-test="row"]').attributes('style')).toContain('translateX(-84px)')
    await w.find('[data-test="row"]').trigger('click')
    expect(w.emitted('open')).toBeUndefined()
    expect(w.find('[data-test="row"]').attributes('style') ?? '').not.toContain('-84')
  })

  it('sentuhan dibatalin (touchcancel): baris balik ke posisi awal, nggak nyangkut setengah kebuka', async () => {
    const w = await mountIt([item(1)])
    const wrap = w.find('[data-test="row-wrap"]')
    const touch = (x, y = 0) => ({ touches: [{ clientX: x, clientY: y }] })
    await wrap.trigger('touchstart', touch(200))
    await wrap.trigger('touchmove', touch(150))
    expect(w.find('[data-test="row"]').attributes('style')).toContain('translateX(-50px)')
    await wrap.trigger('touchcancel')
    const style = w.find('[data-test="row"]').attributes('style') ?? ''
    expect(style).not.toContain('translateX')
    expect(style).not.toContain('transition: none')
  })
})
