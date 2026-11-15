<template>
  <div class="shell tl-shell rise" style="--i: 2">
    <div class="core tl-core" data-test="timeline">
      <div class="tl-allday" data-test="tl-allday">
        <span class="tl-lbl">Seharian</span>
        <button v-for="e in pieces.allDay" :key="`${e.id}:${e.occurrence}`" type="button" class="tl-pill" @click="$emit('event', e)">
          {{ e.title }}<small v-if="e.dayCount > 1"> · hari {{ e.dayIndex }}/{{ e.dayCount }}</small>
        </button>
        <span v-if="!pieces.allDay.length" class="tl-none">nggak ada</span>
      </div>
      <div ref="scroller" class="tl-scroll" data-test="tl-scroll">
        <div class="tl-hours" :style="{ height: `${24 * HOUR}px` }">
          <div v-for="(label, h) in HOUR_LABELS" :key="label" class="tl-hour" :style="{ top: `${h * HOUR}px` }"><span>{{ label }}</span></div>
          <button
            v-for="p in pieces.timed"
            :key="`${p.event.id}:${p.event.occurrence}`"
            type="button"
            class="tl-ev"
            :class="{ tiny: p.end - p.start < 45 }"
            data-test="tl-event"
            :style="blockStyle(p)"
            @click="$emit('event', p.event)"
          >
            <b>{{ p.event.title }}</b>
            <small>{{ timeText(p) }}</small>
            <span v-if="p.event.location && p.end - p.start >= 75" class="tl-loc"><PhMapPin :size="12" weight="fill" />{{ p.event.location }}</span>
          </button>
          <div v-if="nowMinute != null" class="tl-now" data-test="now-line" :style="{ top: `${(nowMinute / 60) * HOUR}px` }" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PhMapPin } from '@phosphor-icons/vue'
import { dayPieces, firstScrollMinute, HOUR_LABELS } from '@/lib/agendaTimeline.js'

/** Hari di PC: baris "Seharian" + jam 00–24, acara jadi blok setinggi durasinya. */
const props = defineProps({
  day: { type: Object, required: true },
  /** Tanggal yang dibuka — ganti tanggal = scroll ulang ke acara pertama. */
  date: { type: String, required: true },
  /** Menit sekarang kalau yang dibuka hari ini (garis merah), selain itu null. */
  nowMinute: { type: Number, default: null },
})
defineEmits(['event'])

const HOUR = 64
const pieces = computed(() => dayPieces(props.day.events))
const scroller = ref(null)

function blockStyle(p) {
  const top = (p.start / 60) * HOUR
  const height = Math.max(((p.end - p.start) / 60) * HOUR - 3, 22)
  return {
    top: `${top}px`,
    height: `${height}px`,
    left: `calc(var(--gut) + (100% - var(--gut) - 12px) * ${p.col} / ${p.cols})`,
    width: `calc((100% - var(--gut) - 12px) / ${p.cols} - 4px)`,
  }
}
function timeText(p) {
  const e = p.event
  if (e.dayCount > 1) return e.dayIndex === 1 ? `${e.startTime} → hari ${e.dayIndex}/${e.dayCount}` : `s.d. ${e.endTime} · hari ${e.dayIndex}/${e.dayCount}`
  return `${e.startTime}–${e.endTime}`
}

/*
 * Scroll awal ke 07.00 / sebelum acara pertama. Pas halaman Ionic masih disembunyiin (lagi transisi) browser nolak scroll-nya,
 * jadi kalau belum nyangkut dicoba lagi begitu area jamnya keliatan (ResizeObserver).
 */
const startMinute = computed(() => firstScrollMinute([pieces.value.timed]))
let pending = false
function applyScroll() {
  const el = scroller.value
  if (!pending || !el) return
  // −10px: label jam paling atas jangan kepotong.
  const target = Math.max(0, (startMinute.value / 60) * HOUR - 10)
  el.scrollTop = target
  if (Math.abs(el.scrollTop - target) < 1) pending = false
}
async function scrollToStart() {
  pending = true
  await nextTick()
  applyScroll()
}
let observer = null
onMounted(() => {
  if (typeof ResizeObserver !== 'undefined' && scroller.value) {
    observer = new ResizeObserver(applyScroll)
    observer.observe(scroller.value)
  }
  scrollToStart()
})
onBeforeUnmount(() => observer?.disconnect())
// Ganti tanggal, atau acara hari itu baru kemuat → scroll ulang.
watch([() => props.date, startMinute], scrollToStart)
</script>

<style scoped>
.tl-shell { height: 100%; }
.tl-core { --gut: 64px; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
.tl-allday { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-height: 46px; padding: 8px 14px; box-shadow: inset 0 -1px 0 var(--hair); flex-shrink: 0; }
.tl-lbl { width: calc(var(--gut) - 20px); flex-shrink: 0; font-size: 10.5px; font-weight: 700; color: var(--muted); }
.tl-none { font-size: 12.5px; color: var(--muted); }
.tl-pill { border: 0; padding: 5px 11px; border-radius: 99px; background: color-mix(in srgb, var(--green) 14%, var(--card)); color: var(--text); box-shadow: inset 3px 0 0 var(--green);
  font: 700 12.5px var(--ion-font-family); cursor: pointer; }
.tl-pill small { font-weight: 600; color: var(--muted); }
.tl-scroll { position: relative; flex: 1; min-height: 0; overflow-y: auto; }
.tl-hours { position: relative; }
.tl-hour { position: absolute; left: 0; right: 0; box-shadow: inset 0 1px 0 var(--hair); height: 1px; }
.tl-hour span { position: absolute; left: 12px; top: -8px; padding: 0 4px; background: var(--card); font-size: 11px; font-weight: 600; color: var(--muted); font-variant-numeric: tabular-nums; }
.tl-hour:first-child span { top: 4px; }
.tl-ev { position: absolute; display: flex; flex-direction: column; align-items: flex-start; gap: 1px; padding: 7px 11px; border: 0; border-radius: 13px; overflow: hidden; text-align: left;
  background: color-mix(in srgb, var(--green) 14%, var(--card)); color: var(--text); box-shadow: inset 3px 0 0 var(--green); font-family: var(--ion-font-family); cursor: pointer;
  transition: transform .25s var(--spring); }
.tl-ev b { font-size: 13.5px; font-weight: 700; line-height: 1.2; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tl-ev small { font-size: 11.5px; font-weight: 600; color: var(--muted); }
.tl-ev.tiny { flex-direction: row; align-items: center; gap: 6px; padding-top: 2px; padding-bottom: 2px; }
.tl-loc { display: inline-flex; align-items: center; gap: 4px; margin-top: 3px; font-size: 11.5px; font-weight: 600; color: var(--muted); max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tl-ev:focus-visible { outline: 2px solid var(--ink); outline-offset: 1px; }
.tl-now { position: absolute; left: calc(var(--gut) - 6px); right: 8px; height: 2px; background: var(--red); z-index: 2; pointer-events: none; }
.tl-now::before { content: ''; position: absolute; left: -5px; top: -4px; width: 10px; height: 10px; border-radius: 99px; background: var(--red); }
@media (hover: hover) {
  .tl-ev:hover { transform: translateX(2px); }
}
</style>
