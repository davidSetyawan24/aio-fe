<template>
  <div v-if="!target">
    <div class="b-label rise" style="--i: 1">Target</div>
    <div class="shell rise" style="--i: 1">
      <div class="b-core" data-test="no-target">
        <div class="b-notarget">
          <span class="em">🎯</span>
          <div>
            <b>Pasang target biar progresnya keliatan</b>
            <p>Misal lemak 20%, otot 55 kg, berat dijaga 73–76 kg. Semuanya boleh dikosongin.</p>
          </div>
        </div>
        <div style="padding: 0 16px 16px">
          <button type="button" class="b-bigbtn" data-test="set-target" @click="$emit('edit')">Atur target <span class="ic"><PhTarget :size="18" weight="bold" /></span></button>
        </div>
      </div>
    </div>
  </div>
  <div v-else>
    <div class="b-label rise" style="--i: 1"><span>Target · {{ ARAH_INFO[target.arah].n }}</span><button type="button" class="b-lk" data-test="edit-target" @click="$emit('edit')">Atur <PhCaretRight :size="14" weight="bold" /></button></div>
    <div class="shell rise" style="--i: 1">
      <div class="b-core b-pad" data-test="target">
        <div v-for="r in goalRows" :key="r.key" class="b-prow" :data-test="`row-${r.key}`">
          <div class="b-ptop"><span class="k">{{ r.label }}</span><span class="v">{{ fmt(r.now, r.dec) }}{{ r.unit }} → <b>{{ fmtGoal(r.goal, r.dec) }}{{ r.unit }}</b></span></div>
          <div class="b-pbar"><i :style="{ width: `${r.pct}%` }" /></div>
          <div class="b-psub">
            <span>awal {{ fmt(r.start, r.dec) }}{{ r.unit }} ({{ dShort(target.startedOn) }})</span>
            <span v-if="r.reached">udah nyampe 🎉</span>
            <span v-else><b>{{ r.pct }}%</b> jalan · kurang {{ fmt(r.left, r.dec) }}</span>
          </div>
        </div>
        <div v-if="goal" class="b-prow" data-test="row-weight">
          <template v-if="goal.mode === 'keep'">
            <div class="b-ptop"><span class="k">Berat</span><span class="v">kisaran <b>{{ range }} kg</b></span></div>
            <div class="b-wbar"><span class="band" :style="{ left: `${scale.pos(goal.min)}%`, right: `${100 - scale.pos(goal.max)}%` }" /><span class="mk" :style="{ left: `${scale.pos(weightNow)}%` }" /></div>
            <div class="b-psub">
              <span>rata-rata {{ fmt(weightNow, 1) }} kg</span>
              <span v-if="goal.inRange" class="b-chip green"><PhCheck :size="12" weight="bold" /> aman di kisaran</span>
              <span v-else class="b-chip amber">di luar kisaran</span>
            </div>
          </template>
          <template v-else>
            <div class="b-ptop"><span class="k">Berat</span><span class="v">{{ fmt(weightNow, 1) }} → <b>{{ fmt(goal.goal, 0) }} kg</b></span></div>
            <div class="b-pbar"><i :style="{ width: `${goal.state === 'in' ? 100 : goal.pct}%` }" /></div>
            <div class="b-psub">
              <span>awal {{ fmt(weightStart, 1) }} kg ({{ dShort(target.startedOn) }})</span>
              <span v-if="goal.state === 'in'" class="b-chip green">✓ udah masuk kisaran</span>
              <span v-else-if="goal.state === 'below'" class="b-chip amber">di bawah kisaran {{ range }}</span>
              <span v-else-if="goal.state === 'above'" class="b-chip amber">di atas kisaran {{ range }}</span>
              <span v-else><b>{{ goal.pct }}%</b> jalan · kurang {{ fmt(goal.left, 1) }} kg lagi</span>
            </div>
          </template>
        </div>
        <div v-if="etaText" class="b-est" data-test="eta">
          <span class="em">⏳</span>
          <div>Kalau temponya kayak 4 minggu terakhir, {{ etaText.before }} <b>±{{ etaText.month }}</b>.<small>Perkiraan kasar dari rata-rata 7 hari. Angka timbangan lemak emang naik-turun.</small></div>
        </div>
        <button type="button" class="b-ghostbtn" data-test="edit-target-btn" @click="$emit('edit')"><PhTarget :size="18" /> Atur target</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PhCaretRight, PhCheck, PhTarget } from '@phosphor-icons/vue'
import { ARAH_INFO, avg7, etaFor, fmt, monthLabel, progress, startValue } from '@/lib/badan.js'
import { dShort, rangeScale } from '@/lib/badanView.js'
import './badan.css'

const props = defineProps({
  target: { type: Object, default: null },
  /** `bodySummary(...)` — null kalau belum ada timbangan. */
  summary: { type: Object, default: null },
  rows: { type: Array, default: () => [] },
})
defineEmits(['edit'])

/** Angka target: tanpa nol di belakang koma (20%, 55 kg). */
const fmtGoal = (v, dec) => v.toLocaleString('id-ID', { maximumFractionDigits: dec })

const goal = computed(() => props.summary?.weightGoal ?? null)
const weightNow = computed(() => props.summary?.weight ?? null)
const weightStart = computed(() => startValue(props.rows, 'weight', props.target.startedOn) ?? weightNow.value)
const range = computed(() => `${fmt(goal.value.min, 0)}–${fmt(goal.value.max, 0)}`)
const scale = computed(() => (goal.value && weightNow.value != null ? rangeScale(goal.value.min, goal.value.max, weightNow.value) : null))

/** Lemak & Otot: bar progres kalau targetnya diisi. */
const goalRows = computed(() => {
  const t = props.target
  const s = props.summary
  if (!t || !s) return []
  const defs = [
    { key: 'fat', label: 'Lemak', unit: '%', dec: 1, goal: t.fat, now: s.fat },
    { key: 'muscle', label: 'Otot', unit: ' kg', dec: 2, goal: t.muscle, now: s.muscle },
  ]
  return defs
    .filter((d) => d.goal != null && d.now != null)
    .map((d) => {
      const start = startValue(props.rows, d.key, t.startedOn) ?? d.now
      const p = progress(start, d.now, d.goal)
      return { ...d, start, pct: p.pct, left: p.left, reached: p.reached }
    })
})

const etaText = computed(() => {
  if (!props.target || !props.summary) return null
  const e = etaFor(props.target, props.rows, props.summary.lastOn)
  if (!e) return null
  const month = monthLabel(`${e.month}-01`)
  if (e.key === 'weight') return { before: `nyampe ${fmt(goal.value.goal, 0)} kg kira-kira`, month }
  return { before: `lemak ${fmtGoal(props.target.fat, 1)}% kira-kira`, month }
})
</script>
