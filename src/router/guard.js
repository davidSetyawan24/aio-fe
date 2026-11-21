const HOME = '/tabs/home'
/** Sesi Gym yang lagi jalan: satu-satunya halaman yang tetep jalan tanpa server (dari draf di HP). */
export const GYM_LIVE_PATH = '/tabs/menu/gym/sesi'

/** Redirect cuma boleh ke halaman di dalam app (cegah dilempar ke situs lain lewat ?redirect=). */
const safeRedirect = (value) => (typeof value === 'string' && value.startsWith('/tabs/') ? value : HOME)

/**
 * Keputusan navigasi berdasarkan status login.
 * true = boleh lanjut; objek = alihkan ke sana.
 * unknown/offline nggak dialihkan: App.vue yang nampilin layar pembuka / offline.
 * Pengecualian: app dibuka (navigasi pertama) tanpa sinyal & ada draf sesi Gym di HP (`gymDraft`) → langsung ke sesi live.
 */
export function decideNavigation(to, status, { gymDraft = false, first = false } = {}) {
  if (status === 'offline' && gymDraft && first && to.path !== GYM_LIVE_PATH) return { path: GYM_LIVE_PATH }
  if (status === 'authed' && to.path === '/login') return { path: safeRedirect(to.query?.redirect) }
  if (status === 'guest' && !to.meta?.public) return { path: '/login', query: { redirect: to.fullPath } }
  return true
}
