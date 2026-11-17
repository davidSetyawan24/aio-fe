import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { setPersonalApi, usePersonalStore } from '@/stores/personal.js'
import PersonalDocDetail from './PersonalDocDetail.vue'

const toastCreate = vi.hoisted(() => vi.fn())
const sheetCreate = vi.hoisted(() => vi.fn())
const copyMock = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  toastController: { create: toastCreate },
  actionSheetController: { create: sheetCreate },
}))
vi.mock('@/lib/clipboard.js', () => ({ copyToClipboard: copyMock }))

const rem = (n, unit) => ({ n, unit, time: '09:00' })
const date = (over) => ({ key: 'expiry', on: '2027-07-24', reminders: [rem(1, 'month'), rem(1, 'week')], state: 'ok', daysLeft: 250, lateDays: 0, ...over })
const DOCS = [
  { id: 1, type: 'ktp', label: null, values: ['3275012407970001'], dates: [] },
  { id: 6, type: 'simc', label: null, values: ['970787654321'], dates: [date({ on: '2026-12-05' })] },
  { id: 9, type: 'stnk', label: 'Motor', values: ['B 1234 XYZ', 'MH1JM', 'JM123'], dates: [date({ key: 'tax', on: '2026-11-15', state: 'soon', daysLeft: 0 }), date({ key: 'stnk', on: '2030-01-01', daysLeft: 1200 })] },
]

let api, store, sheet
function mountDetail(id) {
  api = { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn(async () => null) }
  setPersonalApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  store = usePersonalStore()
  store.documents = DOCS.map((d) => ({ ...d }))
  return { w: mount(PersonalDocDetail, { props: { docId: id }, global: { plugins: [pinia] }, attachTo: document.body }) }
}

beforeEach(() => {
  toastCreate.mockReset().mockResolvedValue({ present: vi.fn() })
  copyMock.mockReset().mockResolvedValue(true)
  sheet = { present: vi.fn(), onDidDismiss: vi.fn(async () => ({ data: 'delete' })) }
  sheetCreate.mockReset().mockResolvedValue(sheet)
})

describe('PersonalDocDetail', () => {
  it('shows a copy row per number, with a plate copied as-is', async () => {
    const { w } = mountDetail(9)
    const rows = w.findAll('[data-test="copy-row"]')
    expect(rows).toHaveLength(3)
    expect(rows[0].text()).toContain('Plat nomor')
    await rows[0].trigger('click')
    await flushPromises()
    expect(copyMock).toHaveBeenCalledWith('B 1234 XYZ')
  })

  it('without a back button (PC panel) Ubah sits on its own row on the left, away from the close button', () => {
    const { w } = mountDetail(1)
    expect(w.find('.pf-toprow').classes()).toContain('pd-solo')
    const withBack = mount(PersonalDocDetail, { props: { docId: 1 }, slots: { back: '<button class="pf-back">Data Pribadi</button>' }, attachTo: document.body })
    expect(withBack.find('.pf-toprow').classes()).not.toContain('pd-solo')
    withBack.unmount()
  })

  it('says "Berlaku seumur hidup" for a KTP only once', () => {
    const { w } = mountDetail(1)
    expect(w.text().split('Berlaku seumur hidup')).toHaveLength(2)
  })

  it('a near date without reminders reads in days, not "1 bulan lagi"', () => {
    const { w } = mountDetail(6)
    store.documents = store.documents.map((d) => (d.id === 6 ? { ...d, dates: [date({ on: '2026-11-23', reminders: [], daysLeft: 5 })] } : d))
    return flushPromises().then(() => {
      expect(w.text()).toContain('5 hari lagi')
      expect(w.text()).not.toContain('1 bulan lagi')
    })
  })

  it('shows dates with state chips and reminder chips', () => {
    const { w } = mountDetail(6)
    expect(w.text()).toContain('Berlaku s.d.')
    expect(w.text()).toContain('5 Des 2026')
    expect(w.text()).toContain('8 bulan lagi')
    expect(w.findAll('[data-test="rem"]').map((r) => r.text())).toEqual(['1 bulan sebelum · 09.00', '1 minggu sebelum · 09.00'])
  })

  it('says a KTP lasts for life and has no dates', () => {
    const { w } = mountDetail(1)
    expect(w.text()).toContain('Berlaku seumur hidup')
    expect(w.find('[data-test="date-card"]').exists()).toBe(false)
  })

  it('pays STNK tax and toasts the new date', async () => {
    const { w } = mountDetail(9)
    api.post.mockResolvedValue({ document: { ...DOCS[2], dates: [date({ key: 'tax', on: '2027-11-15', daysLeft: 362 }), DOCS[2].dates[1]] } })
    await w.find('[data-test="pay-tax"]').trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/personal/documents/9/tax-paid')
    expect(toastCreate.mock.calls.at(-1)[0].message).toBe('Pajak Motor beres ✓ · lanjut s.d. 15 Nov 2027')
  })

  it('renews a date through the small box', async () => {
    const { w } = mountDetail(6)
    expect(w.find('[data-test="pay-tax"]').exists()).toBe(false)
    await w.find('[data-test="renew"]').trigger('click')
    await w.find('[data-test="renew-date"]').setValue('2031-12-05')
    api.put.mockResolvedValue({ document: { ...DOCS[1], dates: [date({ on: '2031-12-05', daysLeft: 1800 })] } })
    await w.find('[data-test="renew-save"]').trigger('click')
    await flushPromises()
    expect(api.put).toHaveBeenCalledWith('/personal/documents/6/dates/expiry', { on: '2031-12-05' })
    expect(toastCreate.mock.calls.at(-1)[0].message).toBe('SIM C udah diperpanjang ✓')
    expect(w.find('[data-test="renew-date"]').exists()).toBe(false)
  })

  it('does not renew without a date', async () => {
    const { w } = mountDetail(6)
    await w.find('[data-test="renew"]').trigger('click')
    await w.find('[data-test="renew-date"]').setValue('')
    await w.find('[data-test="renew-save"]').trigger('click')
    expect(api.put).not.toHaveBeenCalled()
    expect(w.find('[data-test="detail-error"]').text()).toBe('Isi tanggal barunya dulu.')
  })

  it('confirms before deleting, then removes and says done', async () => {
    const { w } = mountDetail(6)
    await w.find('[data-test="delete"]').trigger('click')
    await w.find('[data-test="delete"]').trigger('click')
    await flushPromises()
    expect(sheetCreate).toHaveBeenCalledTimes(1)
    expect(sheetCreate.mock.calls[0][0].header).toBe('Hapus SIM C?')
    expect(api.del).toHaveBeenCalledWith('/personal/documents/6')
    expect(store.documents.find((d) => d.id === 6)).toBeUndefined()
    expect(w.emitted('done')[0]).toEqual(['SIM C dihapus'])
  })

  it('does not delete when the sheet is cancelled', async () => {
    sheet.onDidDismiss.mockResolvedValue({ data: undefined })
    const { w } = mountDetail(6)
    await w.find('[data-test="delete"]').trigger('click')
    await flushPromises()
    expect(api.del).not.toHaveBeenCalled()
  })

  it('emits edit', async () => {
    const { w } = mountDetail(6)
    await w.find('[data-test="edit"]').trigger('click')
    expect(w.emitted('edit')).toHaveLength(1)
  })

  it('says so when the document is gone', () => {
    const { w } = mountDetail(404)
    expect(w.text()).toContain('Dokumennya nggak ketemu')
  })
})
