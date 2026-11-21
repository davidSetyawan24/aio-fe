<template>
  <!-- Ke dalem ion-app (bukan body): popup Ionic dipasang di ion-app, kalau di body ketutup scrim. -->
  <Teleport to="ion-app">
    <div class="gy-scrim" :class="{ show: open }" @click="$emit('close')" />
    <div class="gy-sheet" :class="{ show: open, dialog: wide }" data-test="pick-sheet" role="dialog" aria-modal="true" :aria-label="`Pilih latihan ${label}`" :aria-hidden="String(!open)">
      <div class="gy-handle" />
      <div class="gy-ovhead">
        <span class="gy-bigem" :style="{ '--t': PROGRAM_TINT[program] }">{{ PROGRAM_EMOJI[program] }}</span>
        <div class="grow"><h2>{{ label }}</h2><p>{{ rows.length }} gerakan<template v-if="lastOn"> · terakhir {{ dShort(lastOn) }}</template></p></div>
        <button type="button" class="gy-xbtn" aria-label="Tutup" data-test="pick-close" @click="$emit('close')"><PhX :size="18" weight="bold" /></button>
      </div>
      <div class="gy-plist">
        <div v-for="(r, i) in rows" :key="i" class="pr">
          <span class="n">{{ i + 1 }}</span>
          <span class="grow"><b>{{ r.name }}</b><small>{{ r.sub }}</small></span>
          <span class="gy-chip mut">{{ restText(r.restSec) }}</span>
        </div>
      </div>
      <button type="button" class="gy-save" data-test="start" @click="$emit('start', program)">Mulai sesi <span><PhPlay :size="18" weight="fill" /></span></button>
      <div class="gy-note">Durasi jalan otomatis sampe lo pencet Selesai.</div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { PhPlay, PhX } from '@phosphor-icons/vue'
import { dShort } from '@/lib/badanView.js'
import { PROGRAM_EMOJI, PROGRAM_LABEL, PROGRAM_TINT, bestSet, restText, setText } from '@/lib/gym.js'
import './gym.css'

/** Pilih latihan: daftar gerakan + patokan sesi lalu → Mulai sesi. HP = sheet bawah, PC = dialog. */
const props = defineProps({
  open: { type: Boolean, default: false },
  program: { type: String, required: true },
  programs: { type: Array, required: true },
  exercises: { type: Array, required: true },
  wide: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'start'])

const label = computed(() => PROGRAM_LABEL[props.program])
const lastOn = computed(() => props.programs.find((p) => p.key === props.program)?.lastOn ?? null)
const rows = computed(() => {
  const byId = new Map(props.exercises.map((x) => [x.id, x]))
  const ids = props.programs.find((p) => p.key === props.program)?.exerciseIds ?? []
  return ids.filter((id) => byId.has(id)).map((id) => {
    const x = byId.get(id)
    const sets = (x.last?.sets ?? []).map(([w, r]) => [Number(w), Number(r)])
    return { name: x.name, restSec: x.restSec, sub: sets.length ? `sesi lalu ${setText(bestSet(sets))} · ${sets.length} set` : 'belum ada riwayat' }
  })
})

/** Esc nutup, kecuali ada popup Ionic yang lagi kebuka. */
function onKey(e) {
  if (e.key !== 'Escape' || !props.open) return
  if (document.querySelector('ion-action-sheet, ion-alert')) return
  emit('close')
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>
