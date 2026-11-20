import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { bodySummary } from '@/lib/badan.js'
import { setBadanApi, useBadanStore } from '@/stores/badan.js'
import BadanTargetSheet from './BadanTargetSheet.vue'

const toast = vi.hoisted(() => vi.fn())
vi.mock('@/lib/personalForm.js', async (importOriginal) => ({ ...(await importOriginal()), showToast: toast }))

const target = { arah: 'recomp', fat: 20, muscle: 55, weightMin: 73, weightMax: 76, startedOn: '2026-11-01' }
const summary = { fat: 25.6, muscle: 52.85, weight: 74.9 }

const DAYS = ['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']
const DAVID_ROWS = DAYS.map((d, i) => ({ id: i + 1, weighedOn: d, weighedAt: '06:40', weight: 74.9, fat: 25.6, muscle: null, bmr: 1650 }))
const DAVID_ACT = { workType: 'stand_walk', workHours: 10, workDays: 7, gymPerWeek: 5, gymMinutes: 75, otherSport: null, notes: null, level: 'active', levelManual: false }
const DAVID_TARGET = { arah: 'cutting', pace: 'normal', fat: 20, muscle: 55, weightMin: 65, weightMax: 69, startedOn: '2026-11-14' }

let api
let mounted
let host
function make(props = {}, { rows = [], activity = null } = {}) {
  host = document.createElement('ion-app')
  document.body.appendChild(host)
  api = { get: vi.fn(async () => ({ weighings: [], target: null })), post: vi.fn(), patch: vi.fn(), put: vi.fn(async () => ({})), del: vi.fn(async () => ({})) }
  setBadanApi(api)
  setActivePinia(createPinia())
  const store = useBadanStore()
  store.weighings = rows
  store.activity = activity
  mounted = mount(BadanTargetSheet, { props: { open: true, target, summary, ...props }, attachTo: document.body })
  return mounted
}
const david = () => make({ target: DAVID_TARGET, summary: bodySummary(DAVID_ROWS, DAVID_TARGET) }, { rows: DAVID_ROWS, activity: DAVID_ACT })
const q = (sel) => document.querySelector(sel)
const text = (sel) => q(sel)?.textContent.replace(/\s+/g, ' ').trim()
const tap = async (sel) => {
  q(sel).click()
  await flushPromises()
}
const type = async (sel, v) => {
  const el = q(sel)
  el.value = v
  el.dispatchEvent(new Event('input'))
  await flushPromises()
}
const submit = async () => {
  q('[data-test="target-form"]').dispatchEvent(new Event('submit', { cancelable: true }))
  await flushPromises()
}

beforeEach(() => toast.mockReset())
afterEach(() => {
  mounted?.unmount()
  host?.remove()
})

describe('BadanTargetSheet', () => {
  it('shows the existing target, "sekarang" averages and delete link', () => {
    make()
    expect(q('[data-test="t-fat"]').value).toBe('20')
    expect(q('[data-test="t-min"]').value).toBe('73')
    expect(document.body.textContent).toContain('sekarang 25,6%')
    expect(document.body.textContent).toContain('sekarang 74,9 kg')
    expect(q('[data-test="target-delete"]')).not.toBeNull()
  })

  it('saves decimal-comma numbers as numbers', async () => {
    make({ target: null })
    q('[data-arah="cutting"]').click()
    await type('[data-test="t-fat"]', '19,5')
    await type('[data-test="t-min"]', '73')
    await type('[data-test="t-max"]', '76,5')
    await submit()
    expect(api.put).toHaveBeenCalledTimes(1)
    expect(api.put).toHaveBeenCalledWith('/body/target', { arah: 'cutting', pace: 'normal', fat: 19.5, muscle: null, weightMin: 73, weightMax: 76.5 })
    expect(toast).toHaveBeenCalledWith('Target kesimpen ✓')
    expect(mounted.emitted('close')).toBeTruthy()
  })

  it('refuses only one side of the weight range', async () => {
    make({ target: null })
    await type('[data-test="t-min"]', '73')
    await submit()
    expect(q('[data-test="err-max"]').textContent).toBe('Isi dua-duanya atau kosongin dua-duanya.')
    expect(api.put).not.toHaveBeenCalled()
  })

  it('refuses min >= max and out of range', async () => {
    make({ target: null })
    await type('[data-test="t-min"]', '80')
    await type('[data-test="t-max"]', '76')
    await type('[data-test="t-fat"]', '90')
    await submit()
    expect(q('[data-test="err-max"]').textContent).toBe('Paling ringan harus di bawah paling berat.')
    expect(q('[data-test="err-fat"]').textContent).toContain('di luar rentang wajar')
    expect(api.put).not.toHaveBeenCalled()
  })

  it('shows the server 422 message per field and stays open', async () => {
    make()
    api.put.mockRejectedValue(new ApiError('Ada yang salah.', 422, { weightMax: ['Pesan dari server.'] }))
    await submit()
    expect(q('[data-test="err-max"]').textContent).toBe('Pesan dari server.')
    expect(mounted.emitted('close')).toBeFalsy()
    expect(api.get).toHaveBeenCalledWith('/body')
  })

  it('deletes the target directly', async () => {
    make()
    q('[data-test="target-delete"]').click()
    await flushPromises()
    expect(api.del).toHaveBeenCalledWith('/body/target')
    expect(toast).toHaveBeenCalledWith('Target dihapus')
    expect(mounted.emitted('close')).toBeTruthy()
  })

  it('hides delete without a target', () => {
    make({ target: null })
    expect(q('[data-test="target-delete"]')).toBeNull()
  })

  it('shows the arah-change hint only when the arah differs from the saved one', async () => {
    make()
    expect(q('[data-test="arah-change"]')).toBeNull()
    q('[data-arah="bulking"]').click()
    await flushPromises()
    expect(q('[data-test="arah-change"]').textContent).toContain('Ganti arah = progres mulai dari nol (riwayat tetep).')
    expect(q('[data-test="arah-info"]').textContent).toContain('Fokus nambah otot')
    q('[data-arah="recomp"]').click()
    await flushPromises()
    expect(q('[data-test="arah-change"]')).toBeNull()
  })

  describe('kecepatan', () => {
    it('muncul cuma di Cutting/Bulking; Bulking cuma 2 opsi', async () => {
      make()
      expect(q('[data-test="pace-seg"]')).toBeNull()
      await tap('[data-arah="cutting"]')
      expect([...document.querySelectorAll('[data-pace]')].map((b) => b.textContent.trim())).toEqual(['Santai', 'Normal', 'Agresif'])
      await tap('[data-arah="bulking"]')
      expect([...document.querySelectorAll('[data-pace]')].map((b) => b.textContent.trim())).toEqual(['Santai', 'Normal'])
      await tap('[data-arah="jaga"]')
      expect(q('[data-test="pace-seg"]')).toBeNull()
    })

    it('target lama tanpa pace → Normal kepilih', () => {
      make({ target: { ...DAVID_TARGET, pace: null } })
      expect(q('[data-pace="normal"]').classList.contains('on')).toBe(true)
    })

    it('isian David → baris hidup kg/minggu · makan · nyampe', () => {
      david()
      expect(text('[data-test="speed-line"]')).toContain('Turun ±0,37–0,56 kg/minggu (0,5–0,75% berat) · makan ±2.050 kkal · nyampe 69 kg ±Feb 2027 (±13 minggu)')
      expect(text('[data-test="speed-line"]')).toContain('Patokan riset: turun 0,5–1% berat/minggu masih jaga otot.')
      expect(q('[data-test="pace-warn"]').classList.contains('on')).toBe(false)
      expect(q('[data-test="pace-warn"]').getAttribute('aria-hidden')).toBe('true')
      expect(q('[data-test="pace-agresif"]')).toBeNull()
    })

    it('tanpa aktivitas → makan diganti "–"', () => {
      make({ target: DAVID_TARGET, summary: bodySummary(DAVID_ROWS, DAVID_TARGET) }, { rows: DAVID_ROWS })
      expect(text('[data-test="speed-food"]')).toBe('–')
      expect(text('[data-test="speed-line"]')).toContain('· makan – · nyampe 69 kg')
    })

    it('ketikan nggak pernah nyopot / nambah bagian kotak kecepatan (tinggi tetep buat keyboard iOS)', async () => {
      david()
      await tap('[data-pace="agresif"]')
      const nodes = () => ['speed-food', 'speed-reach', 'pace-warn'].map((t) => q(`[data-test="${t}"]`))
      const before = nodes()
      expect(before.every(Boolean)).toBe(true)
      // gym 0 → saran Ringan → makan di bawah BMR: peringatan cuma ganti keliatan, elemennya udah ada dari awal
      await type('[data-test="a-gym"]', '0')
      expect(q('[data-test="pace-warn"]').classList.contains('on')).toBe(true)
      await type('[data-test="a-gym"]', '5')
      expect(q('[data-test="pace-warn"]').classList.contains('on')).toBe(false)
      // isian aktivitas nggak lengkap → makan "–"; kisaran kosong → nyampe "–"
      await type('[data-test="a-hours"]', '')
      expect(text('[data-test="speed-food"]')).toBe('–')
      await type('[data-test="t-max"]', '')
      expect(text('[data-test="speed-reach"]')).toBe('–')
      expect(nodes()).toEqual(before)
      expect(q('[data-test="pace-warn"]').classList.contains('on')).toBe(false)
    })

    it('Agresif + Banyak duduk → catatan agresif + peringatan di bawah BMR', async () => {
      david()
      await tap('[data-pace="agresif"]')
      await tap('[data-level="sedentary"]')
      expect(text('[data-test="pace-agresif"]')).toBe('Defisit >500 kkal/hari, risiko otot lebih gede.')
      expect(text('[data-test="pace-warn"]')).toBe('Target makan di bawah BMR — otot bisa ikut kebakar. Coba kecepatan Normal.')
      expect(q('[data-test="pace-warn"]').classList.contains('on')).toBe(true)
      expect(text('[data-test="speed-line"]')).toContain('makan ±1.250 kkal')
    })

    it('ganti ke Bulking pas Agresif → balik Normal', async () => {
      david()
      await tap('[data-pace="agresif"]')
      await tap('[data-arah="bulking"]')
      expect(q('[data-pace="normal"]').classList.contains('on')).toBe(true)
      expect(text('[data-test="speed-line"]')).toContain('Naik ±0,19–0,37 kg/minggu (0,25–0,5% berat)')
      expect(text('[data-test="speed-line"]')).toContain('Patokan riset: naik 0,25–0,5% berat/minggu biar lemaknya nggak ikut banyak.')
    })
  })

  describe('aktivitas', () => {
    it('isian David: kerja kepilih, pengali Aktif + disaranin, TDEE', () => {
      david()
      expect(q('[data-work="stand_walk"]').classList.contains('on')).toBe(true)
      expect(q('[data-test="a-hours"]').value).toBe('10')
      expect(q('[data-level="active"]').classList.contains('on')).toBe(true)
      expect(text('[data-level="active"]')).toContain('disaranin')
      expect(text('[data-test="tdee"] span')).toBe('TDEE = BMR 1.650 × 1,55')
      expect(text('[data-test="tdee"] b')).toBe('±2.560 kkal')
      expect(q('[data-test="level-hint"]')).toBeNull()
    })

    it('gym 5→6 (ikut saran) → Sangat aktif', async () => {
      david()
      await type('[data-test="a-gym"]', '6')
      expect(q('[data-level="very_active"]').classList.contains('on')).toBe(true)
      expect(q('[data-level="active"]').classList.contains('on')).toBe(false)
      expect(text('[data-level="very_active"]')).toContain('disaranin')
    })

    it('tap Ringan → hint saran + "Pakai saran" balikin', async () => {
      david()
      await tap('[data-level="light"]')
      expect(q('[data-level="light"]').classList.contains('on')).toBe(true)
      expect(text('[data-test="level-hint"]')).toContain('Saran dari isian lo: Aktif')
      await tap('[data-test="use-sugg"]')
      expect(q('[data-level="active"]').classList.contains('on')).toBe(true)
      expect(q('[data-test="level-hint"]')).toBeNull()
    })

    it('tanpa BMR → nggak ada baris TDEE', () => {
      make({}, { activity: DAVID_ACT })
      expect(q('[data-test="tdee"]')).toBeNull()
    })

    it('diisi setengah → nggak ada request, pesan per kolom', async () => {
      make()
      await type('[data-test="a-gym"]', '5')
      await submit()
      expect(api.put).not.toHaveBeenCalled()
      expect(text('[data-test="err-workType"]')).toBe('Wajib diisi.')
      expect(text('[data-test="err-workHours"]')).toBe('Wajib diisi.')
      expect(mounted.emitted('close')).toBeFalsy()
    })

    it('simpen: PUT activity dulu baru PUT target, terus muat ulang & tutup', async () => {
      make({ target: null })
      await tap('[data-work="sit"]')
      await type('[data-test="a-hours"]', '8')
      await type('[data-test="a-days"]', '5')
      await type('[data-test="a-gym"]', '2')
      await type('[data-test="a-min"]', '60')
      await type('[data-test="a-notes"]', ' kantoran ')
      await submit()
      expect(api.put.mock.calls.map((c) => c[0])).toEqual(['/body/activity', '/body/target'])
      expect(api.put.mock.calls[0][1]).toEqual({ workType: 'sit', workHours: 8, workDays: 5, gymPerWeek: 2, gymMinutes: 60, otherSport: null, notes: 'kantoran', level: 'light', levelManual: false })
      expect(api.get).toHaveBeenCalledWith('/body')
      expect(api.put.mock.invocationCallOrder[1]).toBeLessThan(api.get.mock.invocationCallOrder[0])
      expect(toast).toHaveBeenCalledWith('Target kesimpen ✓')
      expect(mounted.emitted('close')).toBeTruthy()
    })

    it('aktivitas kesimpen tapi PUT target 422 → tetep kebuka, muat ulang, pesan di kolom', async () => {
      david()
      api.put.mockImplementation(async (url) => {
        if (url === '/body/target') throw new ApiError('Ada yang salah.', 422, { pace: ['Pilih kecepatannya.'] })
        return {}
      })
      await submit()
      expect(api.put.mock.calls.map((c) => c[0])).toEqual(['/body/activity', '/body/target'])
      expect(text('[data-test="err-pace"]')).toBe('Pilih kecepatannya.')
      expect(api.get).toHaveBeenCalledWith('/body')
      expect(mounted.emitted('close')).toBeFalsy()
      expect(toast).not.toHaveBeenCalled()
    })

    it('PUT activity 422 → target nggak dikirim, pesan di kolom', async () => {
      david()
      api.put.mockRejectedValueOnce(new ApiError('Ada yang salah.', 422, { workHours: ['Angkanya di luar rentang wajar (0–16).'] }))
      await submit()
      expect(api.put).toHaveBeenCalledTimes(1)
      expect(text('[data-test="err-workHours"]')).toBe('Angkanya di luar rentang wajar (0–16).')
      expect(mounted.emitted('close')).toBeFalsy()
    })
  })
})
