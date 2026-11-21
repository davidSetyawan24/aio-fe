<template>
  <!-- Ke dalem ion-app (bukan body): popup Ionic dipasang di ion-app, kalau di body ketutup scrim. -->
  <Teleport to="ion-app">
    <div class="gy-scrim" :class="{ show: open }" @click="$emit('close')" />
    <div class="gy-sheet gl-addsheet" :class="{ show: open, dialog: wide }" data-test="add-sheet" role="dialog" aria-modal="true" aria-label="Tambah gerakan" :aria-hidden="String(!open)">
      <div class="gy-handle" />
      <div class="gy-ovhead">
        <div class="grow"><h2>Tambah gerakan</h2><p>Cuma buat sesi ini — program {{ PROGRAM_LABEL[program] }} nggak berubah. Gerakannya punya riwayat sendiri.</p></div>
        <button type="button" class="gy-xbtn" aria-label="Tutup" data-test="add-close" @click="$emit('close')"><PhX :size="18" weight="bold" /></button>
      </div>
      <label class="gl-search">
        <PhMagnifyingGlass :size="18" weight="bold" />
        <input :value="q" data-test="add-q" type="search" enterkeyhint="search" autocomplete="off" placeholder="Cari / ketik nama gerakan…" aria-label="Cari gerakan" @input="q = $event.target.value" @keydown.enter.prevent="$event.target.blur()" />
      </label>
      <div v-if="canCreate" class="gl-xlist">
        <button type="button" class="gl-xrow new" data-test="new-ex" :disabled="creating" @click="create">
          <span class="pl"><PhPlus :size="16" weight="bold" /></span>
          <span class="grow"><b>Bikin “{{ name }}”</b><small>gerakan baru, mulai dari nol</small></span>
        </button>
      </div>
      <div v-if="inSession" class="gl-xlist">
        <button type="button" class="gl-xrow" data-test="in-session" @click="$emit('add', inSession)">
          <span class="grow"><b>{{ inSession.name }}</b><small>Udah ada di sesi ini</small></span>
          <span class="pl"><PhCaretRight :size="16" weight="bold" /></span>
        </button>
      </div>
      <template v-for="g in groups" :key="g.label">
        <div class="gy-fgroup">{{ g.label }}</div>
        <div class="gl-xlist">
          <button v-for="x in g.items" :key="x.id" type="button" class="gl-xrow" :data-addex="x.id" @click="$emit('add', x)">
            <span class="grow"><b>{{ x.name }}</b><small>{{ subOf(x) }}</small></span>
            <span class="pl"><PhPlus :size="16" weight="bold" /></span>
          </button>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PhCaretRight, PhMagnifyingGlass, PhPlus, PhX } from '@phosphor-icons/vue'
import { dShort } from '@/lib/badanView.js'
import { PROGRAM_LABEL, bestSet, setText } from '@/lib/gym.js'
import { showToast } from '@/lib/personalForm.js'
import { useGymStore } from '@/stores/gym.js'
import './gym.css'
import './gymLive.css'

/**
 * Tambah gerakan ke sesi: cari, "Pernah lo pake" (gerakan di luar program yang pernah dipake),
 * "Dari program lain", atau "Bikin “…”" (gerakan baru; nama udah ada → pake yang ada). HP = sheet bawah, PC = dialog.
 */
const props = defineProps({
  open: { type: Boolean, default: false },
  wide: { type: Boolean, default: false },
  program: { type: String, required: true },
  programs: { type: Array, required: true },
  exercises: { type: Array, required: true },
  /** Id gerakan yang udah ada di sesi (nggak ditawarin lagi). */
  exclude: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'add'])

const store = useGymStore()
const q = ref('')
const creating = ref(false)

const norm = (t) => String(t ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
const name = computed(() => q.value.trim().replace(/\s+/g, ' '))
const key = computed(() => norm(q.value))
const inPrograms = computed(() => new Set(props.programs.flatMap((p) => p.exerciseIds)))

const groups = computed(() => {
  const skip = new Set(props.exclude)
  const hit = (x) => !key.value || norm(x.name).includes(key.value)
  const pool = props.exercises.filter((x) => !skip.has(x.id) && hit(x))
  // Gerakan di luar program yang belum pernah dipake cuma nongol pas dicari (biar daftarnya nggak penuh).
  const mine = pool.filter((x) => !inPrograms.value.has(x.id) && (x.last || key.value))
  const other = pool.filter((x) => inPrograms.value.has(x.id))
  return [
    { label: 'Pernah lo pake', items: mine },
    { label: 'Dari program lain', items: other },
  ].filter((g) => g.items.length)
})
/** Nama yang diketik persis sama dengan gerakan yang udah ada di sesi. */
const inSession = computed(() => (key.value ? props.exercises.find((x) => props.exclude.includes(x.id) && norm(x.name) === key.value) ?? null : null))
const canCreate = computed(() => !!key.value && !props.exercises.some((x) => norm(x.name) === key.value))

function subOf(x) {
  const sets = (x.last?.sets ?? []).map(([w, r]) => [Number(w), Number(r)])
  return sets.length ? `terakhir ${dShort(x.last.on)} · ${setText(bestSet(sets))}` : 'belum ada riwayat'
}

async function create() {
  if (creating.value || !name.value) return
  creating.value = true
  try {
    const x = await store.saveExercise({ name: name.value })
    emit('add', x)
  } catch (e) {
    const existing = e?.status === 409 ? e.fields?.existing : null
    if (existing) emit('add', existing)
    else if (!e?.status) showToast('Gerakan baru butuh sinyal. Pilih gerakan yang udah ada dulu ya.')
    else showToast(e?.message || 'Gerakannya belum kesimpen. Coba lagi.')
  } finally {
    creating.value = false
  }
}

watch(
  () => props.open,
  (v) => !v && (q.value = ''),
)

/** Esc nutup, kecuali ada popup Ionic yang lagi kebuka. */
function onKey(e) {
  if (e.key !== 'Escape' || !props.open) return
  if (document.querySelector('ion-action-sheet, ion-alert')) return
  emit('close')
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>
