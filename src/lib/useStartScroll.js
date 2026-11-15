import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'

/**
 * Scroll awal area jam (Agenda PC) ke menit tertentu. Pas halaman Ionic masih disembunyiin (lagi transisi) browser nolak
 * scroll-nya, jadi kalau belum nyangkut dicoba lagi begitu areanya keliatan (ResizeObserver).
 * Diulang tiap salah satu `sources` berubah (mis. ganti tanggal / acara pertama baru kemuat).
 */
export function useStartScroll(scroller, startMinute, hourPx, sources) {
  let pending = false
  function apply() {
    const el = scroller.value
    if (!pending || !el) return
    // −10px: label jam paling atas jangan kepotong.
    const target = Math.max(0, (startMinute.value / 60) * hourPx - 10)
    el.scrollTop = target
    if (Math.abs(el.scrollTop - target) < 1) pending = false
  }
  async function scrollToStart() {
    pending = true
    await nextTick()
    apply()
  }
  let observer = null
  onMounted(() => {
    if (typeof ResizeObserver !== 'undefined' && scroller.value) {
      observer = new ResizeObserver(apply)
      observer.observe(scroller.value)
    }
    scrollToStart()
  })
  onBeforeUnmount(() => observer?.disconnect())
  watch([...sources, startMinute], scrollToStart)
}
