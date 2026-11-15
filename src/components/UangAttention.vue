<template>
  <div data-test="attention">
    <div class="u-label rise" style="--i: 3">Perlu diurus <small v-if="left" data-test="attention-count">{{ left }}</small></div>
    <div class="shell rise" style="--i: 3">
      <div class="core u-list">
        <div v-if="!items.length" class="u-allok">
          <span class="big">👌</span>
          <div>Semua aman<span>Nggak ada yang telat atau mau jatuh tempo. Budget masih aman.</span></div>
        </div>
        <div v-for="item in items" :key="attentionKey(item)" class="u-todo" :class="{ tap: item.kind === 'budget' }" data-test="todo" @click="item.kind === 'budget' && openBudget()">
          <span class="ic" :style="{ background: look(item).tint }">{{ look(item).emoji }}</span>
          <div class="grow t">{{ text(item).title }}<small :class="text(item).tone">{{ text(item).sub }}</small></div>
          <button v-if="item.kind !== 'budget'" class="mini-ck" :class="{ done: store.isDone(item) }" :disabled="store.isPending(item)" @click.stop="tick(item)">
            <span class="c" />{{ label(item) }}
          </button>
          <PhCaretRight v-else :size="16" class="go" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { toastController, useIonRouter } from '@ionic/vue'
import { PhCaretRight } from '@phosphor-icons/vue'
import { attentionKey, attentionText } from '@/lib/overview.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { useOverviewStore } from '@/stores/overview.js'

const props = defineProps({
  items: { type: Array, required: true },
  /** Sisa hari bulan ini (buat teks budget "buat N hari"). */
  daysLeft: { type: Number, default: 0 },
})
const store = useOverviewStore()
const ionRouter = useIonRouter()

const left = computed(() => props.items.filter((i) => !store.isDone(i)).length)
const text = (item) => attentionText(item, props.daysLeft)
const look = (item) => (item.kind === 'card' ? { emoji: '💳', tint: '#DCEBFF' } : { emoji: item.emoji, tint: item.tint })
const label = (item) => {
  const done = store.isDone(item)
  if (item.kind === 'bill') return done ? 'Lunas' : 'Lunas?'
  return done ? 'Udah dibayar' : 'Udah bayar?'
}
const openBudget = () => ionRouter.push('/tabs/menu/budget')

const toast = async (message) => (await toastController.create({ message, duration: 2000, position: 'top', cssClass: 'aio-toast' })).present()
async function tick(item) {
  try {
    const done = item.kind === 'bill' ? await store.toggleBill(item) : await store.toggleCard(item)
    if (done === null) return
    if (item.kind === 'bill') await toast(done ? `${item.name} lunas ✓` : `${item.name} batal lunas`)
    else await toast(done ? `${item.name} udah dibayar ✓` : `${item.name} batal dibayar`)
  } catch (err) {
    await toast(apiErrorMessage(err))
  }
}
</script>

<style scoped>
.u-label { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 24px 8px 10px; }
.u-label small { font-size: 12px; letter-spacing: .02em; text-transform: none; font-weight: 700; color: var(--text); }
.u-list { padding: 4px 6px; }
.u-todo { display: flex; align-items: center; gap: 12px; padding: 11px 10px; }
.u-todo + .u-todo { box-shadow: inset 0 1px 0 var(--hair); }
.u-todo.tap { cursor: pointer; }
.u-todo .ic { width: 38px; height: 38px; border-radius: 13px; display: grid; place-items: center; font-size: 18px; flex-shrink: 0; }
.u-todo .t { font-size: 14.5px; font-weight: 700; }
.u-todo .t small { display: block; font-size: 12px; color: var(--muted); font-weight: 600; margin-top: 2px; }
.u-todo .t small.red { color: var(--red); }
.u-todo .t small.amber { color: #C27C00; }
:root.theme-dark .u-todo .t small.amber { color: var(--amber); }
.mini-ck { height: 34px; padding: 0 12px; border: 0; border-radius: 99px; background: var(--soft); color: var(--text); font: 700 12.5px var(--ion-font-family); cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; white-space: nowrap; }
.mini-ck:disabled { opacity: .7; cursor: default; }
.mini-ck .c { width: 16px; height: 16px; border-radius: 99px; box-shadow: inset 0 0 0 2px var(--muted); }
.mini-ck.done { background: rgba(43, 168, 100, .12); color: var(--green); }
.mini-ck.done .c { background: var(--lime); box-shadow: none; }
.go { color: var(--muted); flex-shrink: 0; }
.u-allok { display: flex; align-items: center; gap: 12px; padding: 14px 16px; font-size: 14px; font-weight: 700; }
.u-allok .big { font-size: 24px; }
.u-allok span:not(.big) { color: var(--muted); font-weight: 600; font-size: 12.5px; display: block; }
@media (min-width: 1100px) { .u-label { margin-top: 0; } }
@media (hover: hover) { .u-todo.tap:hover { opacity: .85; } }
</style>
