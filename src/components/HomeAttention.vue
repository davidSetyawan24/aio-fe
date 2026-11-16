<template>
  <div data-test="attention">
    <div class="h-label rise">
      <span>Perlu diurus<span v-if="left" class="cnt" data-test="attn-count">{{ left }}</span></span>
    </div>
    <div class="shell rise">
      <div class="core h-list">
        <div v-if="!items.length" class="h-allok">
          <span class="em">🎉</span>
          <div>Semua beres. Mantap<span>Nggak ada yang telat atau mepet. Budget juga aman.</span></div>
        </div>
        <div
          v-for="item in shown"
          :key="viewOf(item).key"
          class="h-todo"
          :class="{ done: store.isDone(item) }"
          data-test="attn-row"
          @click="ionRouter.push(viewOf(item).to)"
        >
          <span class="ic" :style="{ background: viewOf(item).tint }">{{ viewOf(item).emoji }}</span>
          <div class="grow t">
            <span>{{ viewOf(item).title }}</span>
            <small :class="store.isDone(item) ? '' : viewOf(item).tone"><template v-for="(part, i) in subParts(item)" :key="i"><span class="seg">{{ part }}</span>{{ ' ' }}</template></small>
          </div>
          <button
            v-if="viewOf(item).ask"
            class="h-ck"
            :class="{ done: store.isDone(item) }"
            :disabled="store.isPending(item)"
            @click.stop="tick(item)"
          >
            <span class="c"><PhCheck v-if="store.isDone(item)" :size="10" weight="bold" /></span>{{ store.isDone(item) ? viewOf(item).doneLabel : viewOf(item).ask }}
          </button>
          <PhCaretRight v-else :size="16" class="h-go" />
        </div>
        <button v-if="hidden > 0" class="h-more" data-test="attn-more" @click="expanded = true">Lihat {{ hidden }} lagi</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { toastController, useIonRouter } from '@ionic/vue'
import { PhCaretRight, PhCheck } from '@phosphor-icons/vue'
import { attentionView, doneToast } from '@/lib/home.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { useHomeStore } from '@/stores/home.js'

const MAX = 6
const props = defineProps({ items: { type: Array, required: true }, today: { type: String, required: true } })
const store = useHomeStore()
const ionRouter = useIonRouter()
const expanded = ref(false)

const viewOf = (item) => attentionView(item, props.today)
/** Keterangan dipotong per " · " → kalau nggak muat (HP, tombol lebar) pindah barisnya di situ, bukan di tengah kalimat. */
function subParts(item) {
  if (store.isDone(item)) return ['Udah dicatet ✓']
  const parts = viewOf(item).sub.split(' · ')
  return parts.map((p, i) => (i < parts.length - 1 ? `${p} ·` : p))
}
const left = computed(() => props.items.filter((i) => !store.isDone(i)).length)
const shown = computed(() => (expanded.value ? props.items : props.items.slice(0, MAX)))
const hidden = computed(() => (expanded.value ? 0 : Math.max(0, props.items.length - MAX)))

const toast = async (message) => (await toastController.create({ message, duration: 2000, position: 'top', cssClass: 'aio-toast' })).present()
async function tick(item) {
  try {
    const done = await store.toggle(item)
    if (done === null) return
    await toast(doneToast(item, done))
  } catch (err) {
    await toast(apiErrorMessage(err))
  }
}
</script>

<style scoped>
.h-label { display: flex; justify-content: space-between; align-items: center; min-height: 20px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 24px 8px 10px; }
.h-label .cnt { display: inline-grid; place-items: center; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 99px; background: var(--red); color: #fff; font-size: 11px; letter-spacing: 0; margin-left: 6px; }
.h-list { padding: 4px 6px; }
.h-todo { display: flex; align-items: center; gap: 12px; padding: 11px 10px; cursor: pointer; }
.h-todo + .h-todo { box-shadow: inset 0 1px 0 var(--hair); }
.h-todo .ic { width: 40px; height: 40px; border-radius: 14px; display: grid; place-items: center; font-size: 19px; flex-shrink: 0; }
.h-todo .t { font-size: 14.5px; font-weight: 700; min-width: 0; }
.h-todo .t > span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.h-todo .t small { display: block; font-size: 12px; color: var(--muted); font-weight: 600; margin-top: 2px; font-variant-numeric: tabular-nums; }
.h-todo .t small .seg { display: inline-block; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; vertical-align: top; }
.h-todo .t small.red { color: var(--red); }
.h-todo .t small.amber { color: #C27C00; }
:root.theme-dark .h-todo .t small.amber { color: var(--amber); }
.h-todo.done .t, .h-todo.done .ic { opacity: .42; }
.h-todo.done .t > span { text-decoration: line-through; }
.h-ck { height: 34px; padding: 0 12px; border: 0; border-radius: 99px; background: var(--soft); color: var(--text); font: 700 12.5px var(--ion-font-family); cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; white-space: nowrap; }
.h-ck:active { transform: scale(.97); }
.h-ck:disabled { opacity: .7; cursor: default; }
.h-ck .c { width: 16px; height: 16px; border-radius: 99px; box-shadow: inset 0 0 0 2px var(--muted); display: grid; place-items: center; }
.h-ck.done { background: rgba(43, 168, 100, .12); color: var(--green); }
.h-ck.done .c { background: var(--lime); box-shadow: none; color: #141410; }
.h-go { color: var(--muted); flex-shrink: 0; }
.h-more { display: block; width: 100%; padding: 12px 10px; border: 0; background: none; box-shadow: inset 0 1px 0 var(--hair); color: var(--text); font: 700 13px var(--ion-font-family); cursor: pointer; }
.h-allok { display: flex; align-items: center; gap: 14px; padding: 18px 16px; font-size: 15px; font-weight: 800; }
.h-allok .em { font-size: 28px; }
.h-allok span:not(.em) { color: var(--muted); font-weight: 600; font-size: 12.5px; display: block; margin-top: 2px; }
@media (min-width: 1100px) { .h-label { margin-top: 12px; } }
@media (hover: hover) { .h-todo:hover { background: rgba(127, 127, 120, .05); border-radius: 18px; } .h-more:hover { opacity: .7; } }
</style>
