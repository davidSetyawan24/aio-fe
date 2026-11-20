<template>
  <div v-if="!target">
    <div class="b-label rise" style="--i: 1">Target</div>
    <div class="shell rise" style="--i: 1">
      <div class="b-core" data-test="no-target">
        <div class="b-notarget">
          <span class="em">🎯</span>
          <div>
            <b>Pasang target biar progresnya keliatan</b>
            <p>Pilih arah (Cutting, Bulking, …), angka target, sama aktivitas harian. Dari situ target makan ikut keitung.</p>
          </div>
        </div>
        <div style="padding: 0 16px 16px">
          <button type="button" class="b-bigbtn" data-test="set-target" @click="$emit('edit')">Atur target <span class="ic"><PhTarget :size="18" weight="bold" /></span></button>
        </div>
      </div>
    </div>
  </div>
  <div v-else>
    <div class="b-label rise" style="--i: 1"><span data-test="target-title">Target · {{ ARAH_INFO[target.arah].n }}<template v-if="target.pace"> · {{ PACE_INFO[target.pace] }}</template></span><button type="button" class="b-lk" data-test="edit-target" @click="$emit('edit')">Atur <PhCaretRight :size="14" weight="bold" /></button></div>
    <div class="shell rise" style="--i: 1">
      <div class="b-core b-pad" data-test="target">
        <div v-if="speed" class="b-prow" data-test="row-speed">
          <div class="b-ptop"><span class="k">Kecepatan</span><span class="b-chip" :class="speed.tone" data-test="speed-chip"><PhCheck v-if="speed.tone === 'green'" :size="12" weight="bold" />{{ speed.chip }}</span></div>
          <div class="b-sbar"><span class="band" :style="{ left: `${speed.lo}%`, right: `${100 - speed.hi}%` }" /><span v-if="speed.mk != null" class="mk" :style="{ left: `${speed.mk}%` }" /></div>
          <div class="b-slab"><span>0</span><span>{{ kgWeek(speed.max / 2) }}</span><span>{{ kgWeek(speed.max) }} kg/minggu</span></div>
          <div class="b-spl" data-test="speed-text">Target {{ speed.verb }} <b>{{ kgWeek(pace.lo) }}–{{ kgWeek(pace.hi) }} kg/minggu</b><template v-if="pace.actual != null"> · 2 minggu terakhir <b>{{ kgWeek(Math.max(0, pace.actual)) }} kg/minggu</b></template></div>
        </div>
        <div v-for="r in goalRows" :key="r.key" class="b-prow" :data-test="`row-${r.key}`">
          <div class="b-ptop"><span class="k">{{ r.label }}</span><span class="v">{{ fmt(r.now, r.dec) }}{{ r.unit }} → <b>{{ fmtGoal(r.goal, r.dec) }}{{ r.unit }}</b></span></div>
          <div class="b-pbar"><i :style="{ width: `${r.pct}%` }" /></div>
          <div class="b-psub">
            <span>awal {{ fmt(r.start, r.dec) }}{{ r.unit }} ({{ dShort(startDate) }})</span>
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
            <div class="b-ptop"><span class="k">Berat</span><span class="v">{{ fmt(weightNow, 1) }} → <b>{{ fmtGoal(goal.goal, 2) }} kg</b></span></div>
            <div class="b-pbar"><i :style="{ width: `${goal.state === 'in' ? 100 : goal.pct}%` }" /></div>
            <div class="b-psub">
              <span>awal {{ fmt(weightStart, 1) }} kg ({{ dShort(startDate) }})</span>
              <span v-if="goal.state === 'in'" class="b-chip green">✓ udah masuk kisaran</span>
              <span v-else-if="goal.state === 'below'" class="b-chip amber">di bawah kisaran {{ range }}</span>
              <span v-else-if="goal.state === 'above'" class="b-chip amber">di atas kisaran {{ range }}</span>
              <span v-else><b>{{ goal.pct }}%</b> jalan · kurang {{ fmt(goal.left, 1) }} kg lagi</span>
            </div>
          </template>
        </div>
        <div v-if="paceText" class="b-est" data-test="eta-pace">
          <span class="em">⏳</span>
          <div>{{ paceText.main }}<small>{{ paceText.small }}</small></div>
        </div>
        <div v-else-if="etaText" class="b-est" data-test="eta">
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
import { ARAH_INFO, PACE_INFO, PACE_STATE, avg7, etaFor, fmt, monthLabel, progress, startValue } from '@/lib/badan.js'
import { dShort, kgWeek, monthShort, rangeScale, reachView, startOn } from '@/lib/badanView.js'
import './badan.css'

const props = defineProps({
  target: { type: Object, default: null },
  /** `bodySummary(...)` — null kalau belum ada timbangan. */
  summary: { type: Object, default: null },
  rows: { type: Array, default: () => [] },
  /** `paceStatus(...)` — null kalau belum ada kecepatan / timbangan. */
  pace: { type: Object, default: null },
  /** `paceEta(...)` — { goal, now, plan } (bulan 'YYYY-MM' atau null). */
  paceEta: { type: Object, default: null },
})
defineEmits(['edit'])

/** Angka target: tanpa nol di belakang koma (20%, 55 kg). */
const fmtGoal = (v, dec) => v.toLocaleString('id-ID', { maximumFractionDigits: dec })

const weightNow = computed(() => props.summary?.weight ?? null)
const goal = computed(() => reachView(props.summary?.weightGoal ?? null, weightNow.value))
/** Tanggal timbangan yang jadi nilai "awal" (bukan tanggal target dipasang). */
const startDate = computed(() => startOn(props.rows, props.target.startedOn))
const weightStart = computed(() => startValue(props.rows, 'weight', props.target.startedOn) ?? weightNow.value)
const range = computed(() => `${fmtGoal(goal.value.min, 2)}–${fmtGoal(goal.value.max, 2)}`)
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

const moving = computed(() => props.target?.arah === 'cutting' || props.target?.arah === 'bulking')

/** Baris Kecepatan (cutting/bulking yang udah pilih kecepatan). */
const speed = computed(() => {
  const p = props.pace
  if (!p || !moving.value) return null
  const cut = props.target.arah === 'cutting'
  const max = cut ? 1 : 0.6
  const pos = (v) => Math.min(100, Math.max(0, (v / max) * 100))
  const chip = p.state ? PACE_STATE[p.state] : 'Butuh 2 minggu data'
  const tone = p.state === 'ok' ? 'green' : p.state ? 'amber' : 'mut'
  return { max, lo: pos(p.lo), hi: pos(p.hi), mk: p.actual == null ? null : pos(p.actual), chip, tone, verb: cut ? 'turun' : 'naik' }
})

/** Perkiraan 2 baris dari kecepatan (cutting/bulking). */
const paceText = computed(() => {
  const e = props.paceEta
  const p = props.pace
  if (!moving.value || !e || !p || (!e.now && !e.plan)) return null
  const goal = `${fmtGoal(e.goal, 2)} kg`
  const note = 'Perkiraan kasar dari rata-rata 7 hari.'
  const planLine = `Kalau pas ${PACE_INFO[props.target.pace]} (${kgWeek(p.lo)}–${kgWeek(p.hi)} kg/minggu)`
  if (e.now) {
    const main = `Kalau temponya kayak 2 minggu terakhir (${kgWeek(p.actual)} kg/minggu), berat ${goal} kira-kira ±${monthShort(e.now)}.`
    return { main, small: e.plan ? `${planLine}: ±${monthShort(e.plan)}. ${note}` : note }
  }
  return { main: `${planLine}, berat ${goal} kira-kira ±${monthShort(e.plan)}.`, small: note }
})

const etaText = computed(() => {
  if (!props.target || !props.summary || moving.value) return null
  const e = etaFor(props.target, props.rows, props.summary.lastOn)
  if (!e) return null
  const month = monthLabel(`${e.month}-01`)
  if (e.key === 'weight') return { before: `nyampe ${fmtGoal(goal.value.goal, 2)} kg kira-kira`, month }
  return { before: `lemak ${fmtGoal(props.target.fat, 1)}% kira-kira`, month }
})
</script>
