import { categories, groupByCategory, modulePath, modules, searchModules, tabItems } from './registry.js'

describe('module registry', () => {
  it('has the tab bar in the agreed order', () => {
    // 14/11: tab "Duit" jadi "Uang" (laporan); "Duit" (catat duit keluar) pindah ke Semua menu.
    // 15/11: tab "To-do" diganti "Agenda"; to-do nanti tinggal di dalem Agenda.
    expect(tabItems().map((t) => t.label)).toEqual(['Beranda', 'Uang', 'Agenda', 'Semua menu', 'Profil'])
    expect(tabItems().map((t) => t.path)).toEqual(['/tabs/home', '/tabs/uang', '/tabs/agenda', '/tabs/menu', '/tabs/profil'])
  })

  it('puts modules outside the tab bar under /tabs/menu so that tab stays active', () => {
    const byKey = Object.fromEntries(modules.map((m) => [m.key, m]))
    expect(modulePath(byKey['bayar-rutin'])).toBe('/tabs/menu/bayar-rutin')
    expect(modulePath(byKey.duit)).toBe('/tabs/menu/duit')
    expect(modulePath(byKey.uang)).toBe('/tabs/uang')
    expect(modulePath(byKey.agenda)).toBe('/tabs/agenda')
  })

  it('has the agreed modules, Duit, Atur budget, Kartu & Rekening and Kategori ready', () => {
    expect(modules.map((m) => m.label)).toEqual(['Uang', 'Duit', 'Atur budget', 'Kartu & Rekening', 'Kategori', 'Bayar Rutin', 'Invoice', 'Split bill', 'Agenda', 'Catatan', 'Badan', 'Data Pribadi', 'CCTV', 'Kalender Dia'])
    expect(modules.filter((m) => m.status === 'ready').map((m) => m.key)).toEqual(['uang', 'duit', 'budget', 'kartu', 'kategori', 'bayar-rutin', 'invoice', 'split-bill', 'agenda', 'badan', 'data-pribadi', 'cctv'])
    expect(modulePath(modules.find((m) => m.key === 'budget'))).toBe('/tabs/menu/budget')
    expect(modulePath(modules.find((m) => m.key === 'kategori'))).toBe('/tabs/menu/kategori')
  })

  it('groups modules by category in category order', () => {
    const groups = groupByCategory(modules)
    expect(groups.map((g) => g.label)).toEqual(['Keuangan', 'Produktivitas', 'Kesehatan', 'Pribadi'])
    expect(groups[0].modules.map((m) => m.label)).toEqual(['Uang', 'Duit', 'Atur budget', 'Kartu & Rekening', 'Kategori', 'Bayar Rutin', 'Invoice', 'Split bill'])
    expect(groups[1].modules.map((m) => m.label)).toEqual(['Agenda', 'Catatan'])
    expect(groups[2].modules.map((m) => m.label)).toEqual(['Badan'])
    expect(groups[3].modules.map((m) => m.label)).toEqual(['Data Pribadi', 'CCTV', 'Kalender Dia'])
    expect(categories.map((c) => c.key)).toEqual(['keuangan', 'produktivitas', 'kesehatan', 'pribadi'])
  })

  it('finds Kalender Dia when typing "kalender"', () => {
    expect(searchModules('kalender').map((m) => m.key)).toEqual(['kalender-dia'])
  })

  it('drops empty categories when grouping a filtered list', () => {
    expect(groupByCategory(searchModules('agenda')).map((g) => g.label)).toEqual(['Produktivitas'])
  })

  it('searches by part of the name, ignoring case and spaces', () => {
    expect(searchModules('rutin').map((m) => m.key)).toEqual(['bayar-rutin'])
    expect(searchModules('  BAYAR ').map((m) => m.key)).toEqual(['bayar-rutin'])
    expect(searchModules('').length).toBe(modules.length)
    expect(searchModules('xyz')).toEqual([])
  })
})
