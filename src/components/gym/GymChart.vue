<template>
  <div v-if="shape" class="gy-cwrap" data-test="chart">
    <svg :viewBox="`0 0 ${shape.W} ${shape.H}`" aria-hidden="true">
      <template v-for="g in shape.grid" :key="g.v">
        <line class="grid" :x1="shape.L" :x2="shape.W - shape.R + 10" :y1="g.y" :y2="g.y" />
        <text class="ax" :x="shape.L - 6" :y="g.y + 3.5" text-anchor="end">{{ kgText(g.v) }}</text>
      </template>
      <text v-for="a in shape.axis" :key="a.i" class="ax" :x="a.x" :y="shape.H - 6" :text-anchor="a.anchor">{{ a.text }}</text>
      <path class="area" :d="shape.area" />
      <path class="ln" :d="shape.line" />
      <circle v-for="p in shape.pts" :key="p.i" class="pt" :class="{ last: p.last }" :cx="p.x" :cy="p.y" :r="mini ? 3.5 : 5" />
      <text v-for="p in shape.labels" :key="`l${p.i}`" class="lbl" :class="{ dim: !p.last }" :x="p.x" :y="p.y - 11" :text-anchor="p.anchor">{{ p.text }}</text>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { dShort } from '@/lib/badanView.js'
import { kgText } from '@/lib/gym.js'
import './gym.css'

/**
 * Garis per sesi (`Point[]`): `mode` 'kg' = beban terberat (label `22,5×10`), 'orm' = 1RM (label angka).
 * `mini` = ringkas buat kartu di halaman Gym (cuma titik terakhir yang dilabelin). `wide` = kanvas lebar buat PC.
 */
const props = defineProps({
  points: { type: Array, required: true },
  mode: { type: String, default: 'kg' },
  mini: { type: Boolean, default: false },
  wide: { type: Boolean, default: false },
})

const orm = computed(() => props.mode === 'orm')
const val = (p) => (orm.value ? Number(p.e1rm) : Number(p.best[0]))
const label = (p) => (orm.value ? kgText(p.e1rm) : `${kgText(p.best[0])}×${p.best[1]}`)
const shape = computed(() => {
  const pts = props.points
  if (!pts.length) return null
  const mini = props.mini
  const W = mini || !props.wide ? 340 : 760, H = mini ? 120 : props.wide ? 300 : 220
  const L = mini ? 6 : 30, R = 34, T = mini ? 22 : 30, B = mini ? 8 : 26
  const vals = pts.map(val)
  let lo = Math.min(...vals), hi = Math.max(...vals)
  if (hi - lo < 2.5) { lo -= 2.5; hi += 2.5 } else { const pad = (hi - lo) * 0.2; lo -= pad; hi += pad }
  const x = (i) => L + (pts.length === 1 ? (W - L - R) / 2 : (i / (pts.length - 1)) * (W - L - R))
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B)
  const anchor = (i) => (i === 0 && pts.length > 1 ? 'start' : i === pts.length - 1 ? 'end' : 'middle')
  const xy = pts.map((p, i) => ({ i, x: +x(i).toFixed(1), y: +y(val(p)).toFixed(1), last: i === pts.length - 1 }))
  const line = xy.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join('')
  const area = `${line}L${xy[xy.length - 1].x},${H - B}L${xy[0].x},${H - B}Z`
  const labels = xy
    .filter((p) => {
      if (mini) return p.last
      // titik kedua dari akhir disembunyiin di HP biar nggak numpuk sama label terakhir
      if (p.i === pts.length - 2 && pts.length > 2 && !props.wide) return false
      return p.i === 0 || p.last || label(pts[p.i]) !== label(pts[p.i - 1])
    })
    .map((p) => ({ ...p, text: label(pts[p.i]), anchor: anchor(p.i) }))
  const grid = []
  const axis = []
  if (!mini) {
    const step = hi - lo > 20 ? 10 : hi - lo > 8 ? 5 : 2.5
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) grid.push({ v, y: +y(v).toFixed(1) })
    for (const i of new Set([0, Math.floor((pts.length - 1) / 2), pts.length - 1])) axis.push({ i, x: xy[i].x, anchor: anchor(i), text: dShort(pts[i].on) })
  }
  return { W, H, L, R, pts: xy, line, area, labels, grid, axis }
})
</script>
