import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { setPersonalApi, usePersonalStore } from '@/stores/personal.js'
import PersonalPage from './PersonalPage.vue'

const toastCreate = vi.hoisted(() => vi.fn())
const ionRouter = vi.hoisted(() => ({ canGoBack: () => true, back: vi.fn(), navigate: vi.fn(), push: vi.fn() }))
const sheetCreate = vi.hoisted(() => vi.fn())
const copyMock = vi.hoisted(() => vi.fn())
vi.mock('@ionic/vue', async (importOriginal) => ({
  ...(await importOriginal()),
  useIonRouter: () => ionRouter,
  toastController: { create: toastCreate },
  actionSheetController: { create: sheetCreate },
}))
vi.mock('@/components/NotifBell.vue', () => ({ default: { template: '<span />' } }))
vi.mock('@/lib/clipboard.js', () => ({ copyToClipboard: copyMock }))

const date = (over) => ({ key: 'expiry', on: '2027-07-24', reminders: [], state: 'ok', daysLeft: 250, lateDays: 0, ...over })
const full = {
  today: '2026-11-18',
  bio: { fields: { name: 'David Setyawan', birthDate: '24-07-1997' }, extra: [{ label: 'Tinggi badan', value: '172 cm' }] },
  documents: [
    { id: 1, type: 'ktp', label: null, values: ['3275012407970001'], dates: [] },
    { id: 6, type: 'simc', label: null, values: ['970787654321'], dates: [date({ on: '2026-12-05', state: 'soon', daysLeft: 17 })] },
  ],
  addresses: [{ id: 1, name: 'Rumah Bekasi', ktp: true, domicile: false, street: 'Jl. Melati Raya No. 5', rtRw: '003 / 007', village: 'Jatiwaringin', district: 'Pondok Gede', city: 'Kota Bekasi', province: 'Jawa Barat', postalCode: '17411' }],
}

const mounted = []
let api, router
function stubMedia(width) {
  window.matchMedia = (query) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0)
    return { matches: width >= min, addEventListener: () => {}, removeEventListener: () => {} }
  }
}
async function mountPage({ width = 390, unlocked = true, url = '/tabs/menu/data-pribadi', data = full } = {}) {
  stubMedia(width)
  api = {
    get: vi.fn(async (url) => (url === '/personal/status' ? { status: { configured: true, hasPin: true, unlocked } } : data)),
    post: vi.fn(async (url) => (url === '/personal/lock' ? { status: { configured: true, hasPin: true, unlocked: false } } : {})),
    put: vi.fn(), del: vi.fn(),
  }
  setPersonalApi(api)
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = usePersonalStore()
  // Sudah kebuka (boot-nya udah lewat): isi dimuat gerbang begitu kepasang.
  store.booted = true
  store.status = { configured: true, hasPin: true, unlocked }
  router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/tabs/menu/data-pribadi', component: PersonalPage }] })
  router.push(url)
  await router.isReady()
  vi.spyOn(router, 'replace')
  const w = mount(PersonalPage, { global: { plugins: [pinia, router], stubs: { teleport: true } }, attachTo: document.body })
  mounted.push(w)
  await flushPromises()
  return w
}

beforeEach(() => {
  ionRouter.push.mockReset()
  sheetCreate.mockReset().mockResolvedValue({ present: vi.fn(), onDidDismiss: vi.fn(async () => ({ data: 'delete' })) })
  toastCreate.mockReset().mockResolvedValue({ present: vi.fn() })
  copyMock.mockReset().mockResolvedValue(true)
})
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()))

describe('PersonalPage', () => {
  it('opens on Dokumen with a yellow dot because something needs attention', async () => {
    const w = await mountPage()
    expect(w.find('[data-test="tab-dokumen"]').classes()).toContain('on')
    expect(w.find('[data-test="due-dot"]').exists()).toBe(true)
    expect(w.find('[data-test="due"]').text()).toContain('SIM C')
    expect(w.find('[data-test="due"]').text()).toContain('Habis 17 hari lagi · 5 Des 2026')
    expect(w.find('[data-test="docs"]').text()).toContain('3275 0124 0797 0001')
  })

  it('copies a number without spaces and says so', async () => {
    const w = await mountPage()
    await w.find('[data-test="doc-copy"]').trigger('click')
    await flushPromises()
    expect(copyMock).toHaveBeenCalledWith('970787654321')
    await w.find('[data-test="tab-bio"]').trigger('click')
    await w.findAll('[data-test="copy-row"]')[0].trigger('click')
    await flushPromises()
    expect(copyMock).toHaveBeenLastCalledWith('David Setyawan')
    expect(toastCreate.mock.calls.at(-1)[0].message).toBe('Nama lengkap kesalin ✓')
  })

  it('copies the NIK from the document row and toasts the field name', async () => {
    const w = await mountPage()
    const ktp = w.findAll('[data-test="doc-row"]').find((r) => r.text().includes('KTP'))
    await ktp.find('[data-test="doc-copy"]').trigger('click')
    await flushPromises()
    expect(copyMock).toHaveBeenCalledWith('3275012407970001')
    expect(toastCreate.mock.calls.at(-1)[0].message).toBe('NIK kesalin ✓')
  })

  it('keeps the birth date as shown but strips plain numbers', async () => {
    const w = await mountPage()
    await w.find('[data-test="tab-bio"]').trigger('click')
    const rows = w.findAll('[data-test="copy-row"]')
    const birth = rows.find((r) => r.text().includes('Tanggal lahir'))
    await birth.trigger('click')
    await flushPromises()
    expect(copyMock).toHaveBeenLastCalledWith('24-07-1997')
  })

  it('shows the new birth date as "24 Juni 1995" and height with cm, copying what is shown', async () => {
    const bio = { fields: { birthDate: '1995-06-24', gender: 'Laki-laki', height: '166' }, extra: [] }
    const w = await mountPage({ data: { ...full, bio } })
    await w.find('[data-test="tab-bio"]').trigger('click')
    const rows = w.findAll('[data-test="copy-row"]')
    expect(rows.map((r) => r.find('.k').text())).toEqual(['Tanggal lahir', 'Jenis kelamin', 'Tinggi'])
    expect(rows[0].find('.v').text()).toBe('24 Juni 1995')
    expect(rows[2].find('.v').text()).toBe('166 cm')
    await rows[0].trigger('click')
    await flushPromises()
    expect(copyMock).toHaveBeenLastCalledWith('24 Juni 1995')
    await rows[2].trigger('click')
    await flushPromises()
    expect(copyMock).toHaveBeenLastCalledWith('166 cm')
  })

  it('copies a whole address as one line', async () => {
    const w = await mountPage()
    await w.find('[data-test="tab-alamat"]').trigger('click')
    expect(w.text()).toContain('Sesuai KTP')
    await w.find('[data-test="copy-all"]').trigger('click')
    await flushPromises()
    expect(copyMock).toHaveBeenCalledWith('Jl. Melati Raya No. 5, RT 003/RW 007, Kel. Jatiwaringin, Kec. Pondok Gede, Kota Bekasi, Jawa Barat 17411')
    expect(toastCreate.mock.calls.at(-1)[0].message).toBe('Alamat lengkap kesalin ✓')
  })

  it('locks on Kunci: content gone, pin screen back, toast', async () => {
    const w = await mountPage()
    await w.find('[data-test="lock"]').trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/personal/lock')
    expect(w.text()).toContain('Data Pribadi kekunci')
    expect(w.text()).not.toContain('3275')
    expect(toastCreate.mock.calls.at(-1)[0].message).toBe('Data Pribadi dikunci 🔒')
  })

  it('shows only the pin screen when locked', async () => {
    const w = await mountPage({ unlocked: false })
    expect(w.find('.p-pad').exists()).toBe(true)
    expect(w.text()).not.toContain('Perlu diurus')
    expect(w.find('[data-test="fab"]').exists()).toBe(false)
  })

  it('has the add button on phone only for Dokumen and Alamat', async () => {
    const w = await mountPage()
    expect(w.find('[data-test="fab"]').text()).toContain('Dokumen')
    await w.find('[data-test="tab-alamat"]').trigger('click')
    expect(w.find('[data-test="fab"]').text()).toContain('Alamat')
    await w.find('[data-test="tab-bio"]').trigger('click')
    expect(w.find('[data-test="fab"]').exists()).toBe(false)
  })

  it('uses two columns from 1100 and three from 1600', async () => {
    const two = await mountPage({ width: 1440 })
    expect(two.find('[data-test="cols-2"]').exists()).toBe(true)
    expect(two.find('[data-test="cols-3"]').exists()).toBe(false)
    expect(two.find('[data-test="seg"]').exists()).toBe(false)
    expect(two.find('[data-test="add-doc"]').exists()).toBe(true)
    const three = await mountPage({ width: 1920 })
    expect(three.find('[data-test="cols-3"]').exists()).toBe(true)
    expect(three.find('[data-test="cols-2"]').exists()).toBe(false)
  })

  describe('opening detail & forms', () => {
    it('phone: tapping a document row pushes its detail page', async () => {
      const w = await mountPage()
      await w.findAll('[data-test="doc-row"]').find((r) => r.text().includes('KTP')).trigger('click')
      expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/data-pribadi/dokumen/1')
    })

    it('phone: FAB opens the new document or new address page, Ubah opens biodata', async () => {
      const w = await mountPage()
      await w.find('[data-test="fab"]').trigger('click')
      expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/data-pribadi/dokumen/baru')
      await w.find('[data-test="tab-alamat"]').trigger('click')
      await w.find('[data-test="fab"]').trigger('click')
      expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/data-pribadi/alamat/baru')
      await w.find('[data-test="address-edit"]').trigger('click')
      expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/data-pribadi/alamat/1/ubah')
      await w.find('[data-test="tab-bio"]').trigger('click')
      await w.find('[data-test="bio-edit"]').trigger('click')
      expect(ionRouter.push).toHaveBeenLastCalledWith('/tabs/menu/data-pribadi/biodata/ubah')
    })

    it('phone: ?dokumen=7 once open goes to that detail and drops the query', async () => {
      const w = await mountPage({ url: '/tabs/menu/data-pribadi?dokumen=6' })
      expect(router.replace).toHaveBeenCalledWith({ path: '/tabs/menu/data-pribadi', query: {} })
      expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/data-pribadi/dokumen/6')
      expect(w.find('[data-test="panel"]').exists()).toBe(false)
    })

    // Notif / Beranda buka link saat kekunci: query harus tahan sampai PIN bener, baru diikuti.
    async function unlockFromLocked(width) {
      const w = await mountPage({ width, url: '/tabs/menu/data-pribadi?dokumen=6', unlocked: false })
      expect(router.replace).not.toHaveBeenCalled()
      expect(router.currentRoute.value.query.dokumen).toBe('6')
      expect(ionRouter.push).not.toHaveBeenCalled()
      expect(w.find('[data-test="panel"]').exists()).toBe(false)
      const open = { configured: true, hasPin: true, unlocked: true }
      api.post.mockImplementation(async (url) => (url === '/personal/unlock' ? { status: open } : {}))
      await usePersonalStore().unlock('123456')
      await flushPromises()
      return w
    }

    it('phone: locked with ?dokumen= keeps the query, then after the PIN goes to the detail and drops it', async () => {
      await unlockFromLocked(390)
      expect(ionRouter.push).toHaveBeenCalledWith('/tabs/menu/data-pribadi/dokumen/6')
      expect(router.replace).toHaveBeenCalledWith({ path: '/tabs/menu/data-pribadi', query: {} })
      expect(router.currentRoute.value.query.dokumen).toBeUndefined()
    })

    it('PC: locked with ?dokumen= keeps the query, then after the PIN opens the panel and drops it', async () => {
      const w = await unlockFromLocked(1440)
      expect(w.find('[data-test="panel"]').classes()).toContain('show')
      expect(w.find('[data-test="panel"]').text()).toContain('SIM C')
      expect(ionRouter.push).not.toHaveBeenCalled()
      expect(router.currentRoute.value.query.dokumen).toBeUndefined()
    })

    it('ignores ?dokumen= of a document that is not there but still drops it', async () => {
      await mountPage({ url: '/tabs/menu/data-pribadi?dokumen=999' })
      expect(ionRouter.push).not.toHaveBeenCalled()
      expect(router.replace).toHaveBeenCalledWith({ path: '/tabs/menu/data-pribadi', query: {} })
    })

    it('PC: ?dokumen=6 opens the detail panel and drops the query', async () => {
      const w = await mountPage({ width: 1440, url: '/tabs/menu/data-pribadi?dokumen=6' })
      expect(w.find('[data-test="panel"]').classes()).toContain('show')
      expect(w.find('[data-test="panel"]').text()).toContain('SIM C')
      expect(ionRouter.push).not.toHaveBeenCalled()
      expect(router.replace).toHaveBeenCalledWith({ path: '/tabs/menu/data-pribadi', query: {} })
    })

    it('phone: ?tab=bio opens on Biodata and drops the query', async () => {
      const w = await mountPage({ url: '/tabs/menu/data-pribadi?tab=bio' })
      expect(w.find('[data-test="tab-bio"]').classes()).toContain('on')
      expect(router.replace).toHaveBeenCalledWith({ path: '/tabs/menu/data-pribadi', query: {} })
      expect(ionRouter.push).not.toHaveBeenCalled()
    })

    it('phone: locked with ?tab=bio keeps the query, then after the PIN opens Biodata and drops it', async () => {
      const w = await mountPage({ url: '/tabs/menu/data-pribadi?tab=bio', unlocked: false })
      expect(router.replace).not.toHaveBeenCalled()
      expect(router.currentRoute.value.query.tab).toBe('bio')
      const open = { configured: true, hasPin: true, unlocked: true }
      api.post.mockImplementation(async (url) => (url === '/personal/unlock' ? { status: open } : {}))
      await usePersonalStore().unlock('123456')
      await flushPromises()
      expect(w.find('[data-test="tab-bio"]').classes()).toContain('on')
      expect(router.currentRoute.value.query.tab).toBeUndefined()
    })

    it('ignores an unknown ?tab= but still drops it', async () => {
      const w = await mountPage({ url: '/tabs/menu/data-pribadi?tab=ngaco' })
      expect(w.find('[data-test="tab-dokumen"]').classes()).toContain('on')
      expect(router.replace).toHaveBeenCalledWith({ path: '/tabs/menu/data-pribadi', query: {} })
    })

    it('PC: ?tab=bio just drops the query (everything is shown)', async () => {
      const w = await mountPage({ width: 1440, url: '/tabs/menu/data-pribadi?tab=bio' })
      expect(router.replace).toHaveBeenCalledWith({ path: '/tabs/menu/data-pribadi', query: {} })
      expect(w.find('[data-test="panel"]').classes()).not.toContain('show')
    })

    it('PC: ?panel=addr-new from a redirected sub page opens the form panel', async () => {
      const w = await mountPage({ width: 1440, url: '/tabs/menu/data-pribadi?panel=addr-new' })
      expect(w.find('[data-test="panel"]').classes()).toContain('show')
      expect(w.find('[data-test="panel"]').text()).toContain('Alamat baru')
    })

    it('PC: clicking a document opens a panel; Esc closes it, but not while a sheet is open', async () => {
      const w = await mountPage({ width: 1440 })
      await w.findAll('[data-test="doc-row"]')[0].trigger('click')
      expect(w.find('[data-test="panel"]').classes()).toContain('show')
      const sheet = document.createElement('ion-action-sheet')
      document.body.appendChild(sheet)
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()
      expect(w.find('[data-test="panel"]').classes()).toContain('show')
      sheet.remove()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()
      expect(w.find('[data-test="panel"]').classes()).not.toContain('show')
    })

    it('PC: Tambah dokumen, + Alamat and biodata Ubah open panels', async () => {
      const w = await mountPage({ width: 1440 })
      await w.find('[data-test="add-doc"]').trigger('click')
      expect(w.find('[data-test="panel"]').text()).toContain('Dokumen apa?')
      await w.find('[data-test="add-address"]').trigger('click')
      expect(w.find('[data-test="panel"]').text()).toContain('Alamat baru')
      await w.find('[data-test="bio-edit"]').trigger('click')
      expect(w.find('[data-test="panel"]').text()).toContain('Ubah biodata')
    })

    it('PC: editing from the detail swaps the panel to the form, saving returns to the detail with a toast', async () => {
      const w = await mountPage({ width: 1440 })
      await w.findAll('[data-test="doc-row"]').find((r) => r.text().includes('SIM C')).trigger('click')
      await w.find('[data-test="edit"]').trigger('click')
      expect(w.find('[data-test="panel"]').text()).toContain('Ubah SIM C')
      api.put.mockResolvedValue({ document: full.documents[1] })
      await w.find('[data-test="panel"] form').trigger('submit')
      await flushPromises()
      expect(toastCreate.mock.calls.at(-1)[0].message).toBe('Kesimpen ✓')
      expect(w.find('[data-test="panel"]').classes()).toContain('show')
      expect(w.find('[data-test="edit"]').exists()).toBe(true)
    })

    it('PC: the panel refuses to close while saving', async () => {
      const w = await mountPage({ width: 1440 })
      await w.find('[data-test="add-address"]').trigger('click')
      await w.find('[data-test="f-name"]').setValue('Kantor')
      api.post.mockReturnValue(new Promise(() => {}))
      await w.find('[data-test="panel"] form').trigger('submit')
      await w.find('.pp-x').trigger('click')
      await w.find('.pp-scrim').trigger('click')
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()
      expect(w.find('[data-test="panel"]').classes()).toContain('show')
    })

    it('PC: locking closes the panel for good', async () => {
      const w = await mountPage({ width: 1440 })
      await w.findAll('[data-test="doc-row"]')[0].trigger('click')
      await w.find('[data-test="lock"]').trigger('click')
      await flushPromises()
      expect(w.find('[data-test="panel"]').exists()).toBe(false)
      expect(w.text()).not.toContain('3275')
    })
  })
})
