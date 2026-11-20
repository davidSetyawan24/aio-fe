<template>
  <div>
    <div class="b-label rise" :style="{ '--i': i }"><span>Tidur terakhir</span><small v-if="sleep" data-test="sleep-card-when">{{ isToday ? 'semalem' : dDay(sleep.sleptOn) }}</small></div>
    <div class="shell rise" :style="{ '--i': i }">
      <div v-if="!sleep" class="b-core bs-empty" data-test="sleep-card-empty"><PhMoon :size="16" />Belum ada data tidur</div>
      <div v-else class="core bs-card bs-tap" role="button" tabindex="0" data-test="sleep-card" @click="open" @keydown.enter.prevent="open">
        <div class="bs-top">
          <div>
            <div class="bs-when" data-test="sleep-card-clock">{{ isToday ? 'Semalem' : dDay(sleep.sleptOn) }}<template v-if="clock"> · {{ clock }}</template></div>
            <div class="bs-tot" data-test="sleep-card-total">{{ Math.floor(sleep.totalMin / 60) }}<small>j</small>{{ sleep.totalMin % 60 }}<small>m</small></div>
          </div>
          <div class="bs-score" data-test="sleep-card-score"><b>{{ sleep.score ?? '–' }}</b><small>skor</small></div>
        </div>
        <div v-if="hasStages" class="bs-stack">
          <i v-for="s in STAGES" :key="s.k" :class="s.cls" :style="{ flex: sleep[s.k] ?? 0 }" />
        </div>
        <div class="bs-legend">
          <div v-for="s in STAGES" :key="s.k"><i :class="s.cls" />{{ s.label }}<b>{{ sleep[s.k] != null ? durL(sleep[s.k]) : '–' }}<small v-if="sleep[s.k] != null">{{ Math.round((sleep[s.k] / sleep.totalMin) * 100) }}%</small></b></div>
        </div>
        <div class="bs-s3">
          <div v-for="o in OTHERS" :key="o.k"><div class="k">{{ o.label }}</div><div class="v">{{ sleep[o.k] ?? '–' }}<small v-if="sleep[o.k] != null">{{ o.unit }}</small></div></div>
        </div>
        <div v-if="summary" class="bs-avg" data-test="sleep-card-avg">Rata-rata 7 hari <b>{{ durL(summary.avg7Min) }}</b> (dari {{ summary.nights }} malam)</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PhMoon } from '@phosphor-icons/vue'
import { durL } from '@/lib/badanSleep.js'
import { dDay, jam } from '@/lib/badanView.js'
import './badan.css'

/** Kartu "Tidur terakhir" di halaman Badan. Kosong = teks pudar aja (tidur opsional, nggak ada teguran). Tap → detail tidur. */
const props = defineProps({
  /** Tidur terakhir (`store.lastSleep`) atau null. */
  sleep: { type: Object, default: null },
  /** `sleepSummary(...)` (`store.sleepSum`) atau null. */
  summary: { type: Object, default: null },
  today: { type: String, required: true },
  /** Urutan animasi masuk. */
  i: { type: Number, default: 4 },
})
const emit = defineEmits(['open'])

const STAGES = [
  { k: 'deepMin', label: 'Dalam', cls: 'bs-deep' },
  { k: 'lightMin', label: 'Ringan', cls: 'bs-light' },
  { k: 'remMin', label: 'REM', cls: 'bs-rem' },
]
const OTHERS = [{ k: 'awakeCount', label: 'Kebangun', unit: '×' }, { k: 'avgHr', label: 'HR rata-rata', unit: 'bpm' }, { k: 'avgHrv', label: 'HRV rata-rata', unit: 'ms' }]

const isToday = computed(() => props.sleep?.sleptOn === props.today)
const clock = computed(() => (props.sleep?.bedAt && props.sleep?.wakeAt ? `${jam(props.sleep.bedAt)} → ${jam(props.sleep.wakeAt)}` : ''))
const hasStages = computed(() => STAGES.some((s) => props.sleep?.[s.k] > 0))
const open = () => emit('open', props.sleep.id)
</script>
