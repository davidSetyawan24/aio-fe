import { PhCalendarBlank, PhChartPieSlice, PhHouse, PhSquaresFour, PhUserCircle } from '@phosphor-icons/vue'

/**
 * SATU-SATUNYA daftar modul AIO Space. Tab bar, sidebar, router, dan halaman "Semua menu" baca dari sini.
 * Modul baru: tambah satu baris. `tab` = urutan di tab bar (kosong = cuma muncul di Semua menu).
 * status: 'soon' (belum ada fiturnya, tampil "Segera") | 'ready'.
 */
export const categories = [
  { key: 'keuangan', label: 'Keuangan' },
  { key: 'produktivitas', label: 'Produktivitas' },
  { key: 'kesehatan', label: 'Kesehatan' },
  { key: 'pribadi', label: 'Pribadi' },
]

export const modules = [
  // Tab "Uang" = rangkuman semua fitur Keuangan per bulan + tombol Catat. "Duit" = catat duit keluar (di Semua menu).
  { key: 'uang', label: 'Uang', emoji: '📊', tint: '#DCEBFF', category: 'keuangan', status: 'ready', tab: 1, icon: PhChartPieSlice },
  { key: 'duit', label: 'Duit', emoji: '💸', tint: '#FFE9D6', category: 'keuangan', status: 'ready' },
  { key: 'budget', label: 'Atur budget', emoji: '🎯', tint: '#E4F7C4', category: 'keuangan', status: 'ready' },
  { key: 'kartu', label: 'Kartu & Rekening', emoji: '💳', tint: '#F3E1FF', category: 'keuangan', status: 'ready' },
  { key: 'kategori', label: 'Kategori', emoji: '🏷️', tint: '#FFF3B8', category: 'keuangan', status: 'ready' },
  // 15/11: "Tagihan" diganti Bayar Rutin (biaya tetap bulanan/tahunan + pengingat).
  { key: 'bayar-rutin', label: 'Bayar Rutin', emoji: '🔁', tint: '#E4F7C4', category: 'keuangan', status: 'ready' },
  { key: 'invoice', label: 'Invoice', emoji: '📄', tint: '#DCEBFF', category: 'keuangan', status: 'ready' },
  // Split bill — foto struk, dibaca Mistral OCR, dibagi ke temen-temen.
  { key: 'split-bill', label: 'Split bill', emoji: '🍕', tint: '#FFE0E6', category: 'keuangan', status: 'ready' },
  // 15/11: tab "To-do" diganti "Agenda"; to-do nanti tinggal di dalem Agenda (bukan modul sendiri).
  { key: 'agenda', label: 'Agenda', emoji: '📅', tint: '#F3E1FF', category: 'produktivitas', status: 'ready', tab: 2, icon: PhCalendarBlank },
  { key: 'catatan', label: 'Catatan', emoji: '📝', tint: '#FFE0E6', category: 'produktivitas', status: 'soon' },
  // 14/11 malem: kalender pribadi, detailnya dibahas nanti.
  // 19/11: timbangan Zepp (upload gambar / isi manual), rata-rata 7 hari, target, grafik.
  { key: 'badan', label: 'Badan', emoji: '⚖️', tint: '#E4F7C4', category: 'kesehatan', status: 'ready' },
  // 21/11: catat latihan (PPLUL), timer istirahat, ringkasan, riwayat, grafik per gerakan.
  { key: 'gym', label: 'Gym', emoji: '🏋️', tint: '#FFE9D6', category: 'kesehatan', status: 'ready' },
  // 18/11: dokumen (KTP, SIM, paspor, STNK…), biodata & alamat — dikunci PIN, isinya dienkripsi di server.
  { key: 'data-pribadi', label: 'Data Pribadi', emoji: '🪪', tint: '#DCEBFF', category: 'pribadi', status: 'ready' },
  // 18/11: liat 2 kamera rumah live — cuma dari Chrome di Mac, lewat app mini "AIO CCTV" di Mac itu (server AIO nggak ikut).
  { key: 'cctv', label: 'CCTV', emoji: '📹', tint: '#DCEBFF', category: 'pribadi', status: 'ready' },
  { key: 'kalender-dia', label: 'Kalender Dia', emoji: '🌙', tint: '#E9E4FF', category: 'pribadi', status: 'soon' },
]

/** Modul di tab bar → /tabs/<key>. Lainnya di bawah /tabs/menu, biar tab "Semua menu" tetap nyala & back ke sana. */
export const modulePath = (m) => (m.tab ? `/tabs/${m.key}` : `/tabs/menu/${m.key}`)

/** Tab bar / sidebar, urut: Beranda · (modul ber-tab) · Semua menu · Profil. */
export function tabItems() {
  const moduleTabs = modules
    .filter((m) => m.tab)
    .sort((a, b) => a.tab - b.tab)
    .map((m) => ({ path: modulePath(m), label: m.label, icon: m.icon }))
  return [
    { path: '/tabs/home', label: 'Beranda', icon: PhHouse },
    ...moduleTabs,
    { path: '/tabs/menu', label: 'Semua menu', icon: PhSquaresFour },
    { path: '/tabs/profil', label: 'Profil', icon: PhUserCircle },
  ]
}

export function groupByCategory(list) {
  return categories
    .map((c) => ({ ...c, modules: list.filter((m) => m.category === c.key) }))
    .filter((g) => g.modules.length > 0)
}

export function searchModules(query) {
  const q = (query ?? '').trim().toLowerCase()
  if (!q) return modules
  return modules.filter((m) => m.label.toLowerCase().includes(q))
}
