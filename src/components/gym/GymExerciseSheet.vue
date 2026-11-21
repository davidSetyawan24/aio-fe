<template>
  <!-- Ke dalem ion-app (bukan body): popup Ionic dipasang di ion-app, kalau di body ketutup scrim. -->
  <Teleport to="ion-app">
    <div class="gy-scrim" :class="{ show: open }" @click="$emit('close')" />
    <div class="gy-sheet" :class="{ show: open, dialog: wide }" data-test="ex-sheet" role="dialog" aria-modal="true" aria-label="Atur gerakan" :aria-hidden="String(!open)">
      <div class="gy-handle" />
      <div class="gy-ovhead">
        <div class="grow"><h2>{{ exercise?.name }}</h2><p>Di program {{ PROGRAM_LABEL[program] }}. Setelan gerakan ini (nama, istirahat, langkah beban, dumbbell) berlaku di semua latihan yang punya gerakan ini.</p></div>
        <button type="button" class="gy-xbtn" aria-label="Tutup" data-test="ex-close" @click="$emit('close')"><PhX :size="18" weight="bold" /></button>
      </div>
      <form novalidate @submit.prevent="save">
        <div class="gy-fgroup">Nama gerakan</div>
        <label class="gy-fld" :class="{ bad: nameErr }">
          <span class="lb">Nama</span>
          <input :value="name" data-test="name" type="text" maxlength="60" autocomplete="off" enterkeyhint="done" aria-label="Nama gerakan" @input="onName" @keydown.enter.prevent="$event.target.blur()" />
        </label>
        <p v-if="nameErr" class="gy-ferr" data-test="name-err">{{ nameErr }}</p>
        <div class="gy-fgroup">Istirahat abis tiap set</div>
        <div class="gy-opts">
          <button v-for="r in REST_OPTIONS" :key="r" type="button" class="gy-opt" :class="{ on: restSec === r }" :data-rest="r" @click="restSec = r">{{ restText(r) }}</button>
        </div>
        <div class="gy-fgroup">Tombol − / + naik-turun beban</div>
        <div class="gy-opts">
          <button v-for="s in STEP_OPTIONS" :key="s" type="button" class="gy-opt" :class="{ on: step === s }" :data-step="s" @click="step = s">{{ kgText(s) }} kg</button>
        </div>
        <p v-if="otherErr" class="gy-ferr" data-test="other-err">{{ otherErr }}</p>
        <div class="gy-fgroup">Jenis beban</div>
        <button type="button" class="gy-switch" data-test="dumbbell" role="switch" :aria-checked="String(dumbbell)" @click="dumbbell = !dumbbell">
          <span class="grow"><b>Pake dumbbell</b><small>Beban dicatet per satu dumbbell (nggak dikali 2).</small></span>
          <span class="gy-sw" :class="{ on: dumbbell }" />
        </button>
        <button type="submit" class="gy-save" data-test="save" :disabled="saving">Simpen <span><PhCheck :size="20" weight="bold" /></span></button>
      </form>
      <button type="button" class="gy-ghost red" style="margin-top: 10px" data-test="remove" @click="$emit('remove')"><PhTrash :size="17" />Hapus dari {{ PROGRAM_LABEL[program] }}</button>
      <div class="gy-note">Riwayat gerakan ini tetep ada walau dihapus dari program.</div>
    </div>
  </Teleport>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PhCheck, PhTrash, PhX } from '@phosphor-icons/vue'
import { PROGRAM_LABEL, REST_OPTIONS, STEP_OPTIONS, kgText, restText } from '@/lib/gym.js'
import { showToast } from '@/lib/personalForm.js'
import { useGymStore } from '@/stores/gym.js'
import './gym.css'
import './gymReport.css'
import './gymChart.css'

/** Atur satu gerakan (nama, istirahat, langkah − / +, dumbbell) → PATCH. "Hapus dari <program>" dikerjain halaman (emit `remove`). */
const props = defineProps({
  open: { type: Boolean, default: false },
  wide: { type: Boolean, default: false },
  exercise: { type: Object, default: null },
  program: { type: String, required: true },
})
const emit = defineEmits(['close', 'remove'])

const store = useGymStore()
const name = ref('')
const restSec = ref(120)
const step = ref(2.5)
const dumbbell = ref(false)
const nameErr = ref('')
const otherErr = ref('')
const saving = ref(false)

function fill() {
  const x = props.exercise
  if (!x) return
  name.value = x.name
  restSec.value = Number(x.restSec)
  step.value = Number(x.step)
  dumbbell.value = !!x.dumbbell
  nameErr.value = ''
  otherErr.value = ''
}
// Diisi ulang tiap sheet dibuka / gerakannya ganti (nggak pas daftar dimuat ulang di belakang).
watch(() => [props.open, props.exercise?.id], ([open]) => open && fill(), { immediate: true })

function onName(e) {
  name.value = e.target.value
  nameErr.value = ''
}

async function save() {
  if (saving.value || !props.exercise) return
  const clean = name.value.trim().replace(/\s+/g, ' ')
  if (!clean) {
    nameErr.value = 'Nama gerakannya wajib diisi.'
    return
  }
  nameErr.value = ''
  otherErr.value = ''
  saving.value = true
  try {
    await store.saveExercise({ name: clean, restSec: restSec.value, step: step.value, dumbbell: dumbbell.value }, props.exercise.id)
    showToast('Kesimpen ✓')
    emit('close')
  } catch (e) {
    const fieldName = e?.fields?.name?.[0]
    if (fieldName) nameErr.value = fieldName
    else if (!e?.status) otherErr.value = 'Belum ada sinyal. Coba lagi bentar.'
    else otherErr.value = e?.fields ? Object.values(e.fields).flat()[0] ?? e.message : e?.message || 'Belum kesimpen. Coba lagi.'
  } finally {
    saving.value = false
  }
}

/** Esc nutup, kecuali ada popup Ionic yang lagi kebuka. */
function onKey(e) {
  if (e.key !== 'Escape' || !props.open) return
  if (document.querySelector('ion-action-sheet, ion-alert')) return
  emit('close')
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>
