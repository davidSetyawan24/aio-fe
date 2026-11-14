import { buildTabRoutes } from './tabRoutes.js'

const stub = { render: () => null }
const passwordStub = { render: () => null }
const deviceStub = { render: () => null }
const routes = buildTabRoutes({ ComingSoon: stub, MenuPage: stub, ProfilePage: stub, ChangePasswordPage: passwordStub, DevicePage: deviceStub })
const find = (path) => routes.find((r) => r.path === path)

describe('buildTabRoutes', () => {
  it('has a page for every tab', () => {
    for (const p of ['home', 'duit', 'todo', 'menu', 'profil']) expect(find(p), p).toBeTruthy()
  })

  it('opens modules outside the tab bar under menu/<key>, with a back button to Semua menu', () => {
    const tagihan = find('menu/tagihan')
    expect(tagihan.props).toMatchObject({ title: 'Tagihan', emoji: '🧾', backTo: '/tabs/menu' })
    for (const key of ['invoice', 'agenda', 'catatan']) expect(find(`menu/${key}`), key).toBeTruthy()
  })

  it('redirects old links to the new module pages', () => {
    expect(find('tagihan').redirect).toBe('/tabs/menu/tagihan')
    expect(find('agenda').redirect).toBe('/tabs/menu/agenda')
  })

  it('opens Ganti password under the Profil tab', () => {
    expect(find('profil/password').component).toBe(passwordStub)
  })

  it('opens a device page under the Profil tab', () => {
    expect(find('profil/device/:id').component).toBe(deviceStub)
  })

  it('redirects the empty tab path to Beranda', () => {
    expect(find('').redirect).toBe('/tabs/home')
  })
})
