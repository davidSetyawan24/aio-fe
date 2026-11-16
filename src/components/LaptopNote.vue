<template>
  <div v-if="show" class="lnote rise">
    <span class="ic">💻</span>
    <div class="grow">
      <b>Lebih enak di laptop</b>
      <span>Bikin invoice paling nyaman di layar lebar: form di kiri, PDF-nya langsung keliatan di kanan. Di HP tetep bisa kok.</span>
    </div>
    <button data-test="close" aria-label="Tutup" @click="close"><PhX :size="16" /></button>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { PhX } from '@phosphor-icons/vue'
import { useMedia } from '@/lib/media.js'

const KEY = 'aio-invoice-laptop-note'
const wide = useMedia('(min-width: 1100px)')

function wasClosed() {
  try {
    return localStorage.getItem(KEY) === 'closed'
  } catch {
    return false
  }
}
const closed = ref(wasClosed())
const show = computed(() => !wide.value && !closed.value)

function close() {
  closed.value = true
  try {
    localStorage.setItem(KEY, 'closed')
  } catch {
    // nggak kesimpen = muncul lagi nanti, nggak apa-apa
  }
}
</script>

<style scoped>
.lnote { display: flex; gap: 12px; align-items: flex-start; padding: 12px 10px 12px 12px; border-radius: 22px; background: var(--card); box-shadow: 0 0 0 1px var(--hair); margin: 2px 0 4px; }
.ic { width: 40px; height: 40px; border-radius: 14px; background: #E4F7C4; display: grid; place-items: center; font-size: 20px; flex: none; }
:root.theme-dark .ic { background: rgba(200, 240, 74, .14); }
b { display: block; font-size: 14px; font-weight: 800; margin-top: 1px; }
.grow > span { display: block; font-size: 12.5px; color: var(--muted); font-weight: 500; line-height: 1.45; margin-top: 3px; }
button { border: 0; background: transparent; color: var(--muted); cursor: pointer; padding: 4px; flex: none; }
</style>
