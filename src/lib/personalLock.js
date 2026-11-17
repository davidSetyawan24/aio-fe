/** Kapan Data Pribadi dikunci lagi dari sisi app: keluar dari halamannya, atau app ditinggal lama di background. */
export const PERSONAL_BASE = '/tabs/menu/data-pribadi'
export const AWAY_LIMIT_MS = 300_000

const bare = (path) => String(path ?? '').split(/[?#]/)[0].replace(/\/+$/, '')
const inside = (path) => {
  const p = bare(path)
  return p === PERSONAL_BASE || p.startsWith(`${PERSONAL_BASE}/`)
}

/** Pindah dari dalem Data Pribadi ke luar? (daftar → detail → form di dalemnya nggak dihitung.) */
export const leavesPersonal = (fromPath, toPath) => inside(fromPath) && !inside(toPath)

/** Pasang penjaga kunci. Balikin fungsi buat nyopot. */
export function installPersonalLock({ router, store, doc = document, now = Date.now }) {
  const stop = router.afterEach((to, from) => {
    if (leavesPersonal(from.path, to.path)) store.lock()
  })
  let hiddenAt = null
  const onVisibility = () => {
    if (doc.visibilityState === 'hidden') {
      hiddenAt = now()
      return
    }
    const away = hiddenAt === null ? 0 : now() - hiddenAt
    hiddenAt = null
    if (away > AWAY_LIMIT_MS) store.lock()
  }
  doc.addEventListener('visibilitychange', onVisibility)
  return () => {
    stop?.()
    doc.removeEventListener('visibilitychange', onVisibility)
  }
}
