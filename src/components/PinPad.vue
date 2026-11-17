<template>
  <div class="p-lock">
    <div class="p-lic"><PhLockKey :size="34" weight="fill" /></div>
    <h2>{{ copy.title }}</h2>
    <p>{{ copy.hint }}</p>
    <div class="p-dots" :class="{ shake }" data-test="dots" aria-hidden="true">
      <i v-for="n in 6" :key="n" :class="{ on: n <= pin.length }" />
    </div>
    <div class="p-perr" role="alert">{{ waitSec > 0 ? `Kebanyakan salah. Coba lagi ${waitSec} detik lagi.` : error }}</div>
    <div class="p-pad">
      <button v-for="n in [1, 2, 3, 4, 5, 6, 7, 8, 9]" :key="n" type="button" :data-k="n" :disabled="waitSec > 0" @click="press(String(n))">{{ n }}</button>
      <span />
      <button type="button" data-k="0" :disabled="waitSec > 0" @click="press('0')">0</button>
      <button type="button" class="blank" data-k="del" aria-label="Hapus" @click="del"><PhBackspace :size="24" /></button>
    </div>
    <button v-if="mode === 'unlock'" type="button" class="p-forgot" data-test="forgot" @click="$emit('forgot')">Lupa PIN?</button>
    <div class="p-kbd">Bisa juga ketik angka pakai keyboard laptop.</div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PhBackspace, PhLockKey } from '@phosphor-icons/vue'

/** Layar PIN: tombol angka di layar (BUKAN input, biar keyboard iOS nggak kebuka). 6 angka → `done` sekali. */
const props = defineProps({
  mode: { type: String, default: 'unlock' },
  error: { type: String, default: '' },
  waitSec: { type: Number, default: 0 },
})
const emit = defineEmits(['done', 'forgot'])

const COPY = {
  unlock: { title: 'Data Pribadi kekunci', hint: 'Masukin PIN 6 angka buat buka.' },
  create: { title: 'Bikin PIN dulu', hint: '6 angka. Dipakai buat buka Data Pribadi di semua device lo.' },
  confirm: { title: 'Ulangi PIN-nya', hint: 'Ketik lagi 6 angka yang sama.' },
}
const copy = computed(() => COPY[props.mode] ?? COPY.unlock)

const pin = ref('')
const shake = ref(false)
// Abis 6 angka: tahan input sebentar biar titiknya keliatan penuh, baru dikosongin.
let settling = null

function press(digit) {
  if (props.waitSec > 0 || settling || pin.value.length >= 6) return
  pin.value += digit
  if (pin.value.length < 6) return
  emit('done', pin.value)
  settling = setTimeout(() => {
    settling = null
    pin.value = ''
  }, 160)
}

function del() {
  if (props.waitSec > 0 || settling) return
  pin.value = pin.value.slice(0, -1)
}

function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return
  if (/^\d$/.test(e.key)) press(e.key)
  else if (e.key === 'Backspace') del()
}

watch(() => props.error, (msg) => {
  if (!msg) return
  shake.value = false
  requestAnimationFrame(() => (shake.value = true))
})

onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  clearTimeout(settling)
})
</script>

<style scoped>
.p-lock { display: flex; flex-direction: column; align-items: center; text-align: center; padding-top: 12px; }
.p-lic { width: 72px; height: 72px; border-radius: 24px; background: var(--ink); color: var(--lime); display: grid; place-items: center; margin: 22px 0 18px; }
:root.theme-dark .p-lic { color: #141410; background: var(--lime); }
h2 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.035em; }
p { margin: 6px 0 0; color: var(--muted); font-size: 14px; font-weight: 600; line-height: 1.45; max-width: 290px; }
.p-dots { display: flex; gap: 14px; margin: 28px 0 10px; }
.p-dots i { width: 14px; height: 14px; border-radius: 99px; box-shadow: inset 0 0 0 2px var(--muted); transition: all .2s var(--spring); }
.p-dots i.on { background: var(--ink); box-shadow: none; transform: scale(1.1); }
.p-dots.shake { animation: p-shake .45s; }
@keyframes p-shake { 20%, 60% { transform: translateX(-10px); } 40%, 80% { transform: translateX(10px); } }
.p-perr { min-height: 20px; color: var(--red); font-size: 13px; font-weight: 700; }
.p-pad { display: grid; grid-template-columns: repeat(3, 76px); gap: 14px 22px; margin-top: 12px; }
.p-pad button { width: 76px; height: 76px; border: 0; border-radius: 99px; background: var(--card); color: var(--text); box-shadow: 0 0 0 1px var(--hair), 0 10px 20px -16px rgba(0, 0, 0, .4);
  font: 700 28px var(--ion-font-family); cursor: pointer; transition: transform .15s var(--spring); display: grid; place-items: center; }
.p-pad button:active { transform: scale(.92); background: var(--soft); }
.p-pad button.blank { background: transparent; box-shadow: none; color: var(--muted); }
.p-pad button[disabled] { opacity: .35; }
.p-forgot { margin-top: 22px; border: 0; background: none; font: 700 14px var(--ion-font-family); color: var(--muted); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.p-kbd { display: none; margin-top: 14px; font-size: 12px; color: var(--muted); font-weight: 600; }
@media (min-width: 1100px) and (hover: hover) { .p-kbd { display: block; } }
</style>
