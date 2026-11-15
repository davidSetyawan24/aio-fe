import { buildTabRoutes } from './tabRoutes.js'

const stub = { render: () => null }
const passwordStub = { render: () => null }
const deviceStub = { render: () => null }
const walletStub = { render: () => null }
const walletFormStub = { render: () => null }
const notifStub = { render: () => null }
const categoryStub = { render: () => null }
const duitStub = { render: () => null }
const expenseFormStub = { render: () => null }
const categoryFormStub = { render: () => null }
const notifSettingsStub = { render: () => null }
const budgetStub = { render: () => null }
const splitStub = { render: () => null }
const splitDetailStub = { render: () => null }
const splitFormStub = { render: () => null }
const agendaStub = { render: () => null }
const agendaFormStub = { render: () => null }
const billsStub = { render: () => null }
const billFormStub = { render: () => null }
const uangStub = { render: () => null }
const routes = buildTabRoutes({
  ComingSoon: stub, MenuPage: stub, ProfilePage: stub, ChangePasswordPage: passwordStub, DevicePage: deviceStub,
  NotificationsPage: notifStub, NotificationSettingsPage: notifSettingsStub, WalletPage: walletStub, WalletFormPage: walletFormStub,
  CategoryPage: categoryStub, CategoryFormPage: categoryFormStub, DuitPage: duitStub, ExpenseFormPage: expenseFormStub,
  BudgetPage: budgetStub, SplitBillPage: splitStub, SplitBillDetailPage: splitDetailStub, SplitBillFormPage: splitFormStub, AgendaPage: agendaStub, AgendaFormPage: agendaFormStub,
  BayarRutinPage: billsStub, BayarRutinFormPage: billFormStub, UangPage: uangStub,
})
const find = (path) => routes.find((r) => r.path === path)

describe('buildTabRoutes', () => {
  it('has a page for every tab', () => {
    for (const p of ['home', 'uang', 'agenda', 'menu', 'profil']) expect(find(p), p).toBeTruthy()
  })

  it('opens modules outside the tab bar under menu/<key>, with a back button to Semua menu', () => {
    const invoice = find('menu/invoice')
    expect(invoice.props).toMatchObject({ title: 'Invoice', emoji: '📄', backTo: '/tabs/menu' })
    for (const key of ['invoice', 'catatan']) expect(find(`menu/${key}`), key).toBeTruthy()
  })

  it('opens the Uang tab on its own page', () => {
    expect(find('uang').component).toBe(uangStub)
  })

  it('opens the Agenda tab on its own page', () => {
    expect(find('agenda').component).toBe(agendaStub)
    for (const p of ['agenda/baru', 'agenda/acara/:id/ubah', 'agenda/todo/:id/ubah']) expect(find(p)?.component, p).toBe(agendaFormStub)
  })

  it('sends the old Duit tab link to the Uang tab', () => {
    expect(find('duit').redirect).toBe('/tabs/uang')
  })

  it('opens Duit, the Catat screen and an expense under Semua menu', () => {
    expect(find('menu/duit').component).toBe(duitStub)
    expect(find('menu/duit/catat').component).toBe(expenseFormStub)
    expect(find('menu/duit/:id').component).toBe(expenseFormStub)
  })

  it('redirects old links to the new module pages', () => {
    expect(find('tagihan').redirect).toBe('/tabs/menu/bayar-rutin')
    expect(find('menu/agenda').redirect).toBe('/tabs/agenda')
    expect(find('todo').redirect).toBe('/tabs/agenda')
  })

  it('opens Ganti password under the Profil tab', () => {
    expect(find('profil/password').component).toBe(passwordStub)
  })

  it('opens a device page under the Profil tab', () => {
    expect(find('profil/device/:id').component).toBe(deviceStub)
  })

  it('opens Kartu & Rekening and its form under Semua menu', () => {
    expect(find('menu/kartu').component).toBe(walletStub)
    expect(find('menu/kartu/tambah').component).toBe(walletFormStub)
    expect(find('menu/kartu/:id').component).toBe(walletFormStub)
  })

  it('opens Kategori and its form under Semua menu', () => {
    expect(find('menu/kategori').component).toBe(categoryStub)
    expect(find('menu/kategori/tambah').component).toBe(categoryFormStub)
    expect(find('menu/kategori/:id').component).toBe(categoryFormStub)
  })

  it('opens Atur budget under Semua menu', () => {
    expect(find('menu/budget').component).toBe(budgetStub)
  })

  it('opens Split bill and a bill\'s detail under Semua menu', () => {
    expect(find('menu/split-bill').component).toBe(splitStub)
    expect(find('menu/split-bill/:id').component).toBe(splitDetailStub)
    expect(find('menu/split-bill/baru').component).toBe(splitFormStub)
    expect(find('menu/split-bill/:id/ubah').component).toBe(splitFormStub)
  })

  it('opens Bayar Rutin and its form under Semua menu', () => {
    expect(find('menu/bayar-rutin').component).toBe(billsStub)
    expect(find('menu/bayar-rutin/baru').component).toBe(billFormStub)
    expect(find('menu/bayar-rutin/:id/ubah').component).toBe(billFormStub)
  })

  it('has the notifications pages', () => {
    expect(find('notifikasi').component).toBe(notifStub)
    expect(find('notifikasi/atur').component).toBe(notifSettingsStub)
  })

  it('gives tab root pages the bell, detail module pages not', () => {
    expect(find('home').props.bell).toBe(true)
    expect(find('menu/invoice').props.bell).toBeFalsy()
  })

  it('redirects the empty tab path to Beranda', () => {
    expect(find('').redirect).toBe('/tabs/home')
  })
})
