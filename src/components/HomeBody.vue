<template>
  <div v-if="body" data-test="home-body">
    <div class="h-label rise"><span>Badan</span><button type="button" class="h-lk" data-test="home-body-link" @click="go">Badan <PhCaretRight :size="14" weight="bold" /></button></div>
    <div class="shell rise">
      <div class="core hb-card" data-test="home-body-card" @click="go">
        <div class="hb-top">
          <span class="hb-ic">⚖️</span>
          <div class="hb-grow"><b data-test="hb-label">{{ avgLabel(body.count) }}</b><small>{{ sub }}</small></div>
        </div>
        <div class="hb-3">
          <div>
            <div class="hb-k">Lemak</div>
            <div class="hb-v">{{ fmt(body.fat, 1) }}<small v-if="body.fat != null">%</small></div>
            <div v-if="fatD" class="hb-d" :class="body.tones.fat" data-test="hb-fat">{{ arrow(fatD) }}{{ fatD.text }}</div>
          </div>
          <div>
            <div class="hb-k">Otot</div>
            <div class="hb-v">{{ fmt(body.muscle, 1) }}<small v-if="body.muscle != null">kg</small></div>
            <div v-if="muscleD" class="hb-d" :class="body.tones.muscle" data-test="hb-muscle">{{ arrow(muscleD) }}{{ muscleD.text }}</div>
          </div>
          <div>
            <div class="hb-k">Berat</div>
            <div class="hb-v">{{ fmt(body.weight, 1) }}<small v-if="body.weight != null">kg</small></div>
            <div v-if="note" class="hb-d" :class="note.tone" data-test="hb-weight">{{ note.text }}</div>
          </div>
        </div>
        <template v-if="path">
          <svg class="hb-spark" viewBox="0 0 300 36" preserveAspectRatio="none" data-test="hb-spark"><path :d="path" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" /></svg>
          <div class="hb-cap">lemak · rata-rata 7 hari · 30 hari terakhir</div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useIonRouter } from '@ionic/vue'
import { PhCaretRight } from '@phosphor-icons/vue'
import { fmt } from '@/lib/badan.js'
import { avgLabel, deltaView, headerSub, reachView } from '@/lib/badanView.js'

const props = defineProps({
  body: { type: Object, default: null },
  today: { type: String, required: true },
})
const ionRouter = useIonRouter()
const go = () => ionRouter.push('/tabs/menu/badan')

const fatD = computed(() => (props.body ? deltaView(props.body.deltas.fat, 1) : null))
const muscleD = computed(() => (props.body ? deltaView(props.body.deltas.muscle, 1) : null))
const sub = computed(() => (props.body ? headerSub(null, props.body.lastOn, props.body.lastAt, props.today) : ''))
const arrow = (d) => (d.dir === 'down' ? '↓' : d.dir === 'up' ? '↑' : '')

const note = computed(() => {
  const b = props.body
  if (!b) return null
  const g = reachView(b.weightGoal, b.weight)
  if (!g) {
    const d = deltaView(b.deltas.weight, 1)
    return d ? { tone: 'neutral', text: `${arrow(d)}${d.text}` } : null
  }
  const range = `${fmt(g.min, 0)}–${fmt(g.max, 0)}`
  if (g.mode === 'keep') return g.inRange ? { tone: 'good', text: 'aman di kisaran' } : { tone: 'warn', text: `di luar kisaran ${range}` }
  if (g.state === 'in') return { tone: 'good', text: '✓ udah masuk kisaran' }
  if (g.state === 'below') return { tone: 'warn', text: `di bawah kisaran ${range}` }
  if (g.state === 'above') return { tone: 'warn', text: `di atas kisaran ${range}` }
  return { tone: 'neutral', text: `kurang ${fmt(g.left, 1)} kg ke ${fmt(g.goal, 0)}` }
})

const path = computed(() => {
  const pts = props.body?.spark ?? []
  if (pts.length < 2) return ''
  const lo = Math.min(...pts)
  const hi = Math.max(...pts)
  const span = hi - lo || 1
  return pts.map((v, i) => `${i ? 'L' : 'M'}${((i / (pts.length - 1)) * 300).toFixed(1)},${(4 + (1 - (v - lo) / span) * 28).toFixed(1)}`).join('')
})
</script>

<style scoped>
.h-label { display: flex; justify-content: space-between; align-items: center; min-height: 20px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 24px 8px 10px; }
.h-lk { display: inline-flex; align-items: center; gap: 2px; min-height: 32px; padding: 0; border: 0; background: none; color: var(--text); font: 700 13px var(--ion-font-family); letter-spacing: 0; text-transform: none; cursor: pointer; }
.hb-card { padding: 14px 14px 12px; cursor: pointer; }
.hb-top { display: flex; align-items: center; gap: 12px; }
.hb-ic { width: 42px; height: 42px; border-radius: 14px; display: grid; place-items: center; font-size: 20px; background: #E4F7C4; flex-shrink: 0; }
:root.theme-dark .hb-ic { background: rgba(200, 240, 74, .14); }
.hb-grow b { display: block; font-size: 15px; font-weight: 800; }
.hb-grow small { display: block; font-size: 12px; font-weight: 600; color: var(--muted); margin-top: 1px; }
.hb-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-top: 12px; }
.hb-3 > div { padding: 10px 10px 9px; border-radius: 16px; background: var(--soft); min-width: 0; }
.hb-k { font-size: 11.5px; font-weight: 700; color: var(--muted); }
.hb-v { font-size: 18px; font-weight: 800; letter-spacing: -0.03em; margin-top: 2px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.hb-v small { font-size: 11px; color: var(--muted); font-weight: 700; margin-left: 1px; }
.hb-d { font-size: 11.5px; font-weight: 800; margin-top: 2px; font-variant-numeric: tabular-nums; }
.hb-d.neutral { color: var(--muted); font-weight: 700; }
.hb-d.good { color: var(--green); }
.hb-d.bad { color: var(--red); }
.hb-d.warn { color: #C27C00; }
:root.theme-dark .hb-d.warn { color: var(--amber); }
.hb-spark { display: block; width: 100%; height: 36px; margin-top: 10px; color: var(--muted); }
.hb-cap { font-size: 11px; font-weight: 600; color: var(--muted); margin-top: 2px; }
@media (hover: hover) { .hb-card:hover { background: rgba(127, 127, 120, .05); } }
</style>
