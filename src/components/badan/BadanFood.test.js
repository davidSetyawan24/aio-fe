import { mount } from '@vue/test-utils'
import { bodySummary, foodPlan } from '@/lib/badan.js'
import BadanFood from './BadanFood.vue'

const DAYS = ['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']
const ROWS = DAYS.map((d, i) => ({ id: i + 1, weighedOn: d, weighedAt: '06:40', weight: 74.9, fat: 25.6, muscle: null, bmr: 1650 }))
const ACT = { workType: 'stand_walk', workHours: 10, workDays: 7, gymPerWeek: 5, gymMinutes: 75, otherSport: null, notes: null, level: 'active', levelManual: false }
const T = { arah: 'cutting', pace: 'normal', fat: 20, muscle: 55, weightMin: 65, weightMax: 69, startedOn: '2026-11-14' }

function make({ rows = ROWS, target = T, activity = ACT } = {}) {
  const food = foodPlan(rows, target, activity)
  return mount(BadanFood, { props: { food, target, count: bodySummary(rows, target)?.count ?? 0 } })
}
/** Teks tanpa spasi sama sekali (antar-elemen nggak ada spasi di DOM) — bandingin lewat `nospace`. */
const nospace = (s) => s.replace(/\s+/g, '')
const t = (w, sel) => nospace(w.get(`[data-test="${sel}"]`).text())

describe('BadanFood', () => {
  it('ok David: ±2.050 kkal, ±140 g, rincian & catatan protein', () => {
    const w = make()
    expect(t(w, 'food-kcal')).toBe(nospace('±2.050kkal'))
    expect(t(w, 'food-protein')).toBe('±140g')
    expect(w.get('[data-test="food-kcal"]').classes()).not.toContain('warn')
    const rec = t(w, 'food-recipe')
    expect(rec).toContain(nospace('BMR rata-rata 7 hari 1.650'))
    expect(rec).toContain(nospace('× Aktif 1,55'))
    expect(rec).toContain(nospace('= TDEE ±2.560 kkal'))
    expect(rec).toContain(nospace('− Cutting Normal −515 kkal'))
    expect(t(w, 'food-pnote')).toBe(nospace('Protein 2,5 g × massa tanpa lemak 55,7 kg · rata-rata 7 hari.'))
    expect(w.find('[data-test="food-warn"]').exists()).toBe(false)
    expect(w.find('[data-test="food-activity"]').exists()).toBe(true)
  })

  it('protein null: strip + catatan butuh lemak', () => {
    const w = make({ rows: ROWS.map((r) => ({ ...r, fat: null })) })
    expect(t(w, 'food-protein')).toBe('–')
    expect(t(w, 'food-pnote')).toBe(nospace('Butuh lemak % dari timbangan.'))
  })

  it('recomp: makan pas TDEE', () => {
    const w = make({ target: { ...T, arah: 'recomp', pace: null } })
    expect(t(w, 'food-recipe')).toContain(nospace('± Recomp makan pas TDEE 0 kkal'))
    expect(t(w, 'food-pnote')).toContain(nospace('Protein 2,2 g'))
  })

  it('belowBmr: angka kuning + peringatan; agresif: catatan kecil', () => {
    const w = make({ target: { ...T, pace: 'agresif' }, activity: { ...ACT, level: 'sedentary' } })
    expect(w.get('[data-test="food-kcal"]').classes()).toContain('warn')
    expect(t(w, 'food-warn')).toBe(nospace('Target makan di bawah BMR — otot bisa ikut kebakar. Coba kecepatan Normal.'))
    expect(t(w, 'food-aggressive')).toContain(nospace('Defisit >500 kkal/hari'))
  })

  it.each([
    ['needWeighing', { rows: [] }, 'Upload timbangan dulu buat ngitung target makan.', 'upload', false],
    ['needTarget', { target: null }, 'Pasang target dulu (arah + aktivitas)', 'target', false],
    ['needPace', { target: { ...T, pace: null } }, 'Pilih kecepatan dulu Buka Atur target, pilih Santai/Normal/Agresif.', 'target', true],
    ['needActivity', { activity: null }, 'Isi aktivitas dulu Kerja harian & gym, diisi sekali di Atur target.', 'target', true],
    ['needBmr', { rows: ROWS.map((r) => ({ ...r, bmr: null })) }, 'BMR belum ada di timbangan 7 hari terakhir Upload timbangan dari Zepp Life biar keitung.', 'upload', true],
  ])('kosong %s: teks + tombol emit', async (state, over, text, event, link) => {
    const w = make(over)
    expect(w.get('[data-test="food-empty"]').attributes('data-state')).toBe(state)
    expect(t(w, 'food-empty')).toContain(nospace(text))
    await w.get('[data-test="food-btn"]').trigger('click')
    expect(w.emitted(event)).toHaveLength(1)
    expect(w.find('[data-test="food-activity"]').exists()).toBe(link)
  })

  it('link Aktivitas buka sheet target', async () => {
    const w = make()
    await w.get('[data-test="food-activity"]').trigger('click')
    expect(w.emitted('target')).toHaveLength(1)
  })
})
