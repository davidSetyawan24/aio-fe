<template>
  <div>
    <div class="pf-sub2">Ingetin gue <span>{{ modelValue.length }}/{{ MAX_REMINDERS }}</span></div>
    <div class="pf-chips">
      <button v-for="(r, i) in modelValue" :key="`${r.n}${r.unit}${r.time}`" type="button" class="pf-cp on" data-test="rem-chip" @click="remove(i)">
        {{ reminderText(r) }}<PhX :size="12" weight="bold" class="x" />
      </button>
      <button v-if="modelValue.length < MAX_REMINDERS && !adding" type="button" class="pf-cp ghost" data-test="rem-add" @click="adding = true">
        <PhPlus :size="14" weight="bold" />Tambah
      </button>
    </div>

    <div v-if="adding && modelValue.length < MAX_REMINDERS" class="pf-pick">
      <div class="pf-sub2">Berapa lama sebelumnya?</div>
      <div class="pf-nrow">
        <input v-model="pick.n" data-test="rem-n" inputmode="numeric" maxlength="3" aria-label="Angka" @keydown.enter.prevent="use" />
        <div class="pf-seg">
          <button v-for="[u, name] in UNITS" :key="u" type="button" :class="{ on: pick.unit === u }" :data-test="`rem-unit-${u}`" @click="pick.unit = u">{{ name }}</button>
        </div>
      </div>
      <div class="pf-sub2">Jam</div>
      <div class="pf-chips">
        <button v-for="h in REMINDER_HOURS" :key="h" type="button" class="pf-cp" :class="{ on: pick.time === h }" :data-test="`rem-time-${h}`" @click="pick.time = h">{{ h.replace(':', '.') }}</button>
      </div>
      <p v-if="error" class="pf-err" role="alert" data-test="rem-error">{{ error }}</p>
      <button type="button" class="pf-use" data-test="rem-use" @click="use">Pakai pengingat ini</button>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { PhPlus, PhX } from '@phosphor-icons/vue'
import '@/components/personalForm.css'
import { MAX_REMINDERS, REMINDER_HOURS, UNITS, reminderError, reminderText } from '@/lib/personal.js'

/** Pengingat satu tanggal: chip + kotak "Tambah" (angka, hari/minggu/bulan, jam). v-model = daftar { n, unit, time }. */
const props = defineProps({ modelValue: { type: Array, required: true } })
const emit = defineEmits(['update:modelValue'])

const adding = ref(false)
const error = ref('')
const pick = reactive({ n: '1', unit: 'month', time: '09:00' })

const remove = (i) => emit('update:modelValue', props.modelValue.filter((_, j) => j !== i))

function use() {
  error.value = reminderError(props.modelValue, pick) ?? ''
  if (error.value) return
  emit('update:modelValue', [...props.modelValue, { n: Number(pick.n), unit: pick.unit, time: pick.time }])
  adding.value = false
}
</script>
