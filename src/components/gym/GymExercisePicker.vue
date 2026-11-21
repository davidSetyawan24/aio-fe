<template>
  <Teleport to="ion-app">
    <div class="gy-scrim" :class="{ show: open }" @click="$emit('close')" />
    <div class="gy-sheet" :class="{ show: open, dialog: wide }" data-test="chart-pick" role="dialog" aria-modal="true" aria-label="Pilih gerakan" :aria-hidden="String(!open)">
      <div class="gy-handle" />
      <div class="gy-ovhead">
        <div class="grow"><h2>Pilih gerakan</h2><p>Gerakan yang sama di beberapa latihan (mis. Lat Pull Down di Pull &amp; Upper) digabung jadi satu grafik.</p></div>
        <button type="button" class="gy-xbtn" aria-label="Tutup" data-test="pick-close" @click="$emit('close')"><PhX :size="18" weight="bold" /></button>
      </div>
      <label class="gl-search">
        <PhMagnifyingGlass :size="18" weight="bold" />
        <input :value="q" data-test="pick-q" type="search" enterkeyhint="search" autocomplete="off" placeholder="Cari gerakan…" aria-label="Cari gerakan" @input="q = $event.target.value" @keydown.enter.prevent="$event.target.blur()" />
      </label>
      <p v-if="!groups.length" class="gy-pempty" data-test="pick-none">Nggak ada gerakan yang cocok.</p>
      <template v-for="g in groups" :key="g.label">
        <div class="gy-fgroup">{{ g.label }}</div>
        <div class="gl-xlist">
          <button v-for="x in g.items" :key="x.id" type="button" class="gl-xrow" :data-chex="x.id" @click="$emit('pick', x.id)">
            <span class="grow"><b>{{ x.name }}</b><small>{{ subOf(x) }}</small></span>
            <span v-if="x.id === currentId" class="ck"><PhCheck :size="12" weight="bold" /></span>
          </button>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PhCheck, PhMagnifyingGlass, PhX } from '@phosphor-icons/vue'
import { dShort } from '@/lib/badanView.js'
import { PROGRAM_EMOJI, PROGRAM_LABEL, bestSet, setText } from '@/lib/gym.js'
import './gym.css'
import './gymLive.css'
import './gymChart.css'

/** Pemilih gerakan buat grafik: per program (Leg & Lower digabung) + gerakan tambahan, bisa dicari. */
const props = defineProps({
  open: { type: Boolean, default: false },
  wide: { type: Boolean, default: false },
  programs: { type: Array, required: true },
  exercises: { type: Array, required: true },
  currentId: { type: Number, default: null },
})
const emit = defineEmits(['close', 'pick'])

const q = ref('')
const norm = (t) => String(t ?? '').trim().replace(/\s+/g, ' ').toLowerCase()

const groups = computed(() => {
  const byId = new Map(props.exercises.map((x) => [x.id, x]))
  const idsOf = (keys) => [...new Set(props.programs.filter((p) => keys.includes(p.key)).flatMap((p) => p.exerciseIds))]
  const inAny = new Set(props.programs.flatMap((p) => p.exerciseIds))
  const hit = (x) => !norm(q.value) || norm(x.name).includes(norm(q.value))
  const mk = (label, ids) => ({ label, items: ids.map((id) => byId.get(id)).filter((x) => x && hit(x)) })
  const prog = (k) => mk(`${PROGRAM_EMOJI[k]} ${PROGRAM_LABEL[k]}`, idsOf([k]))
  return [
    prog('push'),
    prog('pull'),
    mk(`${PROGRAM_EMOJI.leg} Leg & Lower`, idsOf(['leg', 'lower'])),
    prog('upper'),
    mk('Gerakan tambahan', props.exercises.filter((x) => !inAny.has(x.id)).map((x) => x.id)),
  ].filter((g) => g.items.length)
})

function subOf(x) {
  const sets = (x.last?.sets ?? []).map(([w, r]) => [Number(w), Number(r)])
  return sets.length ? `terakhir ${setText(bestSet(sets))} · ${dShort(x.last.on)}` : 'belum ada data'
}

watch(
  () => props.open,
  (v) => !v && (q.value = ''),
)

function onKey(e) {
  if (e.key === 'Escape' && props.open) emit('close')
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>
