<template>
  <div class="shell big rise">
    <div class="core bigmonth">
      <div class="mhead">
        <span class="arrows">
          <button type="button" aria-label="Bulan sebelumnya" @click="$emit('shift', -1)"><PhCaretLeft :size="15" /></button>
          <button type="button" aria-label="Bulan berikutnya" @click="$emit('shift', 1)"><PhCaretRight :size="15" /></button>
        </span>
      </div>
      <div class="wk"><span v-for="d in WEEK_ORDER" :key="d">{{ HR[d] }}</span></div>
      <div class="bgrid">
        <button
          v-for="date in cells"
          :key="date"
          type="button"
          class="bcell"
          :class="{ out: date.slice(0, 7) !== month.slice(0, 7), today: date === today }"
          :data-cell="date"
          @click="$emit('go-day', date)"
        >
          <span class="num">{{ Number(date.slice(8)) }}</span>
          <span v-for="(it, i) in items(date).slice(0, 3)" :key="i" class="it" :class="it.kind">{{ it.text }}</span>
          <span v-if="items(date).length > 3" class="more">+{{ items(date).length - 3 }} lagi</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PhCaretLeft, PhCaretRight } from '@phosphor-icons/vue'
import { HR, monthCells, WEEK_ORDER } from '@/lib/agenda.js'
import { useAgendaStore } from '@/stores/agenda.js'

const props = defineProps({ month: { type: String, required: true }, today: { type: String, required: true } })
defineEmits(['go-day', 'shift'])
const store = useAgendaStore()
const cells = computed(() => monthCells(props.month))
/** Acara dulu (jam + judul), Bayar Rutin yang belum lunas, lalu to-do yang belum beres. */
function items(date) {
  const { events, todos, bills } = store.day(date)
  return [
    ...events.map((e) => ({ kind: 'e', text: e.allDay ? e.title : `${e.startTime} ${e.title}` })),
    ...bills.filter((b) => b.status !== 'paid').map((b) => ({ kind: 'b', text: `🔁 ${b.name}` })),
    ...todos.filter((t) => !t.done).map((t) => ({ kind: 't', text: `○ ${t.title}` })),
  ]
}
</script>

<style scoped>
/* Setinggi layar (PC): baris tanggal dibagi rata ke sisa tinggi, minimal 112px. */
.big { margin-top: 18px; flex: 1; display: flex; flex-direction: column; }
.bigmonth { padding: 12px; flex: 1; display: flex; flex-direction: column; }
.mhead { display: flex; justify-content: flex-end; padding: 0 6px 10px; }
.arrows { display: flex; gap: 6px; }
.arrows button { width: 34px; height: 34px; border: 0; border-radius: 99px; background: var(--card); box-shadow: 0 0 0 1px var(--hair); color: var(--text); display: grid; place-items: center; cursor: pointer; }
.wk { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 10.5px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; padding: 4px 0 10px; }
.bgrid { flex: 1; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); grid-auto-rows: minmax(112px, 1fr); gap: 6px; }
.bcell { min-height: 112px; padding: 8px; border: 0; border-radius: 16px; background: var(--app-bg); color: var(--text); text-align: left; cursor: pointer; display: flex; flex-direction: column; gap: 4px;
  font-family: var(--ion-font-family); overflow: hidden; }
.bcell:hover { box-shadow: inset 0 0 0 1.5px var(--hair); }
.bcell.out { opacity: .4; }
.num { font-size: 13px; font-weight: 800; width: 26px; height: 26px; display: grid; place-items: center; border-radius: 99px; }
.today .num { background: var(--ink); color: var(--lime); }
:root.theme-dark .today .num { color: #141410; }
.it { font-size: 11.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 2px 6px; border-radius: 7px; }
.it.e { background: rgba(43, 168, 100, .12); }
.it.t { color: var(--muted); font-weight: 600; padding-left: 4px; }
.it.b { background: rgba(245, 165, 36, .16); color: #C27C00; }
:root.theme-dark .it.b { color: var(--amber); }
.more { font-size: 11px; color: var(--muted); font-weight: 700; padding-left: 4px; }
</style>
