<template>
  <div class="br-row" :class="{ done: row.status === 'paid' }">
    <button type="button" class="br-ck" data-test="tick" :aria-label="row.status === 'paid' ? `Batal lunas ${row.name}` : `Tandain ${row.name} lunas`"
      :aria-pressed="String(row.status === 'paid')" @click="$emit('tick', row)">
      <PhCheck :size="14" weight="bold" />
    </button>
    <span class="br-av" :style="{ background: row.tint }">{{ row.emoji }}</span>
    <button type="button" class="br-name" data-test="edit" @click="$emit('edit', row.billId)">
      <span class="nm">{{ row.name }}</span>
      <small>{{ shortDue(row.dueOn) }} · {{ sourceName }}</small>
    </button>
    <span class="br-cols">
      <span><PhCalendarBlank :size="14" />{{ shortDue(row.dueOn) }}</span>
      <span><PhWallet :size="14" />{{ sourceName }}</span>
      <span><PhRepeat :size="14" />{{ row.freq === 'yearly' ? 'Tahunan' : 'Bulanan' }}</span>
    </span>
    <span class="br-end">
      <b>{{ rp(row.amount) }}</b>
      <span v-if="chip" class="chip" :class="chip.tone">{{ chip.text }}</span>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PhCalendarBlank, PhCheck, PhRepeat, PhWallet } from '@phosphor-icons/vue'
import { dueChip, shortDue } from '@/lib/bayarRutin.js'
import { rp } from '@/lib/wallet.js'

/** Satu periode Bayar Rutin di daftar bulan itu. Di monitor lebar (≥2200px) jadi kayak baris tabel. */
const props = defineProps({ row: { type: Object, required: true }, sourceName: { type: String, default: '' } })
defineEmits(['tick', 'edit'])
const chip = computed(() => dueChip(props.row))
</script>

<style scoped>
.br-row { display: flex; align-items: center; gap: 12px; padding: 11px 10px; }
.br-row + .br-row { box-shadow: inset 0 1px 0 var(--hair); }
.br-ck { width: 26px; height: 26px; flex-shrink: 0; padding: 0; border: 0; border-radius: 99px; box-shadow: inset 0 0 0 2px var(--muted); background: transparent;
  display: grid; place-items: center; color: #141410; cursor: pointer; transition: background .25s var(--spring), box-shadow .25s; }
.br-ck svg { opacity: 0; transform: scale(.4); transition: all .3s var(--spring); }
.done .br-ck { background: var(--lime); box-shadow: none; }
.done .br-ck svg { opacity: 1; transform: none; }
.br-av { width: 40px; height: 40px; border-radius: 14px; display: grid; place-items: center; font-size: 19px; flex-shrink: 0; }
.br-name { flex: 1; min-width: 0; padding: 0; border: 0; background: transparent; color: var(--text); font: inherit; text-align: left; cursor: pointer; }
.br-name .nm { display: block; font-size: 15px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.br-name small { display: block; font-size: 12px; color: var(--muted); font-weight: 600; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.br-cols { display: none; }
.br-end { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.br-end b { font-size: 14.5px; font-weight: 800; font-variant-numeric: tabular-nums; }
.br-end .chip { padding: 3px 8px; font-size: 11px; font-weight: 700; }
.done .br-av, .done .br-name, .done .br-end b, .done .br-cols { opacity: .42; }
.done .br-name .nm { text-decoration: line-through; }
:root.theme-dark .br-end .chip.amber { color: var(--amber); }
@media (hover: hover) { .br-name:hover .nm { text-decoration: underline; } }

/* Monitor lebar: baris jadi kolom-kolom (Jatuh tempo · Dibayar dari · Jadwal). */
@media (min-width: 2200px) {
  .br-row { gap: 16px; padding: 12px 14px; }
  .br-name small { display: none; }
  .br-cols { display: grid; grid-template-columns: minmax(90px, .6fr) minmax(170px, 1fr) minmax(90px, .6fr); gap: 16px; align-items: center; flex: 1.6; min-width: 0;
    font-size: 13px; font-weight: 600; color: var(--muted); }
  .br-cols span { display: flex; align-items: center; gap: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .br-end { flex-direction: row; align-items: center; gap: 12px; min-width: 230px; justify-content: flex-end; }
  .br-end .chip { order: -1; }
}
</style>
