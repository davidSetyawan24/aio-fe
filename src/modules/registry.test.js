import { categories, groupByCategory, modulePath, modules, searchModules, tabItems } from './registry.js'

describe('module registry', () => {
  it('has the tab bar in the agreed order', () => {
    // 14/11: tab "Duit" jadi "Uang" (laporan); "Duit" (catat duit keluar) pindah ke Semua menu.
    expect(tabItems().map((t) => t.label)).toEqual(['Beranda', 'Uang', 'To-do', 'Semua menu', 'Profil'])
    expect(tabItems().map((t) => t.path)).toEqual(['/tabs/home', '/tabs/uang', '/tabs/todo', '/tabs/menu', '/tabs/profil'])
  })

  it('puts modules outside the tab bar under /tabs/menu so that tab stays active', () => {
    const byKey = Object.fromEntries(modules.map((m) => [m.key, m]))
    expect(modulePath(byKey.tagihan)).toBe('/tabs/menu/tagihan')
    expect(modulePath(byKey.duit)).toBe('/tabs/menu/duit')
    expect(modulePath(byKey.uang)).toBe('/tabs/uang')
    expect(modulePath(byKey.todo)).toBe('/tabs/todo')
  })

  it('has the agreed modules, Kartu & Rekening and Kategori ready', () => {
    expect(modules.map((m) => m.label)).toEqual(['Uang', 'Duit', 'Kartu & Rekening', 'Kategori', 'Tagihan', 'Invoice', 'To-do', 'Agenda', 'Catatan'])
    expect(modules.filter((m) => m.status === 'ready').map((m) => m.key)).toEqual(['kartu', 'kategori'])
    expect(modulePath(modules.find((m) => m.key === 'kategori'))).toBe('/tabs/menu/kategori')
  })

  it('groups modules by category in category order', () => {
    const groups = groupByCategory(modules)
    expect(groups.map((g) => g.label)).toEqual(['Keuangan', 'Produktivitas'])
    expect(groups[0].modules.map((m) => m.label)).toEqual(['Uang', 'Duit', 'Kartu & Rekening', 'Kategori', 'Tagihan', 'Invoice'])
    expect(groups[1].modules.map((m) => m.label)).toEqual(['To-do', 'Agenda', 'Catatan'])
    expect(categories.map((c) => c.key)).toEqual(['keuangan', 'produktivitas'])
  })

  it('drops empty categories when grouping a filtered list', () => {
    expect(groupByCategory(searchModules('agenda')).map((g) => g.label)).toEqual(['Produktivitas'])
  })

  it('searches by part of the name, ignoring case and spaces', () => {
    expect(searchModules('tagih').map((m) => m.key)).toEqual(['tagihan'])
    expect(searchModules('  TAGIHAN ').map((m) => m.key)).toEqual(['tagihan'])
    expect(searchModules('').length).toBe(modules.length)
    expect(searchModules('xyz')).toEqual([])
  })
})
