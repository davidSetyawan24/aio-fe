import { modulePath, modules } from '@/modules/registry.js'

/** Link lama sebelum navigasi baru (14/11) → alamat baru. */
const OLD_LINKS = { tagihan: '/tabs/menu/tagihan', agenda: '/tabs/menu/agenda', duit: '/tabs/uang' }

/** Rute anak /tabs/ dari daftar modul. Komponen dioper biar file ini gampang dites. */
export function buildTabRoutes(pages) {
  const { ComingSoon, MenuPage, ProfilePage, ChangePasswordPage, DevicePage, NotificationsPage, NotificationSettingsPage, WalletPage, WalletFormPage, CategoryPage, CategoryFormPage } = pages
  // Modul yang udah jadi pakai halamannya sendiri; sisanya halaman "Segera".
  const ready = { kartu: WalletPage, kategori: CategoryPage }
  const moduleRoutes = modules.map((m) => {
    const path = modulePath(m).replace('/tabs/', '')
    if (ready[m.key]) return { path, component: ready[m.key] }
    return { path, component: ComingSoon, props: { title: m.label, emoji: m.emoji, ...(m.tab ? { bell: true } : { backTo: '/tabs/menu' }) } }
  })
  return [
    { path: '', redirect: '/tabs/home' },
    { path: 'home', component: ComingSoon, props: { title: 'Beranda', emoji: '🏠', bell: true } },
    ...moduleRoutes,
    { path: 'menu', component: MenuPage },
    { path: 'profil', component: ProfilePage },
    { path: 'profil/password', component: ChangePasswordPage },
    { path: 'profil/device/:id', component: DevicePage },
    { path: 'menu/kartu/tambah', component: WalletFormPage },
    { path: 'menu/kartu/:id', component: WalletFormPage },
    { path: 'menu/kategori/tambah', component: CategoryFormPage },
    { path: 'menu/kategori/:id', component: CategoryFormPage },
    { path: 'notifikasi', component: NotificationsPage },
    { path: 'notifikasi/atur', component: NotificationSettingsPage },
    ...Object.entries(OLD_LINKS).map(([path, redirect]) => ({ path, redirect })),
  ]
}
