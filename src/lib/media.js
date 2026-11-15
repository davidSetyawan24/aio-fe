import { onBeforeUnmount, ref } from 'vue'

/** Ikut media query (mis. layar lebar ≥1100px). Dipakai di setup komponen. */
export function useMedia(query) {
  const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query) : null
  const matches = ref(Boolean(mq?.matches))
  const onChange = (e) => (matches.value = e.matches)
  mq?.addEventListener?.('change', onChange)
  onBeforeUnmount(() => mq?.removeEventListener?.('change', onChange))
  return matches
}
