/** Kategori pengeluaran: pilihan warna & emoji di form. */

/** Pastel lembut (design.md: tint kategori). */
export const CATEGORY_TINTS = ['#FFE9D6', '#DCEBFF', '#F3E1FF', '#E4F7C4', '#FFE0E6', '#FFF3B8', '#D8F3EE', '#ECEBE6']

export const CATEGORY_EMOJIS = [
  '🍜', '☕', '🛒', '🚗', '🎬', '💊', '👕', '🎁', '🏋️', '✂️', '🐱', '📚',
  '🎮', '⛽', '🅿️', '🍰', '🧋', '🏠', '💡', '📱', '✈️', '🧴', '💈', '🙏',
]

/**
 * Ringkasan bulan ini buat kartu hitam Kategori (PC).
 * `usage` = { [categoryId]: { count, total } } dari catatan Duit bulan ini.
 */
export function categoryMonthSummary(categories, usage) {
  let total = 0
  let usedCount = 0
  let top = null
  for (const category of categories) {
    const u = usage[category.id]
    if (!u?.count) continue
    usedCount += 1
    total += u.total
    if (!top || u.total > top.total) top = { category, total: u.total, count: u.count }
  }
  return { total, usedCount, unusedCount: categories.length - usedCount, top }
}
