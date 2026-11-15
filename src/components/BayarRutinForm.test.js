import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { setBayarRutinApi, useBayarRutinStore } from '@/stores/bayarRutin.js'
import { setWalletApi } from '@/stores/wallet.js'
import BayarRutinForm from './BayarRutinForm.vue'

const sheetCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  actionSheetController: { create: sheetCreate },
}))

const jago = { id: 10, kind: 'debit', bank: 'Jago', name: 'Jago Fixed Cost', favorite: true }
const cash = { id: 1, kind: 'cash', bank: null, name: 'Cash', favorite: false }
const old = { id: 99, name: 'CC Lama', kind: 'cc', bank: 'BCA', archived: true }
const motor = { id: 2, name: 'Cicilan motor', emoji: '🛵', tint: '#DCEBFF', amount: 1250000, freq: 'monthly', day: 20, month: null,
  reminders: [{ offset: 3, time: '09:00' }], startMonth: '2026-11', currentPaid: false, source: old }

let api
const mounted = []
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

async function mountForm(props = {}) {
  api = {
    get: vi.fn(async () => ({ month: '2026-11', today: '2026-11-15', firstMonth: '2026-11', summary: null, rows: [], bySource: [], bills: [motor] })),
    post: vi.fn(async (_url, body) => ({ bill: { id: 5, ...body } })),
    patch: vi.fn(async (_url, body) => ({ bill: { ...motor, ...body } })),
    del: vi.fn(async () => null),
  }
  setBayarRutinApi(api)
  setWalletApi({ get: vi.fn(async () => ({ sources: [cash, jago] })) })
  const pinia = createPinia()
  setActivePinia(pinia)
  await useBayarRutinStore().load()
  const w = mount(BayarRutinForm, { props: { billId: null, ...props }, global: { plugins: [pinia], stubs: { teleport: true } }, attachTo: document.body })
  mounted.push(w)
  await flushPromises()
  return w
}
const fill = async (w, { amount = '186000', name = 'Netflix', day = 20 } = {}) => {
  await w.find('[data-test="amount"]').setValue(amount)
  await w.find('[data-test="name"]').setValue(name)
  if (day) await w.find(`[data-day="${day}"]`).trigger('click')
}
const save = async (w) => {
  await w.find('form').trigger('submit')
  await flushPromises()
}
const chips = (w) => w.findAll('[data-test="rem-chip"]').map((c) => c.text())

describe('BayarRutinForm', () => {
  it('formats the amount and mirrors name, amount and schedule in the preview', async () => {
    const w = await mountForm()
    await fill(w)
    expect(w.find('[data-test="amount"]').element.value).toBe('186.000')
    expect(w.find('[data-test="preview"]').text()).toContain('Netflix')
    expect(w.find('[data-test="preview"]').text()).toContain('Rp186.000 · tiap bulan tgl 20')
  })

  it('says what is missing in Indonesian before saving', async () => {
    const w = await mountForm()
    await save(w)
    expect(w.find('[role="alert"]').text()).toBe('Isi nominalnya dulu.')
    await w.find('[data-test="amount"]').setValue('186000')
    await save(w)
    expect(w.find('[role="alert"]').text()).toBe('Isi namanya dulu.')
    await w.find('[data-test="name"]').setValue('Netflix')
    await save(w)
    expect(w.find('[role="alert"]').text()).toBe('Pilih tanggal jatuh temponya dulu.')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('shows the month grid for yearly bills and a hint for days 29–31', async () => {
    const w = await mountForm()
    expect(w.findAll('[data-month]')).toHaveLength(0)
    await w.find('[data-freq="yearly"]').trigger('click')
    expect(w.findAll('[data-month]')).toHaveLength(12)
    await w.find('[data-month="3"]').trigger('click')
    await w.find('[data-day="31"]').trigger('click')
    expect(w.text()).toContain('Bulan yang nggak sampai tgl 31 → jatuh tempo di tanggal terakhir bulan itu.')
    expect(w.find('[data-test="preview"]').text()).toContain('tiap tahun 31 Mar')
  })

  it('asks whether this month is paid when the due date already passed, and sends the answer', async () => {
    const w = await mountForm()
    await fill(w, { day: 20 })
    expect(w.find('[data-test="ask"]').exists()).toBe(false)
    await w.find('[data-day="12"]').trigger('click')
    expect(w.find('[data-test="ask"]').text()).toContain('Yang 12 Nov udah lunas?')
    await save(w)
    expect(w.find('[role="alert"]').text()).toBe('Jawab dulu: udah lunas atau belum?')
    await w.find('[data-paid="yes"]').trigger('click')
    await save(w)
    expect(api.post).toHaveBeenCalledWith('/recurring-bills', expect.objectContaining({ day: 12, paidCurrent: true, amount: 186000, name: 'Netflix', freq: 'monthly', sourceId: 10 }))
    expect(w.emitted('done')[0]).toEqual(['Netflix ditambahin 🔁'])
  })

  it('starts with H-3 and Hari H at 09.00 and lets reminders be added up to three', async () => {
    const w = await mountForm()
    expect(chips(w)).toEqual(['H-3 · 09.00', 'Hari H · 09.00'])
    await w.find('[data-test="rem-add"]').trigger('click')
    await w.find('[data-pd="1"]').trigger('click')
    await w.find('[data-ph="12:00"]').trigger('click')
    await w.find('[data-test="rem-use"]').trigger('click')
    expect(chips(w)).toEqual(['H-3 · 09.00', 'H-1 · 12.00', 'Hari H · 09.00'])
    expect(w.find('[data-test="rem-add"]').exists()).toBe(false)
    await w.findAll('[data-test="rem-chip"]')[0].trigger('click')
    expect(chips(w)).toEqual(['H-1 · 12.00', 'Hari H · 09.00'])
  })

  it('refuses a reminder further than H-30 or a duplicate', async () => {
    const w = await mountForm()
    await w.find('[data-test="rem-add"]').trigger('click')
    await w.find('[data-test="rem-custom"]').setValue('31')
    await w.find('[data-test="rem-use"]').trigger('click')
    expect(w.find('[data-test="rem-error"]').text()).toBe('Maksimal H-30 ya.')
    await w.find('[data-test="rem-custom"]').setValue('')
    await w.find('[data-pd="3"]').trigger('click')
    await w.find('[data-test="rem-use"]').trigger('click')
    expect(w.find('[data-test="rem-error"]').text()).toBe('Pengingat itu udah ada.')
    expect(chips(w)).toHaveLength(2)
  })

  it('picks the first starred account by default', async () => {
    const w = await mountForm()
    expect(w.find('[data-src="10"]').classes()).toContain('on')
  })

  it('saves only once on a double tap', async () => {
    const w = await mountForm()
    await fill(w)
    w.find('form').trigger('submit')
    w.find('form').trigger('submit')
    await flushPromises()
    expect(api.post).toHaveBeenCalledTimes(1)
  })

  it('shows the server message when saving fails', async () => {
    const w = await mountForm()
    await fill(w)
    api.post.mockRejectedValueOnce(Object.assign(new Error('Data tidak valid.'), { fields: { sourceId: ['Rekeningnya nggak ketemu.'] } }))
    await save(w)
    expect(w.find('[role="alert"]').text()).toBe('Rekeningnya nggak ketemu.')
  })

  it('shows the "udah lunas?" box when the server says the date already passed (the day changed while the page was open)', async () => {
    const w = await mountForm()
    await fill(w, { day: 15 })
    expect(w.find('[data-test="ask"]').exists()).toBe(false)
    api.post.mockRejectedValueOnce(Object.assign(new Error('Data tidak valid.'), { fields: { paidCurrent: ['Jawab dulu: udah lunas atau belum?'] } }))
    api.get.mockResolvedValueOnce({ month: '2026-11', today: '2026-11-16', firstMonth: '2026-11', summary: null, rows: [], bySource: [], bills: [motor] })
    await save(w)
    expect(w.find('[data-test="ask"]').text()).toContain('Yang 15 Nov udah lunas?')
    expect(w.find('[data-test="amount"]').element.value).toBe('186.000')
  })

  describe('editing', () => {
    it('fills the form, keeps an archived account and sends only the bill fields', async () => {
      const w = await mountForm({ billId: 2 })
      expect(w.find('[data-test="name"]').element.value).toBe('Cicilan motor')
      expect(w.find('[data-test="amount"]').element.value).toBe('1.250.000')
      expect(w.find('[data-src="99"]').classes()).toContain('on')
      expect(w.find('[data-src="99"]').text()).toContain('CC Lama')
      expect(chips(w)).toEqual(['H-3 · 09.00'])
      expect(w.find('[data-test="ask"]').exists()).toBe(false)
      await w.find('[data-test="amount"]').setValue('1300000')
      await save(w)
      expect(api.patch).toHaveBeenCalledWith('/recurring-bills/2', expect.objectContaining({ amount: 1300000, sourceId: 99 }))
      expect(api.patch.mock.calls[0][1]).not.toHaveProperty('paidCurrent')
      expect(w.emitted('done')[0]).toEqual(['Disimpen.'])
    })

    it('keeps what was typed when the list reloads in the background', async () => {
      const w = await mountForm({ billId: 2 })
      await w.find('[data-test="amount"]').setValue('1300000')
      await w.find('[data-test="name"]').setValue('Motor baru')
      api.get.mockResolvedValueOnce({ month: '2026-11', today: '2026-11-15', firstMonth: '2026-11', summary: null, rows: [], bySource: [], bills: [{ ...motor }] })
      await useBayarRutinStore().load()
      await flushPromises()
      expect(w.find('[data-test="amount"]').element.value).toBe('1.300.000')
      expect(w.find('[data-test="name"]').element.value).toBe('Motor baru')
    })

    it('asks again only when the schedule moves to a day that already passed', async () => {
      const w = await mountForm({ billId: 2 })
      await w.find('[data-day="12"]').trigger('click')
      expect(w.find('[data-test="ask"]').exists()).toBe(true)
      await w.find('[data-paid="no"]').trigger('click')
      await save(w)
      expect(api.patch).toHaveBeenCalledWith('/recurring-bills/2', expect.objectContaining({ day: 12, paidCurrent: false }))
    })

    it('deletes after confirming', async () => {
      sheetCreate.mockResolvedValueOnce({ present: vi.fn(), onDidDismiss: async () => ({ data: 'delete' }) })
      const w = await mountForm({ billId: 2 })
      await w.find('[data-test="delete"]').trigger('click')
      await flushPromises()
      expect(api.del).toHaveBeenCalledWith('/recurring-bills/2')
      expect(w.emitted('done')[0]).toEqual(['Cicilan motor dihapus.'])
    })

    it('keeps it when the confirmation is cancelled', async () => {
      sheetCreate.mockResolvedValueOnce({ present: vi.fn(), onDidDismiss: async () => ({ data: undefined }) })
      const w = await mountForm({ billId: 2 })
      await w.find('[data-test="delete"]').trigger('click')
      await flushPromises()
      expect(api.del).not.toHaveBeenCalled()
    })
  })
})
