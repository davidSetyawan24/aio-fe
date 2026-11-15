import { nextTick, onBeforeUnmount, watch } from 'vue'

/**
 * Scroll area jam (Agenda PC):
 * - Pertama keliatan / ganti tanggal → ke `startMinute` (07.00 atau sebelum acara pertama), −10px biar label jam nggak kepotong.
 * - Acara pertama baru kemuat → ikut, TAPI cuma kalau user belum nge-scroll sendiri.
 * - Halaman Ionic disembunyiin (display: none) lalu muncul lagi → balik ke posisi terakhir user.
 * - Area jamnya baru muncul belakangan (mis. iPad diputer ke landscape) → tetep di-scroll.
 * Kapan "keliatan" dipantau pakai ResizeObserver (tinggi 0 = lagi disembunyiin).
 */
export function useStartScroll(scroller, startMinute, hourPx, sources) {
  let pending = true
  let hidden = true
  let lastAuto = null
  let userTop = null
  const target = () => Math.max(0, (startMinute.value / 60) * hourPx - 10)
  const userMoved = () => userTop != null && lastAuto != null && Math.abs(userTop - lastAuto) >= 2

  function apply() {
    const el = scroller.value
    if (!el) return
    if (el.clientHeight === 0) {
      hidden = true
      return
    }
    if (pending) {
      el.scrollTop = target()
      lastAuto = el.scrollTop // bisa kepotong (jendela tinggi) — tetep dianggep beres, nggak dicoba lagi
      userTop = null
      pending = false
    } else if (hidden) {
      el.scrollTop = userTop ?? lastAuto ?? 0
    }
    hidden = false
  }
  function onScroll() {
    const el = scroller.value
    if (el && el.clientHeight > 0) userTop = el.scrollTop
  }
  async function scrollToStart() {
    pending = true
    await nextTick()
    apply()
  }

  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null
  watch(
    scroller,
    (el, old) => {
      if (old) {
        observer?.unobserve(old)
        old.removeEventListener('scroll', onScroll)
      }
      if (!el) return
      observer?.observe(el)
      el.addEventListener('scroll', onScroll, { passive: true })
      hidden = true
      scrollToStart()
    },
    { flush: 'post', immediate: true },
  )
  onBeforeUnmount(() => {
    observer?.disconnect()
    scroller.value?.removeEventListener('scroll', onScroll)
  })
  // Ganti tanggal / minggu → selalu scroll ulang.
  watch(sources, scrollToStart)
  // Acara pertama berubah (data baru kemuat) → ikut, kecuali user udah nge-scroll sendiri.
  watch(startMinute, () => {
    if (!userMoved()) scrollToStart()
  })
}
