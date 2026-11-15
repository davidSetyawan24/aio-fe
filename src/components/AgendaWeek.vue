<template>
  <!-- PC: 7 kolom. -->
  <div v-if="wide" class="wgrid">
    <div v-for="(date, i) in dates" :key="date" class="wcol rise" :class="{ today: date === today }" :style="{ '--i': i }" data-test="wcol">
      <button type="button" class="wcol-h" :data-goday="date" @click="$emit('go-day', date)"><small>{{ HR[weekdayOf(date)] }}</small><b>{{ Number(date.slice(8)) }}</b></button>
      <div v-for="e in store.day(date).events" :key="`${e.id}:${e.occurrence}`" class="wev" role="button" tabindex="0" @click="$emit('event', e)">
        <small>{{ e.allDay ? 'Seharian' : `${e.startTime}–${e.endTime}` }}</small>{{ e.title }}
      </div>
      <div v-for="t in store.day(date).todos" :key="`${t.id}:${t.occurrence}`" class="wtd" :class="{ ok: t.done }">
        <span class="cir" /><span>{{ t.title }}<b v-if="t.late" class="late"> · telat</b></span>
      </div>
    </div>
  </div>
  <!-- HP: kartu per hari. -->
  <div v-else>
    <div v-for="(date, i) in dates" :key="date" class="shell wday rise" :class="{ today: date === today }" :style="{ '--i': i }" data-test="wday">
      <div class="core">
        <button type="button" class="wday-h" :data-goday="date" @click="$emit('go-day', date)">
          <span class="d"><small>{{ HR[weekdayOf(date)] }}</small><b>{{ Number(date.slice(8)) }}</b></span>
          <span class="s"><b>{{ relLabel(date, today) }}</b>{{ summary(date) }}</span>
          <PhCaretRight :size="16" class="go" />
        </button>
        <div v-if="store.day(date).events.length || store.day(date).todos.length" class="mini">
          <div v-for="e in store.day(date).events" :key="`${e.id}:${e.occurrence}`"><span class="tm">{{ e.allDay ? '—' : e.startTime }}</span><span class="bul" /><span class="txt">{{ e.title }}</span></div>
          <div v-for="t in store.day(date).todos" :key="`${t.id}:${t.occurrence}`">
            <span class="tm" /><span class="cir" :class="{ ok: t.done }" /><span class="txt" :class="{ x: t.done }">{{ t.title }}{{ t.late ? ' · telat' : '' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { PhCaretRight } from '@phosphor-icons/vue'
import { HR, relLabel, weekdayOf } from '@/lib/agenda.js'
import { useAgendaStore } from '@/stores/agenda.js'

defineProps({
  dates: { type: Array, required: true },
  today: { type: String, required: true },
  wide: { type: Boolean, default: false },
})
defineEmits(['go-day', 'event'])
const store = useAgendaStore()
function summary(date) {
  const { events, todos } = store.day(date)
  return events.length || todos.length ? `${events.length} acara · ${todos.length} to-do` : 'kosong'
}
</script>

<style scoped>
.wday { margin-top: 10px; }
.wday .core { padding: 0; }
.wday-h { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 14px 8px; border: 0; background: transparent; color: var(--text); font-family: var(--ion-font-family); text-align: left; cursor: pointer; }
.wday-h .d { width: 40px; height: 40px; border-radius: 14px; background: var(--soft); display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; }
.wday-h .d small { font-size: 9.5px; font-weight: 700; color: var(--muted); text-transform: uppercase; line-height: 1; }
.wday-h .d b { font-size: 16px; font-weight: 800; line-height: 1.15; }
.today .wday-h .d { background: var(--ink); }
.today .wday-h .d small { color: var(--on-ink); opacity: .55; }
.today .wday-h .d b { color: var(--lime); }
:root.theme-dark .today .wday-h .d b { color: #141410; }
.wday-h .s { flex: 1; min-width: 0; font-size: 12.5px; color: var(--muted); font-weight: 600; }
.wday-h .s b { display: block; color: var(--text); font-size: 14.5px; }
.go { color: var(--muted); }
.mini { padding: 0 14px 12px 64px; display: flex; flex-direction: column; gap: 7px; }
.mini > div { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; min-width: 0; }
.mini .txt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mini .tm { font-size: 12px; color: var(--muted); font-weight: 700; width: 38px; flex-shrink: 0; font-variant-numeric: tabular-nums; }
.bul { width: 8px; height: 8px; border-radius: 9px; background: var(--green); flex-shrink: 0; }
.cir { width: 13px; height: 13px; border-radius: 99px; box-shadow: inset 0 0 0 1.5px var(--muted); flex-shrink: 0; }
.cir.ok, .ok .cir { background: var(--lime); box-shadow: none; }
.x { text-decoration: line-through; opacity: .45; }

.wgrid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 10px; margin-top: 18px; }
.wcol { background: var(--card); border-radius: 22px; box-shadow: 0 0 0 1px var(--hair); padding: 10px 8px; min-height: 340px; display: flex; flex-direction: column; gap: 6px; }
.wcol.today { box-shadow: 0 0 0 2px var(--ink); }
.wcol-h { display: flex; align-items: baseline; gap: 6px; padding: 2px 6px 6px; border: 0; background: transparent; color: var(--text); font-family: var(--ion-font-family); cursor: pointer; text-align: left; }
.wcol-h small { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
.wcol-h b { font-size: 22px; font-weight: 800; }
.wcol.today .wcol-h b { color: var(--green); }
.wev { padding: 7px 9px; border-radius: 12px; background: rgba(43, 168, 100, .1); box-shadow: inset 3px 0 0 var(--green); font-size: 12.5px; font-weight: 700; cursor: pointer; overflow-wrap: anywhere; }
.wev small { display: block; font-size: 11px; color: var(--muted); font-weight: 700; }
.wtd { display: flex; align-items: flex-start; gap: 7px; padding: 4px 6px; font-size: 12.5px; font-weight: 600; overflow-wrap: anywhere; }
.wtd .cir { width: 14px; height: 14px; margin-top: 1px; }
.wtd.ok span:last-child { text-decoration: line-through; opacity: .45; }
.late { color: var(--red); }
</style>
