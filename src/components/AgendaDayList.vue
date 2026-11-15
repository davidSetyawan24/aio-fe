<template>
  <div class="daycols">
    <div>
      <div class="lbl rise" style="--i: 1">Acara <small>{{ day.events.length || '' }}</small></div>
      <div class="shell rise" style="--i: 2">
        <div class="core list">
          <div v-for="e in day.events" :key="`${e.id}:${e.occurrence}`" class="ev" data-test="event" role="button" tabindex="0" @click="$emit('event', e)" @keydown.enter="$emit('event', e)">
            <div v-if="e.allDay" class="time allday"><b>Seharian</b><span v-if="e.dayCount > 1">hari {{ e.dayIndex }}/{{ e.dayCount }}</span></div>
            <div v-else-if="e.dayCount > 1" class="time">
              <b>{{ e.dayIndex === 1 ? e.startTime : e.dayIndex === e.dayCount ? `s.d. ${e.endTime}` : 'Seharian' }}</b><span>hari {{ e.dayIndex }}/{{ e.dayCount }}</span>
            </div>
            <div v-else class="time"><b>{{ e.startTime }}</b><span>{{ e.endTime }}</span></div>
            <div class="bar" />
            <div class="grow">
              <div class="et">{{ e.title }}</div>
              <div v-if="e.reminders.length || repeatLabel(e.repeat)" class="meta">
                <span v-if="e.reminders.length"><PhBell :size="13" /> {{ e.reminders.length }}</span>
                <span v-if="repeatLabel(e.repeat)"><PhRepeat :size="13" /> {{ repeatLabel(e.repeat) }}</span>
              </div>
              <a v-if="e.location" class="loc" :href="mapsUrl(e.location)" target="_blank" rel="noopener" @click.stop>
                <PhMapPin :size="14" weight="fill" class="pin" /><span>{{ e.location }}</span><PhArrowUpRight :size="13" class="go" />
              </a>
            </div>
          </div>
          <div v-if="!day.events.length" class="empty">Nggak ada acara. Bebas 🙌</div>
        </div>
      </div>
    </div>
    <div>
      <div class="lbl rise" style="--i: 3">To-do <small>{{ day.todos.length ? `${doneCount}/${day.todos.length} beres` : '' }}</small></div>
      <div class="shell rise" style="--i: 4">
        <div class="core list">
          <AgendaTodoRow v-for="t in day.todos" :key="`${t.id}:${t.occurrence}`" :row="t" @edit="$emit('edit-todo', $event)" @error="$emit('error', $event)" />
          <div v-if="!day.todos.length" class="empty">Belum ada to-do.</div>
        </div>
      </div>
      <button v-if="drawer" type="button" class="drawer rise" style="--i: 5" data-test="drawer" @click="$emit('drawer')">
        <span class="ic">📥</span>
        <span class="grow"><b>Kapan-kapan</b><span>To-do yang belum ada tanggalnya</span></span>
        <span class="n">{{ undatedCount }}</span>
        <PhCaretRight :size="16" class="go" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PhArrowUpRight, PhBell, PhCaretRight, PhMapPin, PhRepeat } from '@phosphor-icons/vue'
import AgendaTodoRow from '@/components/AgendaTodoRow.vue'
import { mapsUrl, repeatLabel } from '@/lib/agenda.js'

const props = defineProps({
  day: { type: Object, required: true },
  /** Laci Kapan-kapan di bawah to-do (HP, cuma hari ini). */
  drawer: { type: Boolean, default: false },
  undatedCount: { type: Number, default: 0 },
})
defineEmits(['event', 'edit-todo', 'drawer', 'error'])
const doneCount = computed(() => props.day.todos.filter((t) => t.done).length)
</script>

<style scoped>
.lbl { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 24px 8px 10px; }
.lbl small { font-size: 12px; letter-spacing: .02em; text-transform: none; font-weight: 600; }
.list { padding: 4px 6px; }
.empty { padding: 18px 14px; color: var(--muted); font-size: 13.5px; text-align: center; }
.ev { display: flex; gap: 12px; padding: 13px 10px; align-items: stretch; cursor: pointer; border-radius: 18px; }
.ev + .ev { box-shadow: inset 0 1px 0 var(--hair); border-radius: 0; }
.ev:active { background: var(--soft); }
.time { width: 50px; flex-shrink: 0; font-variant-numeric: tabular-nums; }
.time b { display: block; font-size: 14px; font-weight: 800; }
.time span { display: block; font-size: 12px; color: var(--muted); margin-top: 2px; font-weight: 600; }
.time.allday b { font-size: 12px; }
.time b { white-space: nowrap; }
.bar { width: 4px; border-radius: 9px; background: var(--green); flex-shrink: 0; }
.grow { flex: 1; min-width: 0; }
.et { font-size: 15px; font-weight: 700; }
.meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; font-size: 12px; color: var(--muted); font-weight: 600; }
.meta svg { vertical-align: -2px; }
.loc { display: inline-flex; align-items: center; gap: 5px; margin-top: 7px; padding: 5px 10px 5px 8px; border-radius: 99px; background: var(--soft); color: var(--text); font-size: 12.5px;
  font-weight: 600; max-width: 100%; text-decoration: none; }
.loc span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.loc svg { flex-shrink: 0; }
.loc .pin { color: var(--red); }
.loc .go, .drawer .go { color: var(--muted); }
.drawer { display: flex; align-items: center; gap: 12px; width: 100%; margin-top: 12px; padding: 12px 16px 12px 12px; border: 1.5px dashed var(--muted); border-radius: 22px;
  background: transparent; color: var(--text); font: inherit; text-align: left; cursor: pointer; opacity: .92; }
.drawer .ic { width: 42px; height: 42px; border-radius: 14px; display: grid; place-items: center; background: #FFF3B8; font-size: 20px; flex-shrink: 0; }
.drawer b { display: block; font-size: 15px; }
.drawer .grow span { display: block; font-size: 12.5px; color: var(--muted); margin-top: 2px; }
.drawer .n { min-width: 26px; height: 26px; padding: 0 8px; border-radius: 99px; background: var(--ink); color: var(--on-ink); display: grid; place-items: center; font-size: 12.5px; font-weight: 800; }
/* Layar lebar: Acara & To-do jejer. */
@media (min-width: 1100px) {
  .daycols { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 0 20px; }
  .daycols .lbl { margin-top: 0; }
}
</style>
