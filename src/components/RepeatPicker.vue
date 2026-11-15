<template>
  <div>
    <div class="row-pk">
      <button v-for="[key, name] in FREQS" :key="key" type="button" class="pk" :class="{ on: modelValue.freq === key }" :data-rep="key" @click="setFreq(key)">{{ name }}</button>
    </div>
    <div v-if="modelValue.freq === 'weekly'" class="days">
      <button v-for="d in WEEK_ORDER" :key="d" type="button" class="pk day" :class="{ on: modelValue.days.includes(d) }" :data-rep-day="d" @click="toggleDay(d)">{{ HR[d] }}</button>
    </div>
    <template v-if="modelValue.freq !== 'none'">
      <span class="flabel until-lbl">Sampai kapan</span>
      <div class="row-pk">
        <button type="button" class="pk" :class="{ on: !modelValue.until }" data-until="forever" @click="update({ until: null })">Terus</button>
        <label class="pk" :class="{ on: modelValue.until }">Sampai <input type="date" data-test="until-date" :value="modelValue.until ?? ''" :min="startDate" aria-label="Sampai tanggal" @input="update({ until: $event.target.value || null })" /></label>
      </div>
    </template>
  </div>
</template>

<script setup>
import { HR, WEEK_ORDER, weekdayOf } from '@/lib/agenda.js'

/** Ulangi: Nggak · Tiap hari · Tiap minggu (pilih hari) · Tiap bulan · Tiap tahun + Sampai kapan. */
const props = defineProps({ modelValue: { type: Object, required: true }, startDate: { type: String, required: true } })
const emit = defineEmits(['update:modelValue'])
const FREQS = [
  ['none', 'Nggak'],
  ['daily', 'Tiap hari'],
  ['weekly', 'Tiap minggu'],
  ['monthly', 'Tiap bulan'],
  ['yearly', 'Tiap tahun'],
]

const update = (patch) => emit('update:modelValue', { ...props.modelValue, ...patch })
function setFreq(freq) {
  const days = freq === 'weekly' ? (props.modelValue.days.length ? props.modelValue.days : [weekdayOf(props.startDate)]) : []
  update({ freq, days, until: freq === 'none' ? null : props.modelValue.until })
}
function toggleDay(d) {
  const days = props.modelValue.days.includes(d) ? props.modelValue.days.filter((x) => x !== d) : [...props.modelValue.days, d]
  update({ days: days.sort((a, b) => a - b) })
}
</script>

<style scoped src="./agenda-form.css"></style>
<style scoped>
.days { display: flex; gap: 5px; margin-top: 8px; }
.day { width: 40px; padding: 0; justify-content: center; }
.until-lbl { margin-top: 12px; }
</style>
