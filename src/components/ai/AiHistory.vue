<template>
  <div class="cview" data-test="hist-view">
    <button type="button" class="newbtn" data-test="new" @click="$emit('new')">＋ Obrolan baru</button>

    <p v-if="loading" class="cvnote" data-test="loading">Bentar ya…</p>
    <p v-else-if="failed" class="cvnote" data-test="failed">Riwayatnya nggak kebuka. <button type="button" class="lnk" data-test="retry" @click="load">Coba lagi</button></p>
    <p v-else-if="!groups.length" class="cvnote" data-test="empty">Belum ada obrolan.</p>

    <template v-for="g in groups" :key="g.label">
      <div class="label"><span>{{ g.label }}</span></div>
      <div class="shell"><div class="core">
        <div v-for="c in g.items" :key="c.id" class="swipe" data-test="row-wrap" @touchstart.passive="onStart($event, c.id)" @touchmove.passive="onMove($event, c.id)" @touchend="onEnd(c.id)">
          <button type="button" class="crow" :style="shift(c.id)" data-test="row" @click="pick(c)">
            <span class="em">{{ iconOf(c) }}</span>
            <span class="grow"><b>{{ c.title || 'Obrolan baru' }}</b><small>{{ convSub(c) }}</small></span>
            <span class="tm">{{ convTime(c.updatedAt) }}</span>
          </button>
          <button type="button" class="del" data-test="del" aria-label="Hapus obrolan" @click.stop="confirmDelete(c)"><PhTrash :size="16" weight="bold" /><span>Hapus</span></button>
        </div>
      </div></div>
    </template>

    <p class="cvnote">Judul = pertanyaan pertama lo. Obrolan "Evaluasi …" kebuka juga dari ringkasan sesinya.</p>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { actionSheetController } from '@ionic/vue'
import { PhTrash } from '@phosphor-icons/vue'
import { convSub, convTime, groupConvs } from '@/lib/ai.js'
import { showToast } from '@/lib/personalForm.js'
import { useAiStore } from '@/stores/ai.js'

/** Riwayat obrolan di dalem chat. Tap baris → `open` (id); "＋ Obrolan baru" → `new`. HP: geser kiri = Hapus; PC: tombol Hapus pas di-hover. */
const emit = defineEmits(['open', 'new'])
const ai = useAiStore()
const loading = ref(true)
const failed = ref(false)
const groups = computed(() => groupConvs(ai.convs))

const iconOf = (c) => (c.kind === 'eval' ? '🤖' : c.context === 'badan' ? '⚖️' : '🏋️')

async function load() {
  loading.value = true
  failed.value = false
  const res = await ai.loadConvs()
  failed.value = res === null
  loading.value = false
}
onMounted(load)

// Geser kiri (HP): baris ke-geser maks 84px, lewat 40px = kebuka.
const OPEN = 84
const offsets = ref({})
let drag = null
const shift = (id) => (offsets.value[id] ? { transform: `translateX(${offsets.value[id]}px)`, transition: drag?.id === id ? 'none' : undefined } : null)
function onStart(e, id) {
  const t = e.touches[0]
  for (const k of Object.keys(offsets.value)) if (Number(k) !== id) offsets.value[k] = 0
  drag = { id, x: t.clientX, y: t.clientY, base: offsets.value[id] ?? 0, horizontal: null }
}
function onMove(e, id) {
  if (!drag || drag.id !== id) return
  const t = e.touches[0]
  const dx = t.clientX - drag.x
  if (drag.horizontal === null && Math.abs(dx) + Math.abs(t.clientY - drag.y) > 8) drag.horizontal = Math.abs(dx) > Math.abs(t.clientY - drag.y)
  if (!drag.horizontal) return
  offsets.value = { ...offsets.value, [id]: Math.max(-OPEN, Math.min(0, drag.base + dx)) }
}
function onEnd(id) {
  if (!drag || drag.id !== id) return
  const moved = drag.horizontal
  drag = null
  if (moved) offsets.value = { ...offsets.value, [id]: (offsets.value[id] ?? 0) < -40 ? -OPEN : 0 }
}

function pick(c) {
  if (offsets.value[c.id]) {
    offsets.value = { ...offsets.value, [c.id]: 0 }
    return
  }
  emit('open', c.id)
}

let confirming = false
async function confirmDelete(c) {
  if (confirming) return
  confirming = true
  try {
    const sheet = await actionSheetController.create({
      header: 'Hapus obrolan ini?',
      subHeader: c.title || undefined,
      buttons: [{ text: 'Hapus', role: 'destructive', data: 'delete' }, { text: 'Batal', role: 'cancel' }],
    })
    await sheet.present()
    const { data } = await sheet.onDidDismiss()
    offsets.value = { ...offsets.value, [c.id]: 0 }
    if (data !== 'delete') return
    if (await ai.removeConv(c.id)) await showToast('Obrolan dihapus')
  } finally {
    confirming = false
  }
}
</script>

<style scoped>
.core { padding: 0; overflow: hidden; }
.cview { flex: 1; min-height: 0; overflow-y: auto; padding: 6px 14px 24px; }
.cview .label { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 24px 6px 10px; }
.newbtn { width: 100%; margin-top: 12px; height: 50px; border: 0; border-radius: 99px; background: var(--ink); color: var(--on-ink); font: 800 15px var(--ion-font-family); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
.swipe { position: relative; overflow: hidden; }
.swipe + .swipe { box-shadow: inset 0 1px 0 var(--hair); }
.crow { position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; width: 100%; min-height: 62px; padding: 10px 12px; border: 0; background: var(--card); color: var(--text); text-align: left; cursor: pointer; font: inherit; transition: transform .25s var(--spring); }
.em { width: 38px; height: 38px; border-radius: 13px; background: var(--soft); display: grid; place-items: center; font-size: 18px; flex-shrink: 0; }
.grow { flex: 1; min-width: 0; }
.crow b { display: block; font-size: 14.5px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.crow small { display: block; font-size: 12px; font-weight: 600; color: var(--muted); margin-top: 1px; }
.tm { font-size: 12px; font-weight: 700; color: var(--muted); white-space: nowrap; }
.del { position: absolute; top: 0; right: 0; bottom: 0; width: 84px; border: 0; background: var(--red); color: #fff; font: 800 13px var(--ion-font-family); display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; }
.cvnote { margin: 10px 6px 0; font-size: 12px; font-weight: 600; color: var(--muted); line-height: 1.5; }
.lnk { border: 0; background: none; padding: 0; font: 800 12.5px var(--ion-font-family); color: var(--text); text-decoration: underline; cursor: pointer; }
@media (hover: hover) {
  .del { z-index: 2; left: auto; right: 10px; top: 50%; bottom: auto; width: 34px; height: 34px; margin-top: -17px; border-radius: 99px; opacity: 0; background: var(--soft); color: var(--red); transition: opacity .15s; }
  .del span { display: none; }
  .swipe:hover .del, .del:focus-visible { opacity: 1; }
  .swipe:hover .tm { visibility: hidden; }
}
</style>
