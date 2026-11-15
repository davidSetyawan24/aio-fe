<template>
  <!-- PC: grid jam 7 kolom (baris atas: acara seharian + to-do). -->
  <div v-if="wide" class="shell wk-shell rise" style="--i: 2">
    <div class="core wk-core" data-test="week-grid">
      <div class="wk-row wk-head">
        <div />
        <div v-for="date in dates" :key="date" class="wk-hcell" :class="{ today: date === today }">
          <button type="button" class="wcol-h" data-test="wcol-h" :data-goday="date" @click="$emit('go-day', date)"><small>{{ HR[weekdayOf(date)] }}</small><b>{{ Number(date.slice(8)) }}</b></button>
        </div>
      </div>
      <div class="wk-row wk-tops">
        <div class="wk-tlbl">Seharian</div>
        <div v-for="date in dates" :key="date" class="wk-tcell" :class="{ today: date === today }" data-test="wk-allday">
          <button v-for="e in pieces[date].allDay" :key="`${e.id}:${e.occurrence}`" type="button" class="wk-pill" @click="$emit('event', e)">{{ e.title }}</button>
          <div v-for="t in store.day(date).todos" :key="`${t.id}:${t.occurrence}`" class="wtd" :class="{ ok: t.done, late: t.late }">
            <span class="cir" /><span>{{ t.title }}</span>
          </div>
        </div>
      </div>
      <div ref="scroller" class="wk-scroll" data-test="wk-scroll">
        <div class="wk-row wk-body" :style="{ height: `${24 * HOUR}px` }">
          <div class="wk-hours">
            <div v-for="(label, h) in HOUR_LABELS" :key="label" class="wk-hour" :style="{ top: `${h * HOUR}px` }"><span>{{ label }}</span></div>
          </div>
          <div v-for="date in dates" :key="date" class="wcol" :class="{ today: date === today }" data-test="wcol">
            <button
              v-for="p in pieces[date].timed"
              :key="`${p.event.id}:${p.event.occurrence}`"
              type="button"
              class="wk-ev"
              :class="{ tiny: p.end - p.start < 50 }"
              data-test="wk-event"
              :title="`${p.event.title} · ${p.event.allDay ? 'Seharian' : `${p.event.startTime}–${p.event.endTime}`}`"
              :style="blockStyle(p)"
              @click="$emit('event', p.event)"
            >
              <b>{{ p.event.title }}</b><small>{{ p.event.dayCount > 1 && p.event.dayIndex > 1 ? `s.d. ${p.event.endTime}` : p.event.startTime }}</small>
            </button>
            <div v-if="date === today && nowMinute != null" class="wk-now" data-test="now-line" :style="{ top: `${(nowMinute / 60) * HOUR}px` }" />
          </div>
        </div>
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
import { computed, ref } from 'vue'
import { PhCaretRight } from '@phosphor-icons/vue'
import { HR, relLabel, weekdayOf } from '@/lib/agenda.js'
import { dayPieces, firstScrollMinute, HOUR_LABELS, MIN_MINUTES } from '@/lib/agendaTimeline.js'
import { useStartScroll } from '@/lib/useStartScroll.js'
import { useAgendaStore } from '@/stores/agenda.js'

const props = defineProps({
  dates: { type: Array, required: true },
  today: { type: String, required: true },
  wide: { type: Boolean, default: false },
  /** Menit sekarang (garis merah di kolom hari ini). */
  nowMinute: { type: Number, default: null },
})
defineEmits(['go-day', 'event'])
const store = useAgendaStore()

/* ---- PC: grid jam ---- */
const HOUR = 52
const pieces = computed(() => Object.fromEntries(props.dates.map((d) => [d, dayPieces(store.day(d).events)])))
const scroller = ref(null)
const startMinute = computed(() => firstScrollMinute(props.dates.map((d) => pieces.value[d].timed)))
// Cuma kepake kalau lebar (scroller-nya cuma ada di grid PC). Diulang tiap ganti minggu.
useStartScroll(scroller, startMinute, HOUR, [() => props.dates[0]])
function blockStyle(p) {
  return {
    top: `${(p.start / 60) * HOUR}px`,
    height: `${(Math.max(p.end - p.start, MIN_MINUTES) / 60) * HOUR - 3}px`,
    left: `calc(3px + (100% - 6px) * ${p.col} / ${p.cols})`,
    width: `calc((100% - 6px) / ${p.cols} - 3px)`,
  }
}
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

.wtd { display: flex; align-items: flex-start; gap: 6px; padding: 2px 4px; font-size: 11.5px; font-weight: 600; overflow-wrap: anywhere; line-height: 1.3; }
.wtd .cir { width: 12px; height: 12px; margin-top: 1px; }
.wtd.ok span:last-child { text-decoration: line-through; opacity: .45; }
.wtd.late { color: var(--red); }
.wtd.late .cir { box-shadow: inset 0 0 0 1.5px var(--red); }

/* PC: grid jam (ikut mockup agenda-pc.html "Minggu · grid jam") */
.wk-shell { flex: 1; min-height: 520px; margin-top: 6px; }
.wk-core { height: 100%; display: flex; flex-direction: column; overflow: hidden; }
.wk-row { display: grid; grid-template-columns: 56px repeat(7, minmax(0, 1fr)); }
.wk-head { box-shadow: inset 0 -1px 0 var(--hair); flex-shrink: 0; }
.wk-hcell { padding: 8px 6px 6px; }
.wcol-h { display: flex; align-items: center; gap: 6px; padding: 4px 6px; border: 0; border-radius: 12px; background: transparent; color: var(--text); font-family: var(--ion-font-family); cursor: pointer; }
.wcol-h small { font-size: 10.5px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }
.wcol-h b { font-size: 20px; font-weight: 800; letter-spacing: -0.03em; }
.wk-hcell.today .wcol-h b { display: inline-grid; place-items: center; min-width: 32px; height: 32px; padding: 0 6px; border-radius: 99px; background: var(--ink); color: var(--lime); font-size: 16px; }
:root.theme-dark .wk-hcell.today .wcol-h b { background: var(--lime); color: #141410; }
.wk-tops { box-shadow: inset 0 -1px 0 var(--hair); flex-shrink: 0; max-height: 132px; overflow-y: auto; }
.wk-tlbl { padding: 10px 0 0 10px; font-size: 10px; font-weight: 700; color: var(--muted); }
.wk-tcell { display: flex; flex-direction: column; gap: 3px; padding: 6px 4px; min-height: 36px; min-width: 0; box-shadow: inset 1px 0 0 var(--hair); }
.wk-pill { border: 0; padding: 3px 7px; border-radius: 8px; text-align: left; background: color-mix(in srgb, var(--green) 14%, var(--card)); color: var(--text); box-shadow: inset 3px 0 0 var(--green);
  font: 700 11.5px var(--ion-font-family); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }
.wk-scroll { flex: 1; min-height: 0; overflow-y: auto; }
.wk-body { position: relative; }
.wk-hours { position: relative; }
.wk-hour { position: absolute; left: 0; right: 0; height: 1px; }
.wk-hour span { position: absolute; left: 8px; top: -7px; font-size: 10.5px; font-weight: 600; color: var(--muted); font-variant-numeric: tabular-nums; }
.wk-hour:first-child span { top: 3px; }
.wcol { position: relative; box-shadow: inset 1px 0 0 var(--hair); background: repeating-linear-gradient(to bottom, var(--hair) 0 1px, transparent 1px 52px); }
.wcol.today, .wk-tcell.today { background-color: color-mix(in srgb, var(--lime) 5%, transparent); }
.wk-ev { position: absolute; display: flex; flex-direction: column; align-items: flex-start; padding: 4px 7px; border: 0; border-radius: 9px; overflow: hidden; text-align: left;
  background: color-mix(in srgb, var(--green) 14%, var(--card)); color: var(--text); box-shadow: inset 3px 0 0 var(--green); font-family: var(--ion-font-family); cursor: pointer; }
.wk-ev b { font-size: 12px; font-weight: 700; line-height: 1.25; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wk-ev small { font-size: 10.5px; font-weight: 600; color: var(--muted); }
.wk-ev.tiny { justify-content: center; padding-top: 1px; padding-bottom: 1px; }
/* Blok mini: jamnya disembunyiin biar judul dapet tempat (jam lengkap di tooltip & detail). */
.wk-ev.tiny small { display: none; }
.wk-ev:focus-visible, .wk-pill:focus-visible, .wcol-h:focus-visible { outline: 2px solid var(--ink); outline-offset: 1px; }
.wk-now { position: absolute; left: 0; right: 0; height: 2px; background: var(--red); z-index: 2; pointer-events: none; }
.wk-now::before { content: ''; position: absolute; left: -4px; top: -4px; width: 10px; height: 10px; border-radius: 99px; background: var(--red); }
@media (hover: hover) {
  .wcol-h:hover { background: var(--soft); }
}
</style>
