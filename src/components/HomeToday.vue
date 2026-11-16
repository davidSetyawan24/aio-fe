<template>
  <div data-test="today">
    <div class="h-label rise">
      <span>Hari ini</span>
      <a class="h-link" data-test="today-link" @click="ionRouter.push(agendaDayPath(today))">Agenda<PhCaretRight :size="12" weight="bold" /></a>
    </div>
    <div class="shell rise">
      <div class="core h-list">
        <div v-if="empty" class="h-empty">
          <span class="em">☕</span>
          <div>Nggak ada acara atau to-do lagi hari ini<span>Mau nambah? Tinggal buka Agenda.</span></div>
        </div>
        <template v-else>
          <div v-for="e in split.events" :key="`${e.id}:${e.occurrence}`" class="h-ev" data-test="today-event" @click="openEvent(e)">
            <div class="tm" :class="{ long: eventTime(e).main.length > 5 }"><b>{{ eventTime(e).main }}</b><small v-if="eventTime(e).sub">{{ eventTime(e).sub }}</small></div>
            <span class="bar" />
            <div class="grow t"><span class="h-et">{{ e.title }}</span><small v-if="eventSub(e)">{{ eventSub(e) }}</small></div>
            <span v-if="chip && chip.key === `${e.id}:${e.occurrence}`" class="h-chip" data-test="today-chip">{{ chip.text }}</span>
          </div>
          <div v-for="t in split.todos" :key="`t${t.id}:${t.occurrence}`" class="h-td" :class="{ done: isDone(t) }" data-test="today-todo">
            <button class="h-tck" :class="{ done: isDone(t) }" :disabled="isPending(t)" aria-label="Centang" @click="tick(t)">
              <PhCheck :size="14" weight="bold" />
            </button>
            <div class="grow t"><span>{{ t.title }}</span><small v-if="noteLine(t)">{{ noteLine(t) }}</small></div>
          </div>
          <div class="h-hmore" data-test="today-footer" @click="ionRouter.push(agendaDayPath(today))">{{ footerText(split.hiddenEvents, split.hiddenTodos) }}</div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { toastController, useIonRouter } from '@ionic/vue'
import { PhCaretRight, PhCheck } from '@phosphor-icons/vue'
import { agendaDayPath, eventFinished, eventSub, eventTime, footerText, nextChip, splitToday, todayTodoItem } from '@/lib/home.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { useHomeStore } from '@/stores/home.js'

const props = defineProps({
  events: { type: Array, required: true },
  todos: { type: Array, required: true },
  today: { type: String, required: true },
  minutes: { type: Number, required: true },
})
const store = useHomeStore()
const ionRouter = useIonRouter()

const live = computed(() => props.events.filter((e) => !eventFinished(e, props.minutes)))
const split = computed(() => splitToday(live.value, props.todos))
const chip = computed(() => nextChip(live.value, props.minutes))
const empty = computed(() => !live.value.length && !props.todos.length)

const isDone = (row) => store.isDone(todayTodoItem(row))
const isPending = (row) => store.isPending(todayTodoItem(row))
const noteLine = (row) => (row.note ?? '').split('\n')[0].trim()
const openEvent = (e) => ionRouter.push(`${agendaDayPath(props.today)}&acara=${e.id}`)

const toast = async (message) => (await toastController.create({ message, duration: 2000, position: 'top', cssClass: 'aio-toast' })).present()
async function tick(row) {
  try {
    const done = await store.toggle(todayTodoItem(row))
    if (done === null) return
    await toast(done ? `${row.title} beres ✓` : 'Dibatalin')
  } catch (err) {
    await toast(apiErrorMessage(err))
  }
}
</script>

<style scoped>
.h-label { display: flex; justify-content: space-between; align-items: center; min-height: 20px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 24px 8px 10px; }
.h-link { display: inline-flex; align-items: center; gap: 2px; cursor: pointer; letter-spacing: .04em; text-transform: none; font-size: 12px; color: var(--text); }
.h-list { padding: 4px 6px; }
.h-ev { display: flex; align-items: center; gap: 12px; padding: 11px 10px; cursor: pointer; }
.h-ev + .h-ev, .h-ev + .h-td, .h-td + .h-td { box-shadow: inset 0 1px 0 var(--hair); }
.h-ev .tm { width: 60px; flex: none; font-size: 13px; font-weight: 800; font-variant-numeric: tabular-nums; }
.h-ev .tm b { display: block; white-space: nowrap; }
.h-ev .tm.long b { font-size: 12px; }
.h-ev .tm small { display: block; font-size: 11px; color: var(--muted); font-weight: 600; }
.h-ev .bar { width: 4px; align-self: stretch; border-radius: 9px; background: var(--green); flex: none; }
.h-ev .t { font-size: 14.5px; font-weight: 700; min-width: 0; }
.h-ev .t > span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.h-ev .t small, .h-td .t small { display: block; font-size: 12px; color: var(--muted); font-weight: 600; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.h-chip { display: inline-flex; align-items: center; height: 22px; padding: 0 8px; border-radius: 99px; background: rgba(43, 168, 100, .12); color: var(--green); font-size: 11px; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
.h-td { display: flex; align-items: center; gap: 12px; padding: 11px 10px; }
.h-tck { width: 26px; height: 26px; flex-shrink: 0; border-radius: 99px; border: 0; box-shadow: inset 0 0 0 2px var(--muted); background: transparent; display: grid; place-items: center; cursor: pointer; padding: 0; margin: 0 13px; color: #141410; transition: background .25s, box-shadow .25s; }
.h-tck :deep(svg) { opacity: 0; transform: scale(.4); transition: all .3s; }
.h-tck.done { background: var(--lime); box-shadow: none; }
.h-tck.done :deep(svg) { opacity: 1; transform: none; }
.h-tck:disabled { cursor: default; }
.h-td .t { font-size: 14.5px; font-weight: 600; min-width: 0; }
.h-td .t > span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.h-td.done .t > span { opacity: .42; text-decoration: line-through; }
.h-td.done .t small { opacity: .42; }
.h-hmore { display: flex; justify-content: center; padding: 10px; font-size: 13px; font-weight: 700; color: var(--muted); cursor: pointer; box-shadow: inset 0 1px 0 var(--hair); }
.h-empty { display: flex; align-items: center; gap: 14px; padding: 18px 16px; font-size: 15px; font-weight: 800; }
.h-empty .em { font-size: 28px; }
.h-empty span:not(.em) { color: var(--muted); font-weight: 600; font-size: 12.5px; display: block; margin-top: 2px; }
@media (min-width: 1100px) { .h-label { margin-top: 12px; } }
@media (hover: hover) { .h-ev:hover { background: rgba(127, 127, 120, .05); border-radius: 18px; } .h-hmore:hover, .h-link:hover { opacity: .7; } }
</style>
