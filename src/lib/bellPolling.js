/** Pengingat Agenda masuk lonceng dari server tiap menit → angka lonceng disegerin tiap 60 detik selama app kebuka & keliatan. */
export function startBellPolling(refresh, { every = 60_000, doc = document } = {}) {
  const timer = setInterval(() => {
    if (doc.visibilityState === 'visible') refresh()
  }, every)
  return () => clearInterval(timer)
}
