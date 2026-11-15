<template>
  <div>
    <div class="u-label rise" style="--i: 4">
      Keluar buat apa
      <button v-if="categories.length > TOP" class="u-more" data-test="cat-all" @click="all = !all">{{ all ? 'Ringkas' : `Lihat semua ${categories.length} ›` }}</button>
    </div>
    <div class="shell rise" style="--i: 4">
      <div class="core u-list">
        <div v-if="!categories.length" class="u-none">Belum ada catatan di bulan ini.</div>
        <div v-for="c in shown" :key="c.id" class="u-cat" data-test="cat">
          <span class="av" :style="{ background: c.tint }">{{ c.emoji }}</span>
          <div class="grow">
            <div class="t"><span class="nm">{{ c.name }}</span><b>{{ rp(c.total) }}</b></div>
            <div class="s">
              <span>{{ pct(c.total, total) }}% dari total</span>
              <span v-if="!c.budget" class="tag">di luar budget</span>
              <span v-else-if="c.total > c.budget" class="bad">kelewat {{ rpShort(c.total - c.budget) }}</span>
              <span v-else :class="level(c)">dari {{ rpShort(c.budget) }}</span>
            </div>
            <div v-if="c.budget" class="bar"><i :class="level(c)" :style="{ width: `${Math.min(100, (c.total / c.budget) * 100)}%` }" /></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { pct } from '@/lib/overview.js'
import { rp, rpShort } from '@/lib/wallet.js'

const TOP = 5
const props = defineProps({
  categories: { type: Array, required: true },
  /** Keluar bulan itu (buat "N% dari total"). */
  total: { type: Number, required: true },
  month: { type: String, required: true },
})
const all = ref(false)
const shown = computed(() => (all.value ? props.categories : props.categories.slice(0, TOP)))
// Ganti bulan → balik ringkas (dimuat ulang abis centang nggak ngaruh).
watch(() => props.month, () => (all.value = false))

const level = (c) => (c.total > c.budget ? 'bad' : c.total >= c.budget * 0.8 ? 'warn' : '')
</script>

<style scoped>
.u-label { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 24px 8px 10px; }
.u-more { border: 0; background: transparent; padding: 0; font: 700 12px var(--ion-font-family); letter-spacing: .02em; text-transform: none; color: var(--muted); cursor: pointer; }
.u-list { padding: 4px 6px; }
.u-none { padding: 18px 14px; color: var(--muted); font-size: 13.5px; text-align: center; }
.u-cat { display: flex; align-items: center; gap: 12px; padding: 11px 10px; }
.u-cat + .u-cat { box-shadow: inset 0 1px 0 var(--hair); }
.u-cat .av { width: 38px; height: 38px; border-radius: 13px; display: grid; place-items: center; font-size: 18px; flex-shrink: 0; }
.u-cat .t { font-size: 14.5px; font-weight: 700; display: flex; justify-content: space-between; gap: 8px; }
.u-cat .t .nm { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.u-cat .t b { font-variant-numeric: tabular-nums; flex-shrink: 0; }
.u-cat .s { font-size: 12px; color: var(--muted); font-weight: 600; margin-top: 2px; display: flex; justify-content: space-between; gap: 8px; }
.u-cat .s .warn { color: #C27C00; }
.u-cat .s .bad { color: var(--red); }
:root.theme-dark .u-cat .s .warn { color: var(--amber); }
.bar { height: 5px; border-radius: 99px; background: var(--soft); margin-top: 7px; overflow: hidden; }
.bar i { display: block; height: 100%; border-radius: 99px; background: var(--ink); }
.bar i.warn { background: var(--amber); }
.bar i.bad { background: var(--red); }
.tag { display: inline-flex; align-items: center; height: 20px; padding: 0 7px; border-radius: 99px; font-size: 10.5px; font-weight: 700; background: var(--soft); color: var(--muted); }
@media (hover: hover) { .u-more:hover { color: var(--text); } }
</style>
