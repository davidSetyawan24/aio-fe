<template>
  <div>
    <div class="b-label rise" style="--i: 2"><span>Grafik</span><small>pilih yang mau dibandingin</small></div>
    <div class="shell rise b-chart" style="--i: 2">
      <div class="b-core b-pad">
        <div class="b-mchips" data-test="chips">
          <button v-for="k in CHART_ORDER" :key="k" type="button" class="b-mc" :class="{ on: isOn(k) }" :data-test="`chip-${k}`" :aria-pressed="isOn(k)" @click="toggle(k)">
            <span class="mdot" :style="{ '--c': `var(--b-c-${k})` }" />{{ k === 'visceral' ? METRIC_LABEL[k][0] : METRIC_LABEL[k][1] }}
          </button>
        </div>
        <div class="b-lhead">
          <span data-test="lhead">{{ avgLabel(count7(rows, lastOn)) }} · perubahan {{ since }}</span>
          <div class="b-seg" role="group">
            <button v-for="[v, l] in RANGES" :key="v" type="button" :class="{ on: range === v }" :data-test="`range-${v}`" @click="range = v">{{ l }}</button>
          </div>
        </div>
        <div class="b-legrows">
          <div v-for="r in legend" :key="r.key" class="b-lrow" data-test="lrow">
            <span class="b-ldot" :style="{ background: `var(--b-c-${r.key})` }" />
            <span class="b-ln">{{ METRIC_LABEL[r.key][0] }}<small v-if="r.tgt">{{ r.tgt }}</small></span>
            <span class="b-lv" :class="{ none: r.none }">{{ r.value }}<small v-if="r.unit">{{ r.unit }}</small></span>
            <span class="b-ld" :class="r.tone" :data-test="`lrow-${r.key}`">{{ r.delta }}</span>
          </div>
        </div>
        <div ref="wrap" class="b-cwrap" :class="{ many: onKeys.length > 4 }">
          <svg :viewBox="`0 0 ${W} ${H}`" :height="H" data-test="svg">
            <template v-if="single">
              <template v-for="t in yTicks" :key="t.v">
                <line class="grid" :x1="L" :x2="W - R" :y1="t.y" :y2="t.y" />
                <text class="ax" :x="L - 8" :y="t.y + 3.5" text-anchor="end">{{ t.label }}</text>
              </template>
              <template v-if="bandLines">
                <rect class="band" :x="L" :width="W - L - R" :y="bandLines.top" :height="bandLines.bottom - bandLines.top" />
                <line class="tgt" :x1="L" :x2="W - R" :y1="bandLines.top" :y2="bandLines.top" />
                <line class="tgt" :x1="L" :x2="W - R" :y1="bandLines.bottom" :y2="bandLines.bottom" />
              </template>
              <line v-if="goalLine != null" class="tgt" :x1="L" :x2="W - R" :y1="goalLine" :y2="goalLine" />
            </template>
            <template v-else>
              <line v-for="f in [0.25, 0.5, 0.75]" :key="f" class="grid" :x1="L" :x2="W - R" :y1="Tp + f * (H - Tp - B)" :y2="Tp + f * (H - Tp - B)" />
            </template>
            <line class="grid" :x1="L" :x2="W - R" :y1="H - B" :y2="H - B" />
            <text v-for="t in xTicks" :key="t.d" class="ax" :x="t.x" :y="H - 6" :text-anchor="t.anchor">{{ t.label }}</text>
            <text v-if="noData" class="nodata" :x="noData.x" :y="(Tp + H - B) / 2" text-anchor="middle">{{ noData.text }}</text>
            <template v-if="range === 30">
              <template v-for="k in onKeys" :key="`d${k}`">
                <circle v-for="p in series[k].daily" :key="p.d" class="dot" :data-k="k" :cx="X(p.d)" :cy="Y[k](p.v)" r="2.4" :style="{ fill: `var(--b-c-${k})` }" />
              </template>
            </template>
            <path v-if="single && areaPath" class="area" :d="areaPath" :style="{ fill: `var(--b-c-${single})` }" />
            <template v-for="k in [...onKeys].reverse()" :key="`a${k}`">
              <path v-if="lineOf(k).length > 1" class="avg" :d="pathOf(lineOf(k), k)" :style="{ stroke: `var(--b-c-${k})` }" :data-test="k === 'sleep' ? 'sleep-path' : 'avg-path'" />
            </template>
            <template v-for="k in onKeys" :key="`l${k}`">
              <circle v-if="lineOf(k).length" class="last" :cx="X(lineOf(k).at(-1).d)" :cy="Y[k](lineOf(k).at(-1).v)" r="4.5" :style="{ fill: `var(--b-c-${k})` }" />
            </template>
            <template v-if="cursor">
              <line class="cur" :x1="X(cursor.d)" :x2="X(cursor.d)" :y1="Tp" :y2="H - B" />
              <template v-for="h in cursor.hl" :key="h.k">
                <circle class="hlp" :cx="X(cursor.d)" :cy="h.y" r="5" :style="{ fill: `var(--b-c-${h.k})` }" />
              </template>
            </template>
            <rect :x="L" y="0" :width="Math.max(0, W - L - R)" :height="H" fill="transparent" data-test="hit" @pointermove="show" @pointerdown="show" @pointerleave="cursor = null" />
          </svg>
          <div v-if="cursor" ref="tipEl" class="b-tip" data-test="tip" :style="{ left: `${tipLeft}px` }">
            <b>{{ dDay(cursor.d) }}<template v-if="cursor.row?.weighedAt"> · {{ jam(cursor.row.weighedAt) }}</template></b>
            <div v-for="k in onKeys" :key="k" class="tr">
              <i :style="{ background: `var(--b-c-${k})` }" /><span>{{ METRIC_LABEL[k][1] }}</span><em>{{ tipValue(k) }}</em>
            </div>
            <small>{{ isOn('sleep') ? 'angka hari itu' : 'angka timbangan hari itu' }}</small>
          </div>
        </div>
        <div class="b-legend">
          <span><i class="l1" />rata-rata 7 hari</span>
          <span v-if="range === 30"><i class="l2" />harian</span>
          <span v-if="onKeys.length > 1">tiap garis pakai skala sendiri</span>
          <span v-if="bandLines"><i class="l3" />kisaran berat</span>
          <span v-if="isOn('sleep')">tidur = total jam per malam</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BLN, addDays, daysBetween } from '@/lib/agenda.js'
import { ADEC, CHART_ORDER, DEFAULT_ON, METRICS, METRIC_LABEL, UNIT, avg7, count7, fmt, tone } from '@/lib/badan.js'
import { chartSeries, gapSegments, niceStep, scaleFor, sleepSeries } from '@/lib/badanChart.js'
import { durL } from '@/lib/badanSleep.js'
import { avgLabel, dDay, dShort, fmtU, jam } from '@/lib/badanView.js'
import { useMedia } from '@/lib/media.js'
import { showToast } from '@/lib/personalForm.js'
import './badan.css'

const props = defineProps({
  rows: { type: Array, required: true },
  target: { type: Object, default: null },
  lastOn: { type: String, required: true },
  /** Data tidur (chip Tidur). */
  sleeps: { type: Array, default: () => [] },
})

const RANGES = [[30, '30 hari'], [90, '90 hari'], [365, '1 tahun']]
const L0 = 8
const R = 10
const Tp = 12
const B = 26
const on = ref([...DEFAULT_ON])
const range = ref(30)
const cursor = ref(null)
const wrap = ref(null)
const tipEl = ref(null)
const tipLeft = ref(0)
const width = ref(0)
const pc = useMedia('(min-width: 1100px)')
const xl = useMedia('(min-width: 1600px)')

const onKeys = computed(() => CHART_ORDER.filter((k) => on.value.includes(k)))
const single = computed(() => (onKeys.value.length === 1 ? onKeys.value[0] : null))
const isOn = (k) => on.value.includes(k)
const unitOf = (k) => (UNIT[k] ? (UNIT[k] === '%' ? '%' : ` ${UNIT[k]}`) : '')

function toggle(k) {
  cursor.value = null
  if (isOn(k)) {
    if (on.value.length === 1) return showToast('Minimal satu yang nyala ya')
    on.value = on.value.filter((x) => x !== k)
  } else on.value = [...on.value, k]
}

const WEIGH_KEYS = CHART_ORDER.filter((k) => k !== 'sleep')
/**
 * Ujung kanan sumbu: tanggal paling baru antara timbangan terakhir & tidur terakhir (tidur pagi ini tetep kegambar walau belum nimbang).
 * Rata-rata & perubahan metrik timbangan tetep patokan `lastOn` (timbangan terakhir).
 */
const end = computed(() => props.sleeps.reduce((m, s) => (s.sleptOn > m ? s.sleptOn : m), props.lastOn))
const series = computed(() => ({ ...chartSeries(props.rows, WEIGH_KEYS, range.value, end.value), sleep: sleepSeries(props.sleeps, range.value, end.value) }))
/** Garis yang digambar: rata-rata 7 hari (tidur juga, dalam jam). */
const lineOf = (k) => series.value[k].avg
const sleepOn = computed(() => new Map(props.sleeps.map((s) => [s.sleptOn, s])))
const x0 = computed(() => addDays(end.value, -(range.value - 1)))
const inRange = computed(() => props.rows.filter((r) => r.weighedOn >= x0.value && r.weighedOn <= end.value))

/* ukuran */
const W = computed(() => Math.max(260, width.value))
const H = computed(() => (pc.value ? (xl.value ? 330 : 290) : 230))
const L = computed(() => (single.value === 'sleep' ? 34 : single.value ? 40 : L0))
const span = computed(() => Math.max(1, range.value - 1))
const X = (d) => L.value + (daysBetween(x0.value, d) / span.value) * (W.value - L.value - R)

/* skala per garis */
const scales = computed(() => {
  const out = {}
  for (const k of onKeys.value) {
    const vals = series.value[k].daily.map((p) => p.v)
    if (!vals.length) continue
    const t = props.target
    const extra = k === 'weight' && single.value === 'weight' && t?.weightMin != null && t?.weightMax != null ? [t.weightMin, t.weightMax] : []
    out[k] = scaleFor(vals, k, extra)
  }
  return out
})
const Y = computed(() => {
  const out = {}
  for (const k of onKeys.value) {
    const s = scales.value[k] ?? { lo: 0, hi: 1 }
    out[k] = (v) => Tp + (1 - (v - s.lo) / (s.hi - s.lo)) * (H.value - Tp - B)
  }
  return out
})

const yTicks = computed(() => {
  const k = single.value
  const s = k && scales.value[k]
  if (!s) return []
  const step = niceStep((s.hi - s.lo) / 4)
  const dec = k === 'sleep' ? (step < 1 ? 1 : 0) : step < 0.1 ? 2 : step < 1 ? 1 : 0
  const unit = k === 'sleep' ? 'j' : ''
  const out = []
  for (let v = Math.ceil(s.lo / step) * step, n = 0; v <= s.hi && n < 20; v += step, n++) out.push({ v, y: Y.value[k](v), label: `${fmt(v, dec)}${unit}` })
  return out
})
const bandLines = computed(() => {
  const t = props.target
  if (single.value !== 'weight' || t?.weightMin == null || t?.weightMax == null || !Y.value.weight || !scales.value.weight) return null
  return { top: Y.value.weight(t.weightMax), bottom: Y.value.weight(t.weightMin) }
})
const goalLine = computed(() => {
  const k = single.value
  const v = k === 'fat' || k === 'muscle' ? props.target?.[k] : null
  const s = k && scales.value[k]
  return v != null && s && v >= s.lo && v <= s.hi ? Y.value[k](v) : null
})

const xTicks = computed(() => {
  const out = []
  const push = (d, label) => {
    const x = X(d)
    out.push({ d, x, label, anchor: x > W.value - 30 ? 'end' : x < L.value + 20 ? 'start' : 'middle' })
  }
  if (range.value === 30) {
    for (let d = end.value; d >= x0.value; d = addDays(d, -7)) push(d, dShort(d))
  } else {
    for (let d = x0.value; d <= end.value; d = addDays(d, 1)) {
      const m = Number(d.slice(5, 7)) - 1
      if (d.slice(8) === '01' && (range.value === 90 || m % 2 === 0)) push(d, BLN[m])
    }
  }
  return out
})

/** Tanggal data paling lama dari garis yang nyala (timbangan dan/atau tidur). */
const firstOn = computed(() => {
  const dates = []
  if (onKeys.value.some((k) => k !== 'sleep')) dates.push(...props.rows.map((r) => r.weighedOn))
  if (isOn('sleep')) dates.push(...props.sleeps.map((s) => s.sleptOn))
  return dates.length ? dates.reduce((m, d) => (d < m ? d : m)) : null
})
const noData = computed(() => {
  if (single.value === 'sleep' && !series.value.sleep.daily.length) return { x: (L.value + W.value - R) / 2, text: 'belum ada data tidur' }
  return firstOn.value && daysBetween(x0.value, firstOn.value) > 3 ? { x: (L.value + X(firstOn.value)) / 2, text: 'belum ada data' } : null
})

/** Garis rata-rata; bolong > 7 hari = garisnya putus (titik sendirian nggak kegambar garis, cuma titik terakhir yang dibuletin). */
const segPath = (seg, k) => seg.map((p, i) => `${i ? 'L' : 'M'}${X(p.d).toFixed(1)},${Y.value[k](p.v).toFixed(1)}`).join('')
const pathOf = (pts, k) => gapSegments(pts).filter((seg) => seg.length > 1).map((seg) => segPath(seg, k)).join('')
const areaPath = computed(() => {
  const k = single.value
  if (!k) return ''
  return gapSegments(lineOf(k))
    .filter((seg) => seg.length > 1)
    .map((seg) => `${segPath(seg, k)}L${X(seg.at(-1).d)},${H.value - B}L${X(seg[0].d)},${H.value - B}Z`)
    .join('')
})

/* legenda */
const since = computed(() => {
  if (range.value === 30) return '30 hari'
  const first = lineOf(onKeys.value[0])[0]?.d
  return first ? `sejak ${dShort(first)}` : 'sejak awal'
})
/** Rata-rata tidur (menit) malam yang ada datanya di `date`−6…`date`; nggak ada → null. */
function sleepAvg(date) {
  const from = addDays(date, -6)
  const week = props.sleeps.filter((s) => s.sleptOn >= from && s.sleptOn <= date)
  return week.length ? Math.round(week.reduce((a, s) => a + s.totalMin, 0) / week.length) : null
}
function sleepLegend() {
  const a1 = sleepAvg(end.value)
  const first = series.value.sleep.avg[0]
  const a0 = first ? Math.round(first.v * 60) : null
  const dv = a1 == null || a0 == null ? null : a1 - a0
  return {
    key: 'sleep',
    tgt: '',
    value: a1 == null ? 'belum ada data' : durL(a1),
    none: a1 == null,
    unit: '',
    delta: a1 == null ? '' : dv == null ? '–' : `${dv < 0 ? '↓' : dv > 0 ? '↑' : '±'}${Math.abs(dv)} m`,
    tone: 'neutral',
  }
}
const legend = computed(() =>
  onKeys.value.map((key) => {
    if (key === 'sleep') return sleepLegend()
    const dec = ADEC[key]
    const a1 = avg7(props.rows, key, props.lastOn)
    const a0 = series.value[key].avg[0]?.v
    const dv = a1 == null || a0 == null ? null : +(a1 - a0).toFixed(dec)
    const t = props.target
    let tgt = ''
    if (t) {
      if (key === 'fat' && t.fat != null) tgt = `target ${fmt(t.fat, METRICS.fat.dec)}%`
      else if (key === 'muscle' && t.muscle != null) tgt = `target ${fmt(t.muscle, METRICS.muscle.dec)} kg`
      else if (key === 'weight' && t.weightMin != null && t.weightMax != null) tgt = `kisaran ${fmt(t.weightMin, 0)}–${fmt(t.weightMax, 0)}`
    }
    return {
      key,
      tgt,
      value: fmt(a1, dec),
      unit: a1 != null && UNIT[key] ? UNIT[key] : '',
      delta: dv == null ? '–' : `${dv < 0 ? '↓' : dv > 0 ? '↑' : '±'}${fmt(Math.abs(dv), dec)}`,
      tone: tone(t?.arah ?? null, key, dv),
    }
  }),
)

/* crosshair + tooltip */
/** Angka asli hari itu di tooltip; tidur = durasi ("6 j 43 m"). */
function tipValue(k) {
  if (k === 'sleep') {
    const s = sleepOn.value.get(cursor.value.d)
    return s ? durL(s.totalMin) : '–'
  }
  return fmtU(cursor.value.row?.[k], METRICS[k].dec, unitOf(k))
}
function show(ev) {
  const dates = new Set()
  if (onKeys.value.some((k) => k !== 'sleep')) inRange.value.forEach((r) => dates.add(r.weighedOn))
  if (isOn('sleep')) series.value.sleep.daily.forEach((p) => dates.add(p.d))
  const list = [...dates].sort()
  if (!list.length) return
  const rc = wrap.value.getBoundingClientRect()
  const px = ev.clientX - rc.left
  let best = list[0]
  for (const d of list) if (Math.abs(X(d) - px) < Math.abs(X(best) - px)) best = d
  const hl = []
  for (const k of onKeys.value) {
    const p = lineOf(k).find((a) => a.d === best)
    if (p) hl.push({ k, y: Y.value[k](p.v) })
  }
  cursor.value = { d: best, row: inRange.value.find((r) => r.weighedOn === best) ?? null, hl }
  nextTick(() => {
    const tw = tipEl.value?.offsetWidth ?? 0
    tipLeft.value = Math.min(W.value - tw, Math.max(0, X(best) - tw / 2))
  })
}

let ro = null
function measure() {
  if (wrap.value) width.value = wrap.value.clientWidth
}
onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && wrap.value) {
    ro = new ResizeObserver(measure)
    ro.observe(wrap.value)
  }
})
onBeforeUnmount(() => ro?.disconnect())
watch(range, () => (cursor.value = null))
</script>

<style scoped>
.b-chart {
  --b-c-fat: #141410; --b-c-muscle: #2BA864; --b-c-weight: #4C8DF6; --b-c-water: #1FA9B8; --b-c-visceral: #F5A524;
  --b-c-bone: #9277D9; --b-c-protein: #E2669F; --b-c-bmr: #F0533D; --b-c-bmi: #A08A52; --b-c-score: #7FA51E; --b-c-sleep: #6C63D9;
}
:root.theme-dark .b-chart {
  --b-c-fat: #F2F2EE; --b-c-muscle: #C8F04A; --b-c-weight: #6FA6FF; --b-c-water: #3CC6D3; --b-c-visceral: #F5B544;
  --b-c-bone: #AE97F0; --b-c-protein: #F08ABA; --b-c-bmr: #FF7A66; --b-c-bmi: #C9AE6E; --b-c-score: #9CCB3A; --b-c-sleep: #9A92FF;
}
.b-mchips { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; margin: 0 -16px; padding: 0 16px 2px; scroll-padding: 16px;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 16px, #000 calc(100% - 28px), transparent); mask-image: linear-gradient(90deg, transparent, #000 16px, #000 calc(100% - 28px), transparent); }
.b-mchips::-webkit-scrollbar { display: none; }
.b-mc { flex-shrink: 0; display: inline-flex; align-items: center; gap: 7px; height: 36px; padding: 0 12px 0 10px; border: 0; border-radius: 99px; background: transparent; box-shadow: inset 0 0 0 1.5px var(--hair);
  font: 700 12.5px var(--ion-font-family); color: var(--muted); cursor: pointer; white-space: nowrap; transition: background .2s, color .2s, transform .2s var(--spring); }
.b-mc:active { transform: scale(.96); }
.b-mc .mdot { width: 10px; height: 10px; border-radius: 99px; box-shadow: inset 0 0 0 2px var(--c); opacity: .55; }
.b-mc.on { background: var(--soft); box-shadow: none; color: var(--text); }
.b-mc.on .mdot { background: var(--c); box-shadow: none; opacity: 1; }
.b-lhead { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin: 16px 2px 6px; font-size: 11.5px; font-weight: 700; color: var(--muted); }
.b-seg { display: inline-flex; padding: 3px; border-radius: 99px; background: var(--soft); }
.b-seg button { height: 30px; padding: 0 10px; border: 0; border-radius: 99px; background: transparent; font: 700 12px var(--ion-font-family); color: var(--muted); cursor: pointer; white-space: nowrap; transition: background .25s var(--spring), color .2s; }
.b-seg button.on { background: var(--card); color: var(--text); box-shadow: 0 1px 2px rgba(0, 0, 0, .06), 0 6px 14px -6px rgba(0, 0, 0, .18); }
.b-legrows { display: grid; gap: 0; }
.b-lrow { display: grid; grid-template-columns: 12px minmax(0, 1fr) auto 56px; align-items: center; gap: 10px; min-height: 36px; padding: 4px 2px; }
.b-lrow + .b-lrow { box-shadow: inset 0 1px 0 var(--hair); }
.b-ldot { width: 12px; height: 4px; border-radius: 9px; }
.b-ln { font-size: 13.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.b-ln small { font-size: 11.5px; font-weight: 600; color: var(--muted); margin-left: 6px; }
.b-lv { font-size: 14.5px; font-weight: 800; font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.b-lv small { font-size: 11px; font-weight: 700; color: var(--muted); margin-left: 1px; }
.b-lv.none { font-size: 12.5px; font-weight: 700; color: var(--muted); }
.b-ld { font-size: 12.5px; font-weight: 800; font-variant-numeric: tabular-nums; text-align: right; color: var(--muted); }
.b-ld.good { color: var(--green); }
.b-ld.bad { color: var(--red); }
.b-cwrap { position: relative; margin: 8px -4px 0; user-select: none; -webkit-user-select: none; touch-action: pan-y; }
.b-cwrap svg { display: block; width: 100%; overflow: visible; }
.b-cwrap .ax { font: 600 10.5px var(--ion-font-family); fill: var(--muted); font-variant-numeric: tabular-nums; }
.b-cwrap .grid { stroke: var(--hair); stroke-width: 1; }
.b-cwrap .avg { fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.b-cwrap .area { opacity: .05; }
.b-cwrap .dot { opacity: .55; }
.b-cwrap.many .dot { opacity: .16; }
.b-cwrap .last { stroke: var(--card); stroke-width: 2.5; }
.b-cwrap .tgt { stroke: var(--green); stroke-width: 1.5; stroke-dasharray: 5 5; }
.b-cwrap .band { fill: var(--green); opacity: .09; }
.b-cwrap .cur { stroke: var(--text); stroke-width: 1; opacity: .35; }
.b-cwrap .hlp { stroke: var(--card); stroke-width: 2; }
.b-cwrap .nodata { font: 600 12px var(--ion-font-family); fill: var(--muted); }
.b-tip { position: absolute; top: 0; z-index: 3; padding: 9px 12px; border-radius: 16px; background: var(--card); color: var(--text); border: 1px solid var(--hair); font-size: 12px; font-weight: 600; white-space: nowrap; pointer-events: none;
  box-shadow: 0 10px 24px -10px rgba(0, 0, 0, .5); font-variant-numeric: tabular-nums; }
:root.theme-dark .b-tip { background: #24241F; }
.b-tip b { display: block; font-size: 12.5px; margin-bottom: 2px; }
.b-tip .tr { display: flex; align-items: center; gap: 7px; margin-top: 3px; }
.b-tip .tr i { width: 8px; height: 8px; border-radius: 99px; flex-shrink: 0; }
.b-tip .tr span { flex: 1; opacity: .75; }
.b-tip .tr em { font-style: normal; font-weight: 800; margin-left: 12px; }
.b-tip small { display: block; font-size: 10.5px; opacity: .55; margin-top: 5px; }
.b-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 11.5px; font-weight: 700; color: var(--muted); margin: 10px 2px 0; }
.b-legend span { display: inline-flex; align-items: center; gap: 6px; }
.b-legend .l1 { width: 16px; height: 3px; border-radius: 9px; background: var(--muted); }
.b-legend .l2 { width: 6px; height: 6px; border-radius: 9px; background: var(--muted); opacity: .45; }
.b-legend .l3 { width: 16px; height: 0; border-top: 2px dashed var(--green); }
@media (min-width: 1100px) {
  .b-mchips { flex-wrap: wrap; overflow: visible; margin: 0; padding: 0; -webkit-mask-image: none; mask-image: none; }
  .b-legrows { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); column-gap: 28px; }
  .b-lrow + .b-lrow { box-shadow: none; }
  .b-lrow { box-shadow: inset 0 -1px 0 var(--hair); }
}
</style>
