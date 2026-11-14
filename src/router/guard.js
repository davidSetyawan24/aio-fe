const HOME = '/tabs/home'

/** Redirect cuma boleh ke halaman di dalam app (cegah dilempar ke situs lain lewat ?redirect=). */
const safeRedirect = (value) => (typeof value === 'string' && value.startsWith('/tabs/') ? value : HOME)

/**
 * Keputusan navigasi berdasarkan status login.
 * true = boleh lanjut; objek = alihkan ke sana.
 * unknown/offline nggak dialihkan: App.vue yang nampilin layar pembuka / offline.
 */
export function decideNavigation(to, status) {
  if (status === 'authed' && to.path === '/login') return { path: safeRedirect(to.query?.redirect) }
  if (status === 'guest' && !to.meta?.public) return { path: '/login', query: { redirect: to.fullPath } }
  return true
}
