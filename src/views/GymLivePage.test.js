import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/lib/api.js'
import { wibTime } from '@/lib/gym.js'
import { LIVE_KEY, OFFLINE_TEXT, newLive } from '@/lib/gymLive.js'
import { setGymApi, setGymStorage, useGymStore } from '@/stores/gym.js'
import { beep, unlockAudio } from '@/lib/beep.js'
import GymLivePage from './GymLivePage.vue'

vi.mock('@/lib/beep.js', () => ({ beep: vi.fn(), unlockAudio: vi.fn() }))

const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn(), replace: vi.fn() }))
const sheet = vi.hoisted(() => ({ present: vi.fn(), onDidDismiss: vi.fn() }))
const sheetCreate = vi.hoisted(() => vi.fn())
const toastCreate = vi.hoisted(() => vi.fn())
const hooks = vi.hoisted(() => ({ enter: [], leave: [] }))
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  onIonViewWillEnter: (fn) => hooks.enter.push(fn),
  onIonViewWillLeave: (fn) => hooks.leave.push(fn),
  actionSheetController: { create: sheetCreate },
  toastController: { create: toastCreate },
}))

const ex = (id, name, last, record = null, more = {}) => ({ id, name, restSec: 120, step: 2.5, dumbbell: false, last, record, ...more })
const L3 = (w, r = [8, 8, 7]) => ({ on: '2026-11-16', sets: r.map((x) => [w, x]) })
const exercises = [
  ex(1, 'Incline Dumbbell Press', L3(22.5), { maxWeight: 22.5, repsAt: { 22.5: 8 } }, { dumbbell: true }),
  ex(2, 'Chest Press', L3(40), { maxWeight: 40, repsAt: { 40: 8 } }),
  ex(3, 'Shoulder Press', L3(22.5), { maxWeight: 22.5, repsAt: { 22.5: 8 } }),
  ex(4, 'Pec Deck', L3(35), { maxWeight: 35, repsAt: { 35: 8 } }),
  ex(5, 'Triceps Push Down', L3(20), { maxWeight: 20, repsAt: { 20: 8 } }),
  ex(6, 'Lateral Raise', L3(6), { maxWeight: 6, repsAt: { 6: 8 } }, { dumbbell: true }),
  ex(7, 'Hip Thrust', L3(40), { maxWeight: 40, repsAt: { 40: 8 } }),
  ex(8, 'Barbell Squat', L3(60), { maxWeight: 60, repsAt: { 60: 8 } }),
]
const programs = [
  { key: 'push', exerciseIds: [1, 2, 3, 4, 5, 6], lastOn: '2026-11-16' },
  { key: 'pull', exerciseIds: [], lastOn: null },
  { key: 'leg', exerciseIds: [8], lastOn: null },
  { key: 'upper', exerciseIds: [], lastOn: null },
  { key: 'lower', exerciseIds: [8], lastOn: null },
]
const data = (over = {}) => ({ programs, exercises, active: null, recent: [], week: { days: [], count: 0, minutes: 0 }, totalSessions: 3, firstOn: '2026-11-02', mini: null, ...over })
const STARTED = new Date(Date.now() - (42 * 60 + 13) * 1000).toISOString()

/** Draf kayak layar mockup `live`: gerakan 1 & 2 beres, gerakan 3 baru 1 set. `exdone` = gerakan 3 beres juga. */
function draft(stage = 'live', { first = false } = {}) {
  let n = 0
  const live = newLive({ program: 'push', programs, exercises: first ? exercises.map((x) => ({ ...x, last: null, record: null })) : exercises, now: new Date(STARTED), uid: () => `r${++n}` })
  Object.assign(live, { serverId: 100, queue: [], open: first ? 0 : 2 })
  const done = (i, count) => live.items[i].rows.slice(0, count).forEach((r, k) => Object.assign(r, { done: true, doneAt: STARTED, serverId: 500 + i * 10 + k }))
  if (!first) {
    done(0, 3)
    done(1, 3)
    done(2, stage === 'exdone' ? 3 : 1)
  }
  return live
}

/** Sesi jalan versi server = draf HP (set yang udah kekirim aja), biar digabung nggak ngubah apa-apa. */
const activeOf = (live) => ({
  id: live.serverId, clientId: live.clientId, program: live.program, planned: live.planned, startedAt: live.startedAt, endedAt: null,
  sets: live.items.flatMap((it) => it.rows.filter((r) => r.done && r.serverId != null).map((r) => ({ id: r.serverId, clientId: r.key, exerciseId: it.exerciseId, weight: r.weight, reps: r.reps, doneAt: r.doneAt }))),
})

let api, store, storage
const mounted = []
function memStorage() {
  const m = new Map()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
}
function stubMedia(width) {
  window.matchMedia = (query) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0)
    return { matches: width >= min, addEventListener: () => {}, removeEventListener: () => {} }
  }
}
async function mountPage({ live = draft(), width = 390, server = data } = {}) {
  stubMedia(width)
  storage = memStorage()
  setGymStorage(storage)
  if (live) storage.setItem(LIVE_KEY, JSON.stringify(live))
  // GET /gym ngikut keadaan store (sesi jalan = draf yang lagi dipegang), kayak server beneran.
  api = { get: vi.fn(async () => server({ active: store?.live?.serverId != null ? activeOf(store.live) : null })), post: vi.fn(() => new Promise(() => {})), patch: vi.fn(() => new Promise(() => {})), put: vi.fn(), del: vi.fn(async () => null) }
  setGymApi(api)
  store = null
  const pinia = createPinia()
  setActivePinia(pinia)
  store = useGymStore()
  const w = mount(GymLivePage, { global: { plugins: [pinia] }, attachTo: document.body })
  mounted.push(w)
  await flushPromises()
  return w
}
const toasts = () => toastCreate.mock.calls.map((c) => c[0].message)
const card = (w, i) => w.findAll('[data-test="ex"]')[i]
const editor = (w) => w.find('[data-test="editor"]')
function answer(data) {
  sheet.onDidDismiss.mockResolvedValue({ data })
}

beforeEach(() => {
  hooks.enter.length = 0
  hooks.leave.length = 0
  for (const f of Object.values(ionRouter)) if (typeof f === 'function' && f.mockReset) f.mockReset()
  sheetCreate.mockReset().mockResolvedValue(sheet)
  sheet.present.mockReset()
  answer(undefined)
  toastCreate.mockReset().mockResolvedValue({ present: vi.fn() })
  document.body.appendChild(document.createElement('ion-app'))
})
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  document.querySelectorAll('ion-app').forEach((e) => e.remove())
})

describe('GymLivePage: layar live', () => {
  it('bar atas: ‹ Gym · 💪 Sesi Push + durasi · Selesai; ringkasan mulai · set · gerakan', async () => {
    const w = await mountPage()
    const bar = w.find('[data-test="livebar"]')
    expect(bar.text()).toContain('Gym')
    expect(bar.text()).toContain('💪 Sesi Push')
    expect(bar.text()).toMatch(/00:4[23]:\d\d/)
    expect(bar.find('[data-test="finish"]').text()).toContain('Selesai')
    expect(w.find('[data-test="lsum"]').text()).toBe(`mulai ${wibTime(STARTED)} · 7 set · 3 dari 6 gerakan`)
    expect(w.find('[data-test="pending"]').exists()).toBe(false)
  })

  it('kartu per gerakan, cuma satu kebuka; kepala: ✓ semua / sebagian / sesi lalu', async () => {
    const w = await mountPage()
    expect(w.findAll('[data-test="ex"]')).toHaveLength(6)
    expect(w.findAll('[data-test="ex"].open')).toHaveLength(1)
    expect(card(w, 2).classes()).toContain('open')
    expect(card(w, 0).text()).toContain('3 set ✓ · terberat 22,5 × 8')
    expect(card(w, 2).text()).toContain('1 set ✓')
    expect(card(w, 3).text()).toContain('sesi lalu 35 × 8 · 3 set')
    expect(card(w, 2).text()).toContain('istirahat 2 mnt')
    expect(card(w, 0).find('.gl-exn').classes()).toContain('done')
    expect(card(w, 2).find('.gl-exn').classes()).toContain('part')
    expect(editor(w).text()).toContain('Centang set 2')
    expect(card(w, 2).text()).toContain('lalu 22,5 × 8')
    expect(card(w, 2).text()).toContain('belum')
  })

  it('gerakan dumbbell → chip "beban per 1 dumbbell"', async () => {
    const w = await mountPage()
    await card(w, 0).find('[data-test="exhead"]').trigger('click')
    expect(card(w, 0).text()).toContain('beban per 1 dumbbell')
    expect(store.live.open).toBe(0)
  })

  it('✓ → store.check langsung, baris berikut kebuka; ngalahin rekor → toast 🏆 PR baru', async () => {
    const w = await mountPage()
    const check = vi.spyOn(store, 'check')
    await editor(w).find('[data-test="weight-plus"]').trigger('click')
    await editor(w).find('[data-test="check"]').trigger('click')
    expect(check).toHaveBeenCalledWith(2, 1, { weight: 25, reps: 8 })
    expect(store.live.items[2].rows[1]).toMatchObject({ done: true, weight: 25, reps: 8 })
    expect(toasts()).toContain('🏆 PR baru: 25 × 8')
    await flushPromises()
    expect(editor(w).text()).toContain('Centang set 3')
    expect(w.find('[data-test="lsum"]').text()).toContain('8 set')
    expect(card(w, 2).find('.gy-chip.pr').exists()).toBe(true)
  })

  it('✓ tanpa rekor baru → nggak ada toast PR', async () => {
    const w = await mountPage()
    await editor(w).find('[data-test="check"]').trigger('click')
    expect(store.live.items[2].rows[1].done).toBe(true)
    expect(toasts().some((t) => t.includes('PR'))).toBe(false)
  })

  it('ketik angka di baris belum ✓ → kesimpen di draf HP', async () => {
    const w = await mountPage()
    await editor(w).find('[data-test="reps"]').setValue('10')
    expect(store.live.items[2].rows[1].reps).toBe(10)
    expect(JSON.parse(storage.getItem(LIVE_KEY)).items[2].rows[1].reps).toBe(10)
  })

  it('tap set yang udah ✓ → lagi dibenerin → Simpen / Hapus set', async () => {
    const w = await mountPage()
    await card(w, 2).find('[data-row="0"]').trigger('click')
    expect(editor(w).text()).toContain('Set 1 · lagi dibenerin')
    await editor(w).find('[data-test="reps-plus"]').trigger('click')
    await editor(w).find('[data-test="save"]').trigger('click')
    expect(store.live.items[2].rows[0]).toMatchObject({ done: true, reps: 9 })
    expect(toasts()).toContain('Set dibenerin ✓')
    expect(editor(w).text()).toContain('Centang set 2')
    await card(w, 2).find('[data-row="0"]').trigger('click')
    await editor(w).find('[data-test="remove"]').trigger('click')
    expect(store.live.items[2].rows).toHaveLength(2)
    expect(toasts()).toContain('Set dihapus')
  })

  it('+ Tambah set → baris baru kebuka di editor', async () => {
    const w = await mountPage()
    await card(w, 2).find('[data-test="addset"]').trigger('click')
    expect(store.live.items[2].rows).toHaveLength(4)
    expect(editor(w).text()).toContain('Centang set 4')
  })

  it('lagi Selesai → semua tombol set mati', async () => {
    const w = await mountPage()
    store.finishing = true
    await flushPromises()
    expect(editor(w).find('[data-test="check"]').attributes('disabled')).toBeDefined()
    expect(card(w, 2).find('[data-test="addset"]').attributes('disabled')).toBeDefined()
    expect(w.find('[data-test="addex"]').attributes('disabled')).toBeDefined()
    expect(w.find('[data-test="finish"]').attributes('disabled')).toBeDefined()
  })

  it('ada set belum kekirim → chip "⏳ N set belum kekirim"', async () => {
    const live = draft()
    live.items[2].rows[0].serverId = null
    live.items[1].rows[2].serverId = null
    live.queue = [{ op: 'add', key: live.items[1].rows[2].key }, { op: 'add', key: live.items[2].rows[0].key }]
    const w = await mountPage({ live })
    expect(w.find('[data-test="pending"]').text()).toBe('⏳ 2 set belum kekirim')
  })

  it('kabar dari store (notice) ditampilin App, bukan halaman ini (biar nggak dobel)', async () => {
    await mountPage()
    store.notice = { id: 1, text: '1 set nggak kesimpen. Coba centang lagi.' }
    await flushPromises()
    expect(toasts()).not.toContain('1 set nggak kesimpen. Coba centang lagi.')
  })

  it('‹ Gym → balik ke Gym, sesi tetep jalan', async () => {
    const w = await mountPage()
    await w.find('[data-test="back"]').trigger('click')
    expect(ionRouter.back).toHaveBeenCalled()
    expect(store.live).not.toBeNull()
  })

  it('nggak ada sesi jalan → balik ke /tabs/menu/gym', async () => {
    await mountPage({ live: null })
    expect(ionRouter.navigate).toHaveBeenCalledWith('/tabs/menu/gym', 'back', 'replace')
  })

  it('PC ≥1100: daftar kiri + gerakan kebuka di panel kanan', async () => {
    const w = await mountPage({ width: 1440 })
    const pane = w.find('[data-test="pane"]')
    expect(pane.exists()).toBe(true)
    expect(pane.text()).toContain('Shoulder Press')
    expect(pane.text()).toContain('Centang set 2')
    expect(w.find('[data-test="list"]').find('[data-test="editor"]').exists()).toBe(false)
  })
})

describe('GymLivePage: gerakan beres & sesi pertama', () => {
  it('semua set ✓ → "Gerakan beres. Lanjut?" ke gerakan pertama yang belum disentuh', async () => {
    const w = await mountPage({ live: draft('exdone') })
    const next = w.find('[data-test="nextex"]')
    expect(next.text()).toContain('Gerakan beres. Lanjut?')
    expect(next.text()).toContain('Pec Deck')
    await next.trigger('click')
    expect(store.live.open).toBe(3)
    expect(editor(w).text()).toContain('Centang set 1')
  })

  it('sesi pertama: kolom kosong, ✓ mati, "belum ada riwayat"', async () => {
    const w = await mountPage({ live: draft('live', { first: true }), server: (o) => data({ ...o, exercises: exercises.map((x) => ({ ...x, last: null, record: null })) }) })
    expect(card(w, 0).text()).toContain('belum ada riwayat')
    expect(editor(w).text()).toContain('belum ada patokan')
    expect(editor(w).find('[data-test="weight"]').element.value).toBe('')
    expect(editor(w).find('[data-test="check"]').attributes('disabled')).toBeDefined()
    expect(w.find('[data-test="lsum"]').text()).toContain('0 set · 0 dari 6 gerakan')
  })
})

describe('GymLivePage: Selesai', () => {
  it('action sheet: N set kesimpen, belum dicentang, Dilewatin → finish → ringkasan', async () => {
    const w = await mountPage()
    api.post.mockImplementation(async (url) => (url === '/gym/sessions/100/finish' ? { session: { id: 77 }, exercises: [], skipped: [], summary: {} } : new Promise(() => {})))
    answer('finish')
    await w.find('[data-test="finish"]').trigger('click')
    await flushPromises()
    const opts = sheetCreate.mock.calls[0][0]
    expect(opts.header).toBe('Selesai sesi Push?')
    expect(opts.subHeader).toBe('7 set kesimpen. 2 set yang belum dicentang nggak ikut. Dilewatin: Pec Deck, Triceps Push Down, Lateral Raise.')
    expect(opts.buttons.map((b) => b.text)).toEqual(['Selesai', 'Lanjut latihan'])
    expect(api.post).toHaveBeenCalledWith('/gym/sessions/100/finish', {})
    expect(ionRouter.replace).toHaveBeenCalledWith('/tabs/menu/gym/selesai/77')
    expect(ionRouter.navigate).not.toHaveBeenCalled()
  })

  it('Lanjut latihan → nggak ngapa-ngapain', async () => {
    const w = await mountPage()
    answer(undefined)
    await w.find('[data-test="finish"]').trigger('click')
    await flushPromises()
    expect(api.post).not.toHaveBeenCalledWith('/gym/sessions/100/finish', expect.anything())
    expect(store.live).not.toBeNull()
  })

  it('semua set udah ✓ & nggak ada yang dilewatin → kalimatnya pendek', async () => {
    const live = draft('exdone')
    for (const i of [3, 4, 5]) live.items[i].rows.forEach((r) => Object.assign(r, { done: true, doneAt: STARTED, serverId: 900 + i }))
    const w = await mountPage({ live })
    await w.find('[data-test="finish"]').trigger('click')
    await flushPromises()
    expect(sheetCreate.mock.calls[0][0].subHeader).toBe('18 set kesimpen.')
  })

  it('gerakan tambahan yang nggak disentuh nggak ikut "Dilewatin"', async () => {
    const live = draft('exdone')
    for (const i of [3, 4]) live.items[i].rows.forEach((r) => Object.assign(r, { done: true, doneAt: STARTED, serverId: 900 + i }))
    live.items.push({ exerciseId: 7, extra: true, rows: [{ key: 'z', weight: null, reps: null, done: false, doneAt: null, serverId: null, prev: null }] })
    const w = await mountPage({ live })
    await w.find('[data-test="finish"]').trigger('click')
    await flushPromises()
    expect(sheetCreate.mock.calls[0][0].subHeader).toBe('15 set kesimpen. Dilewatin: Lateral Raise.')
  })

  it('0 set → "Belum ada set yang dicentang — sesi ini dibuang?" [Buang sesi] → discard → balik ke Gym', async () => {
    const w = await mountPage({ live: draft('live', { first: true }) })
    answer('discard')
    await w.find('[data-test="finish"]').trigger('click')
    await flushPromises()
    const opts = sheetCreate.mock.calls[0][0]
    expect(opts.header).toBe('Belum ada set yang dicentang — sesi ini dibuang?')
    expect(opts.buttons.map((b) => b.text)).toEqual(['Buang sesi', 'Lanjut latihan'])
    expect(api.del).toHaveBeenCalledWith('/gym/sessions/100?running=1')
    expect(store.live).toBeNull()
    expect(ionRouter.navigate).toHaveBeenCalledWith('/tabs/menu/gym', 'back', 'replace')
  })

  it('belum ada sinyal → toast teks OfflineError, tetep di sesi', async () => {
    const w = await mountPage()
    api.post.mockImplementation(async (url) => {
      if (url.endsWith('/finish')) throw new ApiError('Nggak bisa nyambung ke server.', 0)
      return new Promise(() => {})
    })
    answer('finish')
    await w.find('[data-test="finish"]').trigger('click')
    await flushPromises()
    expect(toasts()).toContain(OFFLINE_TEXT)
    expect(ionRouter.replace).not.toHaveBeenCalled()
    expect(store.live).not.toBeNull()
  })

  it('server nolak (mis. 422) → toast pesannya, tetep di sesi', async () => {
    const w = await mountPage()
    api.post.mockImplementation(async (url) => {
      if (url.endsWith('/finish')) throw new ApiError('Belum ada set yang dicentang.', 422)
      return new Promise(() => {})
    })
    answer('finish')
    await w.find('[data-test="finish"]').trigger('click')
    await flushPromises()
    expect(toasts()).toContain('Belum ada set yang dicentang.')
  })
})

describe('GymLivePage: tambah gerakan', () => {
  it('Tambah gerakan → sheet → pilih → kartu baru kebuka + toast', async () => {
    const w = await mountPage()
    await w.find('[data-test="addex"]').trigger('click')
    const s = document.querySelector('[data-test="add-sheet"]')
    expect(s.classList.contains('show')).toBe(true)
    expect(s.textContent).toContain('Pernah lo pake')
    expect(s.textContent).toContain('Hip Thrust')
    s.querySelector('[data-addex="7"]').click()
    await flushPromises()
    expect(store.live.items.at(-1)).toMatchObject({ exerciseId: 7, extra: true })
    expect(store.live.open).toBe(6)
    expect(toasts()).toContain('Hip Thrust ditambahin')
    expect(s.classList.contains('show')).toBe(false)
    expect(card(w, 6).text()).toContain('tambahan')
    expect(w.find('[data-test="lsum"]').text()).toContain('3 dari 7 gerakan')
  })
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const rest = (w) => w.find('.rest')
function visibility(state) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
}

describe('GymLivePage: timer istirahat', () => {
  beforeEach(() => {
    beep.mockReset()
    unlockAudio.mockReset()
    visibility('visible')
  })
  afterEach(() => visibility('visible'))

  it('✓ → timer nyala sesuai istirahat gerakan, kesimpen di draf, audio dibuka', async () => {
    const w = await mountPage()
    expect(rest(w).exists()).toBe(false)
    await editor(w).find('[data-test="check"]').trigger('click')
    await flushPromises()
    expect(unlockAudio).toHaveBeenCalledTimes(1)
    expect(store.live.timer).toMatchObject({ total: 120, name: 'Shoulder Press', beeped: false })
    expect(rest(w).text()).toContain('Istirahat · Shoulder Press')
    expect(rest(w).find('[data-test="rest-time"]').text()).toMatch(/^(2:00|1:5\d)$/)
    expect(JSON.parse(storage.getItem(LIVE_KEY)).timer.name).toBe('Shoulder Press')
  })

  it('✓ lagi → timer diganti (gerakan lain)', async () => {
    const w = await mountPage()
    await editor(w).find('[data-test="check"]').trigger('click')
    const first = store.live.timer.endAt
    await card(w, 3).find('[data-test="exhead"]').trigger('click')
    await sleep(420)
    await editor(w).find('[data-test="check"]').trigger('click')
    await flushPromises()
    expect(store.live.timer.name).toBe('Pec Deck')
    expect(store.live.timer.endAt).toBeGreaterThan(first)
  })

  it('+30 dtk nambah sisa & total; Lewati ngilangin bar', async () => {
    const w = await mountPage()
    await editor(w).find('[data-test="check"]').trigger('click')
    await rest(w).find('[data-test="plus30"]').trigger('click')
    expect(store.live.timer.total).toBe(150)
    expect(rest(w).find('[data-test="rest-time"]').text()).toMatch(/^2:[23]\d$/)
    await rest(w).find('[data-test="skip"]').trigger('click')
    expect(store.live.timer).toBeNull()
    expect(rest(w).exists()).toBe(false)
    expect(JSON.parse(storage.getItem(LIVE_KEY)).timer).toBeNull()
  })

  it('pas habis (halaman keliatan) → bunyi SEKALI, bar jadi beres', async () => {
    const live = draft()
    live.timer = { endAt: Date.now() + 600, total: 120, name: 'Shoulder Press', beeped: false }
    const w = await mountPage({ live })
    expect(rest(w).classes()).not.toContain('done')
    await sleep(1400)
    expect(beep).toHaveBeenCalledTimes(1)
    expect(rest(w).classes()).toContain('done')
    expect(store.live.timer.beeped).toBe(true)
    expect(rest(w).find('[data-test="rest-over"]').text()).toMatch(/^lewat 0:0\d$/)
    await sleep(600)
    expect(beep).toHaveBeenCalledTimes(1)
  })

  it('dibuka lagi setelah lewat → langsung beres, nggak bunyi', async () => {
    const live = draft()
    live.timer = { endAt: Date.now() - 23_000, total: 120, name: 'Shoulder Press', beeped: false }
    const w = await mountPage({ live })
    await sleep(700)
    expect(rest(w).classes()).toContain('done')
    expect(rest(w).find('[data-test="rest-over"]').text()).toMatch(/^lewat 0:2[3-6]$/)
    expect(beep).not.toHaveBeenCalled()
    expect(store.live.timer.beeped).toBe(true)
  })

  it('habis pas app di background → nggak bunyi telat waktu balik keliatan', async () => {
    const live = draft()
    live.timer = { endAt: Date.now() + 400, total: 120, name: 'Shoulder Press', beeped: false }
    visibility('hidden')
    const w = await mountPage({ live })
    await sleep(1000)
    visibility('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    await sleep(700)
    expect(beep).not.toHaveBeenCalled()
    expect(rest(w).classes()).toContain('done')
  })

  it('balik keliatan pas timer masih jalan → sisa waktu langsung bener (hitung dari jam selesai)', async () => {
    const live = draft()
    live.timer = { endAt: Date.now() + 90_000, total: 120, name: 'Shoulder Press', beeped: false }
    const w = await mountPage({ live })
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(rest(w).find('[data-test="rest-time"]').text()).toMatch(/^1:(29|30)$/)
  })

  it('tinggalin halaman → tick berhenti (nggak bunyi dari halaman yang udah ditutup)', async () => {
    const live = draft()
    live.timer = { endAt: Date.now() + 500, total: 120, name: 'Shoulder Press', beeped: false }
    const w = await mountPage({ live })
    w.unmount()
    mounted.splice(mounted.indexOf(w), 1)
    await sleep(900)
    expect(beep).not.toHaveBeenCalled()
  })
})

describe('GymLivePage: tap kedua abis ✓ (R12a)', () => {
  it('tap di editor set berikutnya ±350 ms abis ✓ diabaikan, abis itu jalan', async () => {
    const w = await mountPage()
    await editor(w).find('[data-test="check"]').trigger('click')
    await flushPromises()
    expect(editor(w).exists()).toBe(true)
    const before = editor(w).find('[data-test="weight"]').element.value
    await editor(w).find('[data-test="weight-plus"]').trigger('click')
    await editor(w).find('[data-test="check"]').trigger('click')
    expect(editor(w).find('[data-test="weight"]').element.value).toBe(before)
    expect(store.live.items[2].rows[2].done).toBe(false)
    await sleep(420)
    await editor(w).find('[data-test="weight-plus"]').trigger('click')
    expect(editor(w).find('[data-test="weight"]').element.value).not.toBe(before)
  })
})

describe('GymLivePage: guard nggak nyangkut', () => {
  it('✓ lalu keluar halaman <350 ms lalu masuk lagi → editor bisa dipencet', async () => {
    const w = await mountPage()
    await editor(w).find('[data-test="check"]').trigger('click')
    await flushPromises()
    hooks.leave.forEach((f) => f())
    hooks.enter.forEach((f) => f())
    await flushPromises()
    expect(w.find('.gl-guard').exists()).toBe(false)
    const before = editor(w).find('[data-test="weight"]').element.value
    await editor(w).find('[data-test="weight-plus"]').trigger('click')
    expect(editor(w).find('[data-test="weight"]').element.value).not.toBe(before)
  })
})

describe('GymLivePage: balik keliatan sesaat abis habis', () => {
  it('visibilitychange <1,5 dtk abis habis → tetap bunyi sekali', async () => {
    beep.mockReset()
    visibility('visible')
    const live = draft()
    live.timer = { endAt: Date.now() + 150, total: 120, name: 'Shoulder Press', beeped: false }
    const spy = vi.spyOn(globalThis, 'setInterval').mockImplementation(() => 0)
    const w = await mountPage({ live })
    spy.mockRestore()
    await sleep(300)
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(beep).toHaveBeenCalledTimes(1)
    expect(rest(w).classes()).toContain('done')
  })
})

describe('GymLivePage: gerakan yang udah ada di sesi (R12c)', () => {
  it('pilih/409 gerakan yang udah ada → kartunya kebuka, tanpa toast "ditambahin"', async () => {
    const w = await mountPage()
    await w.find('[data-test="addex"]').trigger('click')
    const s = document.querySelector('[data-test="add-sheet"]')
    const input = s.querySelector('[data-test="add-q"]')
    input.value = 'pec deck'
    input.dispatchEvent(new Event('input'))
    await flushPromises()
    s.querySelector('[data-test="in-session"]').click()
    await flushPromises()
    expect(store.live.open).toBe(3)
    expect(store.live.items).toHaveLength(6)
    expect(toasts().some((t) => t.includes('ditambahin'))).toBe(false)
    expect(s.classList.contains('show')).toBe(false)
  })
})
