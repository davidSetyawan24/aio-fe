<template>
  <div>
    <div class="u-label rise" style="--i: 5">Rekap harian <small v-if="hasJatah" data-test="over-count">{{ overCount }} hari kelewat jatah</small></div>
    <div class="shell rise" style="--i: 5">
      <div class="core u-chart">
        <div class="cap" data-test="daily-cap">
          <span v-if="picked">{{ dayCaption(picked) }}</span>
          <span v-else>rata-rata <b>{{ rp(avgPerDay) }}</b> / hari</span>
          <span v-if="hasJatah" class="hint">garis = jatah hari itu</span>
        </div>
        <div class="bars" @mouseleave="hover = null">
          <button
            v-for="d in daily" :key="d.date" type="button" class="col" :class="{ over: d.over, today: isToday(d), future: d.future, on: picked?.date === d.date }"
            :aria-label="dayCaption(d)" data-test="bar" @click="tap(d)" @mouseenter="hoverable && (hover = d)">
            <i :style="{ height: d.future ? '3px' : `${(d.total / max) * 100}%` }" />
            <span v-if="d.jatah !== null && !d.future" class="jl" :style="{ bottom: `${(d.jatah / max) * 100}%` }" />
          </button>
        </div>
        <div class="days"><span v-for="(d, i) in daily" :key="d.date">{{ showDay(i) ? i + 1 : '' }}</span></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useMedia } from '@/lib/media.js'
import { dayCaption } from '@/lib/overview.js'
import { rp } from '@/lib/wallet.js'

const props = defineProps({
  daily: { type: Array, required: true },
  avgPerDay: { type: Number, required: true },
  today: { type: String, required: true },
  isCurrent: { type: Boolean, default: false },
})
const hoverable = useMedia('(hover: hover)')
const tapped = ref(null)
const hover = ref(null)
const picked = computed(() => hover.value ?? tapped.value)
watch(() => props.daily, () => {
  tapped.value = null
  hover.value = null
})

const max = computed(() => Math.max(1, ...props.daily.map((d) => Math.max(d.total, d.jatah ?? 0))) * 1.1)
const hasJatah = computed(() => props.daily.some((d) => d.jatah !== null))
const overCount = computed(() => props.daily.filter((d) => d.over).length)
const isToday = (d) => props.isCurrent && d.date === props.today
const tap = (d) => (tapped.value = tapped.value?.date === d.date ? null : d)
const showDay = (i) => [0, 6, 13, 20, 27].includes(i) || i === props.daily.length - 1
</script>

<style scoped>
.u-label { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 24px 8px 10px; }
.u-label small { font-size: 12px; letter-spacing: .02em; text-transform: none; font-weight: 700; color: var(--text); }
.u-chart { padding: 16px 14px 12px; }
.cap { display: flex; justify-content: space-between; gap: 10px; font-size: 12px; color: var(--muted); font-weight: 600; margin-bottom: 10px; min-height: 18px; font-variant-numeric: tabular-nums; }
.cap b { color: var(--text); }
.cap .hint { flex-shrink: 0; }
.bars { position: relative; display: flex; align-items: flex-end; gap: 3px; height: 130px; }
.col { position: relative; flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; height: 100%; padding: 0; border: 0; background: transparent; cursor: pointer; }
.col i { width: 100%; max-width: 22px; border-radius: 6px 6px 3px 3px; background: var(--ink); opacity: .85; min-height: 3px; transition: height .5s var(--spring); }
.col.over i { background: var(--red); opacity: 1; }
.col.today i { background: var(--lime); opacity: 1; }
.col.future i { background: var(--soft); opacity: 1; }
.col.on i { opacity: 1; box-shadow: 0 0 0 2px var(--card), 0 0 0 3.5px var(--muted); }
.jl { position: absolute; left: 50%; transform: translateX(-50%); width: calc(100% + 2px); max-width: 26px; height: 2px; border-radius: 2px; background: var(--muted); opacity: .75; pointer-events: none; }
.days { display: flex; gap: 3px; margin-top: 6px; }
.days span { flex: 1; min-width: 0; display: flex; justify-content: center; white-space: nowrap; font-size: 9.5px; color: var(--muted); font-weight: 700; }
@media (min-width: 1100px) { .bars { height: 190px; } }
</style>
