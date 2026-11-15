<template>
  <div class="shell">
    <div class="core month" :class="{ compact }" data-test="calendar">
      <div class="mhead">
        <b>{{ monthName(month) }} {{ month.slice(0, 4) }}</b>
        <span class="arrows">
          <button type="button" aria-label="Bulan sebelumnya" @click="$emit('shift', -1)"><PhCaretLeft :size="15" /></button>
          <button type="button" aria-label="Bulan berikutnya" @click="$emit('shift', 1)"><PhCaretRight :size="15" /></button>
        </span>
      </div>
      <div class="wk"><span v-for="d in WEEK_ORDER" :key="d">{{ HR[d] }}</span></div>
      <div class="grid">
        <button
          v-for="date in cells"
          :key="date"
          type="button"
          class="cell"
          :class="{ out: date.slice(0, 7) !== month.slice(0, 7), today: date === today, on: date === selected }"
          :data-day="date"
          @click="$emit('pick', date)"
        >
          <b>{{ Number(date.slice(8)) }}</b>
          <span class="dots"><i v-if="store.day(date).events.length" /><i v-if="store.day(date).todos.some((t) => !t.done)" class="tdot" /></span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PhCaretLeft, PhCaretRight } from '@phosphor-icons/vue'
import { HR, monthCells, monthName, WEEK_ORDER } from '@/lib/agenda.js'
import { useAgendaStore } from '@/stores/agenda.js'

const props = defineProps({
  /** 'YYYY-MM-01' */
  month: { type: String, required: true },
  selected: { type: String, default: '' },
  today: { type: String, default: '' },
  /** Kolom kiri PC: lebih kecil. */
  compact: { type: Boolean, default: false },
})
defineEmits(['pick', 'shift'])
const store = useAgendaStore()
const cells = computed(() => monthCells(props.month))
</script>

<style scoped>
.month { padding: 14px 10px 10px; }
.mhead { display: flex; align-items: center; justify-content: space-between; padding: 0 6px 10px; }
.mhead b { font-size: 16px; font-weight: 800; }
.arrows { display: flex; gap: 6px; }
.arrows button { width: 34px; height: 34px; border: 0; border-radius: 99px; background: var(--card); box-shadow: 0 0 0 1px var(--hair); color: var(--text); display: grid; place-items: center; cursor: pointer; }
.wk { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 10.5px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; padding-bottom: 6px; }
.grid { display: grid; grid-template-columns: repeat(7, 1fr); row-gap: 2px; }
.cell { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 5px 0 6px; border: 0; background: transparent; color: var(--text); font-family: var(--ion-font-family); cursor: pointer; }
.cell b { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 99px; font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; }
.compact .cell b { width: 32px; height: 32px; font-size: 13.5px; }
.cell.out b { color: var(--muted); opacity: .45; }
.cell.today b { color: var(--green); font-weight: 800; }
.cell.on b { background: var(--ink); color: var(--lime); }
:root.theme-dark .cell.on b { color: #141410; }
.dots { display: flex; gap: 3px; height: 5px; }
.dots i { width: 5px; height: 5px; border-radius: 9px; background: var(--green); }
.dots i.tdot { background: var(--muted); }
</style>
