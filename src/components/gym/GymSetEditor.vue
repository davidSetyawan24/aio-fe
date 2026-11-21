<template>
  <div class="gl-sedit" data-test="editor">
    <div class="gl-setop">
      <b>Set {{ n }}<template v-if="done"> · lagi dibenerin</template></b>
      <span v-if="prev">sesi lalu <b>{{ setText(prev) }}</b></span>
      <span v-else>belum ada patokan</span>
    </div>
    <div class="gl-stp">
      <span class="stl">Beban<small>kg</small></span>
      <button type="button" data-test="weight-minus" aria-label="Kurangin beban" :disabled="disabled || !(weightNum > 0)" @click="bump('weight', -1)">−</button>
      <input
        :value="weightText"
        data-test="weight"
        type="text"
        inputmode="decimal"
        enterkeyhint="done"
        autocomplete="off"
        placeholder="0"
        aria-label="Beban kg"
        :disabled="disabled"
        @focus="selectAll"
        @input="typed('weight', $event)"
        @keydown.enter.prevent="$event.target.blur()"
      />
      <button type="button" data-test="weight-plus" aria-label="Tambah beban" :disabled="disabled || weightNum >= LIMITS.weight[1]" @click="bump('weight', 1)">+</button>
    </div>
    <div class="gl-stp">
      <span class="stl">Reps<small>berapa kali</small></span>
      <button type="button" data-test="reps-minus" aria-label="Kurangin reps" :disabled="disabled || !(repsNum > 0)" @click="bump('reps', -1)">−</button>
      <input
        :value="repsText"
        data-test="reps"
        type="text"
        inputmode="numeric"
        enterkeyhint="done"
        autocomplete="off"
        placeholder="0"
        aria-label="Reps"
        :disabled="disabled"
        @focus="selectAll"
        @input="typed('reps', $event)"
        @keydown.enter.prevent="$event.target.blur()"
      />
      <button type="button" data-test="reps-plus" aria-label="Tambah reps" :disabled="disabled || repsNum >= LIMITS.reps[1]" @click="bump('reps', 1)">+</button>
    </div>
    <div v-if="done" class="gl-seact">
      <button type="button" class="gl-ghost red" data-test="remove" :disabled="disabled" @click="$emit('remove')"><PhTrash :size="17" weight="bold" />Hapus set</button>
      <button type="button" class="gl-ok ink" data-test="save" :disabled="disabled || !ok" @click="$emit('save', vals())"><PhCheck :size="18" weight="bold" />Simpen</button>
    </div>
    <button v-else type="button" class="gl-ok" data-test="check" :disabled="disabled || !ok" @click="$emit('check', vals())"><PhCheck :size="22" weight="bold" />Centang set {{ n }}</button>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { PhCheck, PhTrash } from '@phosphor-icons/vue'
import { LIMITS, kgText, parseReps, parseWeight, setText, stepValue } from '@/lib/gym.js'
import { validSet } from '@/lib/gymLive.js'

/**
 * Editor satu set: Beban & Reps (− / angka / +) + Centang set N; set yang udah ✓ → Hapus set / Simpen.
 * Tiap angka berubah → `change` (dipake buat nyimpen angka set yang belum ✓ di draf HP).
 */
const props = defineProps({
  n: { type: Number, required: true },
  weight: { type: Number, default: null },
  reps: { type: Number, default: null },
  prev: { type: Array, default: null },
  done: { type: Boolean, default: false },
  step: { type: Number, default: 2.5 },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['change', 'check', 'save', 'remove'])

const show = (v, f) => (v == null ? '' : f(v))
const weightText = ref(show(props.weight, kgText))
const repsText = ref(show(props.reps, String))
const weightNum = computed(() => parseWeight(weightText.value))
const repsNum = computed(() => parseReps(repsText.value))
const ok = computed(() => validSet(weightNum.value, repsNum.value))
const vals = () => ({ weight: weightNum.value, reps: repsNum.value })

// Angka dari luar berubah (mis. digabung sama server) → kolom ikut, kecuali emang itu angka yang lagi diketik.
watch(() => props.weight, (v) => v !== weightNum.value && (weightText.value = show(v, kgText)))
watch(() => props.reps, (v) => v !== repsNum.value && (repsText.value = show(v, String)))

function bump(key, dir) {
  if (key === 'weight') weightText.value = kgText(Math.min(LIMITS.weight[1], stepValue(weightNum.value, dir, props.step)))
  else repsText.value = String(Math.min(LIMITS.reps[1], stepValue(repsNum.value, dir, 1)))
  emit('change', vals())
}
function typed(key, e) {
  if (key === 'weight') weightText.value = e.target.value
  else repsText.value = e.target.value
  emit('change', vals())
}

/** Tap angka → kepilih semua, langsung ketik angka baru. */
function selectAll(e) {
  const el = e.target
  const before = el.value
  el.select()
  // iOS kadang ngelepas pilihan abis fokus → pilih lagi sekali, asal belum ada yang diketik.
  setTimeout(() => document.activeElement === el && el.value === before && el.setSelectionRange(0, el.value.length), 0)
}
</script>
