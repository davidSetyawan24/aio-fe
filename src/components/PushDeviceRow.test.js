import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { usePushStore } from '@/stores/push.js'
import PushDeviceRow from './PushDeviceRow.vue'

const toastCreate = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({ ...(await importOriginal()), toastController: { create: toastCreate } }))

let push
function mountRow(state, kind = 'iPhone') {
  const pinia = createPinia()
  setActivePinia(pinia)
  push = usePushStore()
  push.state = state
  for (const a of ['init', 'enable', 'disable', 'sendTest', 'recheck']) vi.spyOn(push, a).mockResolvedValue(true)
  return mount(PushDeviceRow, { props: { kind }, global: { plugins: [pinia] } })
}
const toastMsg = () => toastCreate.mock.calls.at(-1)?.[0]?.message

beforeEach(() => toastCreate.mockReset().mockResolvedValue({ present: vi.fn() }))

describe('PushDeviceRow', () => {
  it('belum nyala → tombol Nyalain notif → nyala + toast', async () => {
    const w = mountRow('off')
    expect(w.text()).toContain('Notif di iPhone ini')
    expect(w.text()).toContain('Belum nyala. Pengingat cuma masuk lonceng di dalem app.')
    const btn = w.find('[data-test="push-enable"]')
    expect(btn.text()).toContain('Nyalain notif')
    await btn.trigger('click')
    await flushPromises()
    expect(push.enable).toHaveBeenCalledTimes(1)
    expect(toastMsg()).toBe('Notif nyala di iPhone ini ✓')
  })

  it('nyalain gagal → pesan error, tanpa toast sukses', async () => {
    const w = mountRow('off')
    push.enable.mockRejectedValueOnce(new ApiError('Nggak bisa nyambung ke server.', 0))
    await w.find('[data-test="push-enable"]').trigger('click')
    await flushPromises()
    expect(toastMsg()).toBe('Nggak bisa nyambung ke server.')
  })

  it('lagi minta izin → tombol Nunggu izin nggak bisa dipencet', () => {
    const w = mountRow('asking')
    expect(w.text()).toContain('Pilih Allow / Izinkan di jendela yang muncul…')
    expect(w.find('[data-test="push-enable"]').text()).toContain('Nunggu izin')
    expect(w.find('[data-test="push-enable"]').attributes('disabled')).toBeDefined()
  })

  it('nyala → saklar matiin + kirim notif tes', async () => {
    const w = mountRow('on', 'iPad')
    expect(w.text()).toContain('Notif di iPad ini')
    expect(w.text()).toContain('Nyala ✓ · notif nongol walau app ditutup')
    const toggle = w.find('[data-test="push-toggle"]')
    expect(toggle.attributes('aria-checked')).toBe('true')
    await w.find('[data-test="push-test"]').trigger('click')
    await flushPromises()
    expect(push.sendTest).toHaveBeenCalled()
    expect(toastMsg()).toBe('Notif tes terkirim. Cek layar HP lo 👀')
    await toggle.trigger('click')
    await flushPromises()
    expect(push.disable).toHaveBeenCalled()
    expect(toastMsg()).toBe('Notif di iPad ini dimatiin')
  })

  it('dibuka dari Safari biasa → 3 langkah Home Screen', () => {
    const w = mountRow('safari')
    expect(w.text()).toContain('iPhone cuma ngizinin notif dari AIO yang dibuka lewat ikon di Home Screen.')
    expect(w.findAll('ol li')).toHaveLength(3)
    expect(w.text()).toContain('Tambahkan ke Layar Utama')
    expect(w.find('button').exists()).toBe(false)
  })

  it('izin keblok → 3 langkah Pengaturan + Cek lagi', async () => {
    const w = mountRow('blocked')
    expect(w.text()).toContain('Izinnya keblok di iPhone.')
    expect(w.findAll('ol li')).toHaveLength(3)
    expect(w.text()).toContain('Izinkan Notifikasi')
    await w.find('[data-test="push-recheck"]').trigger('click')
    expect(push.recheck).toHaveBeenCalled()
  })

  it('nggak bisa / server belum disetel → cuma keterangan', () => {
    let w = mountRow('nosupport', 'Android')
    expect(w.text()).toContain('Notif di device ini')
    expect(w.text()).toContain('Browser/iOS di device ini belum bisa notif di layar (iPhone minimal iOS 16.4). Pengingat tetep masuk lonceng.')
    expect(w.find('button').exists()).toBe(false)
    w = mountRow('noserver')
    expect(w.text()).toContain('Notif di layar belum disetel di server. Pengingat tetep masuk lonceng.')
    expect(w.find('button').exists()).toBe(false)
  })

  it('pertama kebuka (loading) → ngecek device ini', () => {
    mountRow('loading')
    expect(push.init).toHaveBeenCalledTimes(1)
  })

  it('teks ikut device: iPad keblok/safari, Mac pakai pengaturan situs browser', () => {
    let w = mountRow('blocked', 'iPad')
    expect(w.text()).toContain('Izinnya keblok di iPad.')
    expect(w.text()).toContain('Pengaturan')
    w = mountRow('safari', 'iPad')
    expect(w.text()).toContain('iPad cuma ngizinin notif dari AIO yang dibuka lewat ikon di Home Screen.')
    w = mountRow('blocked', 'Mac')
    expect(w.text()).toContain('Izinnya keblok di browser ini.')
    expect(w.text()).toContain('ikon gembok')
    expect(w.findAll('ol li')).toHaveLength(3)
  })
})
