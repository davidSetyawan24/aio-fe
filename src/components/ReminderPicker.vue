<template>
  <div>
    <div class="row-pk">
      <button v-for="(r, i) in modelValue" :key="reminderKey(r)" type="button" class="pk on" data-test="rem-chip" :aria-label="`Hapus pengingat ${reminderLabel(r)}`" @click="remove(i)">
        {{ reminderLabel(r) }}<PhX :size="12" class="x" />
      </button>
      <button v-if="modelValue.length < MAX_REMINDERS" type="button" class="pk ghost" data-test="rem-add" @click="adding = !adding"><PhPlus :size="14" />Tambah</button>
    </div>
    <template v-if="adding && modelValue.length < MAX_REMINDERS">
      <div class="row-pk more">
        <button v-for="p in presets" :key="reminderKey(p)" type="button" class="pk" @click="add(p)">{{ reminderLabel(p) }}</button>
      </div>
      <div class="custom">
        <template v-if="kind === 'day'">
          <select v-model="customDay" class="input" data-test="rem-day" aria-label="Hari pengingat"><option value="0">Hari itu</option><option value="-1">H-1</option></select>
          <input v-model="customTime" type="time" class="input" data-test="rem-time" aria-label="Jam pengingat" />
        </template>
        <template v-else>
          <input v-model="customNum" type="number" inputmode="numeric" min="1" class="input num" data-test="rem-num" aria-label="Berapa lama sebelum" />
          <select v-model="customUnit" class="input" data-test="rem-unit" aria-label="Satuan"><option value="1">mnt</option><option value="60">jam</option><option value="1440">hari</option></select>
        </template>
        <button type="button" class="pk" data-test="rem-custom" @click="addCustom">Pakai</button>
      </div>
      <p v-if="customError" class="err">{{ customError }}</p>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { PhPlus, PhX } from '@phosphor-icons/vue'
import { DAY_PRESETS, EVENT_PRESETS, MAX_REMINDERS, reminderKey, reminderLabel } from '@/lib/agenda.js'

/** Pengingat (maks 3). kind 'before' = menit sebelum mulai (acara berjam), 'day' = hari itu / H-1 jam tertentu. */
const props = defineProps({ modelValue: { type: Array, required: true }, kind: { type: String, default: 'before' } })
const emit = defineEmits(['update:modelValue'])
const MAX_MINUTES = 7 * 1440

const adding = ref(false)
const customNum = ref('2')
const customUnit = ref('60')
const customDay = ref('0')
const customTime = ref('09:00')
const customError = ref('')

const taken = computed(() => new Set(props.modelValue.map(reminderKey)))
const presets = computed(() => (props.kind === 'day' ? DAY_PRESETS : EVENT_PRESETS).filter((p) => !taken.value.has(reminderKey(p))))

function add(r) {
  if (!taken.value.has(reminderKey(r)) && props.modelValue.length < MAX_REMINDERS) emit('update:modelValue', [...props.modelValue, r])
  adding.value = false
  customError.value = ''
}
function addCustom() {
  if (props.kind === 'day') {
    if (!customTime.value) return (customError.value = 'Isi jamnya dulu.')
    return add({ type: 'day', offset: Number(customDay.value), time: customTime.value })
  }
  const minutes = Math.round(Number(customNum.value) * Number(customUnit.value))
  if (!Number.isFinite(minutes) || minutes < 1) return (customError.value = 'Isi angkanya dulu.')
  if (minutes > MAX_MINUTES) return (customError.value = 'Maksimal 7 hari sebelum.')
  add({ type: 'before', minutes })
}
function remove(i) {
  emit('update:modelValue', props.modelValue.filter((_, j) => j !== i))
}
</script>

<style scoped src="./agenda-form.css"></style>
<style scoped>
.more { margin-top: 8px; }
.custom { display: flex; gap: 6px; margin-top: 8px; align-items: center; }
.custom .input { height: 42px; border-radius: 14px; width: auto; flex: 1; }
.custom .num { flex: none; width: 80px; }
.custom .pk { height: 42px; }
</style>
