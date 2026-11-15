/** Angka merah di ikon app = notif belum dibaca. Browser yang nggak dukung / nolak → diem aja. */
export async function syncBadge(unread, nav = globalThis.navigator) {
  try {
    if (unread > 0) await nav?.setAppBadge?.(unread)
    else await nav?.clearAppBadge?.()
  } catch {
    // nggak penting: angka di ikon cuma pemanis
  }
}
