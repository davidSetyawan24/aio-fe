import { decideNavigation } from '@/router/guard.js'

/**
 * Tombol "Coba lagi" di layar offline: cek status login lagi, terus putusin ulang halaman yang bener.
 * (router.replace ke URL yang sama nggak jalanin penjaga halaman, jadi keputusannya diambil langsung di sini.)
 */
export async function retryConnection(auth, router) {
  await auth.check()
  if (auth.status === 'offline') return
  const next = decideNavigation(router.currentRoute.value, auth.status)
  if (next !== true) await router.replace(next)
}
