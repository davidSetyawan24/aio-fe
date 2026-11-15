<template>
  <div>
    <div class="chips">
      <button v-for="r in sorted" :key="reminderKey(r)" type="button" class="cp on" data-test="rem-chip" :aria-label="`Hapus pengingat ${reminderLabel(r)}`" @click="remove(r)">
        {{ reminderLabel(r) }}<PhX :size="12" weight="bold" class="x" />
      </button>
      <button v-if="modelValue.length < MAX_REMINDERS" type="button" class="cp ghost" data-test="rem-add" @click="toggle"><PhPlus :size="14" weight="bold" />Tambah</button>
    </div>
    <div v-if="adding && modelValue.length < MAX_REMINDERS" class="rempick">
      <div class="sub">Hari</div>
      <div class="chips">
        <button v-for="d in DAY_PRESETS" :key="d" type="button" class="cp" :class="{ on: custom === '' && day === d }" :data-pd="d" @click="pickDay(d)">{{ dayOffsetLabel(d) }}</button>
        <label class="custom" :class="{ on: custom !== '' }">H-<input v-model="custom" data-test="rem-custom" inputmode="numeric" maxlength="2" placeholder="…" aria-label="Berapa hari sebelum" @input="onCustom" /></label>
      </div>
      <div class="sub">Jam</div>
      <div class="chips">
        <button v-for="h in HOURS" :key="h" type="button" class="cp" :class="{ on: time === h }" :data-ph="h" @click="time = h">{{ hourLabel(h) }}</button>
      </div>
      <p v-if="pickError" class="err" data-test="rem-error">{{ pickError }}</p>
      <button type="button" class="use" data-test="rem-use" @click="use">Pakai pengingat ini</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { PhPlus, PhX } from '@phosphor-icons/vue'
import { DAY_PRESETS, dayOffsetLabel, hourLabel, HOURS, MAX_OFFSET, MAX_REMINDERS, reminderKey, reminderLabel, sortReminders } from '@/lib/bayarRutin.js'

/** Pengingat Bayar Rutin: hari (Hari H / H-n) + jam (5 pilihan). Maks 3, nggak dobel. */
const props = defineProps({ modelValue: { type: Array, required: true } })
const emit = defineEmits(['update:modelValue'])

const sorted = computed(() => sortReminders(props.modelValue))
const adding = ref(false)
const day = ref(1)
const custom = ref('')
const time = ref('09:00')
const pickError = ref('')

function toggle() {
  adding.value = !adding.value
  pickError.value = ''
}
function pickDay(d) {
  day.value = d
  custom.value = ''
  pickError.value = ''
}
function onCustom() {
  custom.value = custom.value.replace(/\D/g, '').slice(0, 2)
  pickError.value = ''
}
function use() {
  const offset = custom.value !== '' ? Number(custom.value) : day.value
  if (offset > MAX_OFFSET) return (pickError.value = 'Maksimal H-30 ya.')
  const r = { offset, time: time.value }
  if (props.modelValue.some((x) => reminderKey(x) === reminderKey(r))) return (pickError.value = 'Pengingat itu udah ada.')
  emit('update:modelValue', [...props.modelValue, r])
  adding.value = false
  custom.value = ''
  pickError.value = ''
}
function remove(r) {
  emit('update:modelValue', props.modelValue.filter((x) => reminderKey(x) !== reminderKey(r)))
}
</script>

<style scoped>
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.cp { display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 13px; border: 0; border-radius: 99px; background: var(--card); box-shadow: 0 0 0 1px var(--hair);
  color: var(--text); font: 700 13px var(--ion-font-family); cursor: pointer; }
.cp.on { background: var(--ink); color: var(--on-ink); box-shadow: none; }
.cp.ghost { background: transparent; box-shadow: inset 0 0 0 1.5px var(--hair); color: var(--muted); }
.cp .x { opacity: .6; }
.rempick { margin-top: 10px; padding: 14px; border-radius: 22px; background: var(--card); box-shadow: 0 0 0 1px var(--hair); }
.rempick .sub { font-size: 12px; font-weight: 700; color: var(--muted); margin: 0 2px 8px; }
.rempick .chips + .sub { margin-top: 14px; }
.rempick .cp { background: var(--soft); box-shadow: none; }
.rempick .cp.on { background: var(--ink); }
.custom { display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 6px 0 12px; border-radius: 99px; background: var(--soft); font-size: 13px; font-weight: 700; }
.custom input { width: 44px; height: 28px; border: 0; outline: 0; border-radius: 10px; background: var(--card); color: var(--text); text-align: center; font: 800 16px var(--ion-font-family); }
.custom.on { box-shadow: inset 0 0 0 2px var(--ink); }
.err { color: var(--red); font-size: 12.5px; font-weight: 600; margin: 10px 2px 0; }
.use { width: 100%; height: 44px; margin-top: 14px; border: 0; border-radius: 99px; background: var(--ink); color: var(--on-ink); font: 700 14px var(--ion-font-family); cursor: pointer; }
</style>
