import { modulePath, modules } from '@/modules/registry.js'

/** Link lama sebelum navigasi baru (14/11) → alamat baru. */
const OLD_LINKS = { tagihan: '/tabs/menu/bayar-rutin', duit: '/tabs/uang', todo: '/tabs/agenda', 'menu/agenda': '/tabs/agenda' }

/** Rute anak /tabs/ dari daftar modul. Komponen dioper biar file ini gampang dites. */
export function buildTabRoutes(pages) {
  const { ComingSoon, MenuPage, ProfilePage, ChangePasswordPage, DevicePage, NotificationsPage, NotificationSettingsPage, WalletPage, WalletFormPage, CategoryPage, CategoryFormPage, DuitPage, ExpenseFormPage, BudgetPage, SplitBillPage, SplitBillDetailPage, SplitBillFormPage, AgendaPage, AgendaFormPage, BayarRutinPage, BayarRutinFormPage, UangPage, InvoicePage, InvoiceDetailPage, InvoiceSettingsPage, InvoiceFormPage, HomePage, PersonalPage, PersonalSubPage, CctvPage, BadanPage } = pages
  // Modul yang udah jadi pakai halamannya sendiri; sisanya halaman "Segera".
  const ready = { uang: UangPage, duit: DuitPage, budget: BudgetPage, kartu: WalletPage, kategori: CategoryPage, 'split-bill': SplitBillPage, agenda: AgendaPage, 'bayar-rutin': BayarRutinPage, invoice: InvoicePage, 'data-pribadi': PersonalPage, cctv: CctvPage, badan: BadanPage }
  const moduleRoutes = modules.map((m) => {
    const path = modulePath(m).replace('/tabs/', '')
    if (ready[m.key]) return { path, component: ready[m.key] }
    return { path, component: ComingSoon, props: { title: m.label, emoji: m.emoji, ...(m.tab ? { bell: true } : { backTo: '/tabs/menu' }) } }
  })
  return [
    { path: '', redirect: '/tabs/home' },
    { path: 'home', component: HomePage },
    ...moduleRoutes,
    { path: 'menu', component: MenuPage },
    { path: 'profil', component: ProfilePage },
    { path: 'profil/password', component: ChangePasswordPage },
    { path: 'profil/device/:id', component: DevicePage },
    { path: 'menu/kartu/tambah', component: WalletFormPage },
    { path: 'menu/kartu/:id', component: WalletFormPage },
    { path: 'menu/duit/catat', component: ExpenseFormPage },
    { path: 'menu/duit/:id', component: ExpenseFormPage },
    { path: 'menu/kategori/tambah', component: CategoryFormPage },
    { path: 'menu/kategori/:id', component: CategoryFormPage },
    { path: 'menu/split-bill/baru', component: SplitBillFormPage },
    { path: 'menu/split-bill/:id', component: SplitBillDetailPage },
    { path: 'menu/split-bill/:id/ubah', component: SplitBillFormPage },
    { path: 'menu/bayar-rutin/baru', component: BayarRutinFormPage },
    { path: 'menu/bayar-rutin/:id/ubah', component: BayarRutinFormPage },
    // Yang statis (atur, baru) ditulis sebelum :id biar gampang dibaca; vue-router sendiri tetep ngutamain yang statis.
    { path: 'menu/invoice/atur', component: InvoiceSettingsPage },
    { path: 'menu/invoice/baru', component: InvoiceFormPage },
    { path: 'menu/invoice/:id', component: InvoiceDetailPage },
    { path: 'menu/invoice/:id/ubah', component: InvoiceFormPage },
    // Rute anak Data Pribadi: satu halaman pembungkus, `meta.view` yang nentuin isinya.
    { path: 'menu/data-pribadi/dokumen/baru', component: PersonalSubPage, meta: { view: 'doc-new' } },
    { path: 'menu/data-pribadi/dokumen/:id', component: PersonalSubPage, meta: { view: 'doc' } },
    { path: 'menu/data-pribadi/dokumen/:id/ubah', component: PersonalSubPage, meta: { view: 'doc-edit' } },
    { path: 'menu/data-pribadi/alamat/baru', component: PersonalSubPage, meta: { view: 'addr-new' } },
    { path: 'menu/data-pribadi/alamat/:id/ubah', component: PersonalSubPage, meta: { view: 'addr-edit' } },
    { path: 'menu/data-pribadi/biodata/ubah', component: PersonalSubPage, meta: { view: 'bio' } },
    { path: 'agenda/baru', component: AgendaFormPage },
    { path: 'agenda/acara/:id/ubah', component: AgendaFormPage },
    { path: 'agenda/todo/:id/ubah', component: AgendaFormPage },
    { path: 'notifikasi', component: NotificationsPage },
    { path: 'notifikasi/atur', component: NotificationSettingsPage },
    ...Object.entries(OLD_LINKS).map(([path, redirect]) => ({ path, redirect })),
  ]
}
