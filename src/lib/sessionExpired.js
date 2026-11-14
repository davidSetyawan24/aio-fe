/**
 * Sesi habis di tengah jalan (request apa pun dapet 401) → balik ke login sambil inget halaman terakhir.
 * Cuma jalan kalau statusnya masih "authed": password salah di halaman login atau beberapa 401 barengan
 * nggak bikin redirect berulang.
 */
export function handleSessionExpired(auth, router) {
  if (auth.status !== 'authed') return
  auth.markGuest()
  const current = router.currentRoute.value
  if (current.path !== '/login') router.replace({ path: '/login', query: { redirect: current.fullPath } })
}
