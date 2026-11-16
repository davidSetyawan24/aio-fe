<template>
  <div class="inv" :class="{ paid: invoice.status === 'paid' }" data-test="inv" role="button" tabindex="0" @click="$emit('open', invoice)" @keydown.enter="$emit('open', invoice)">
    <span class="av" :style="{ background: invoice.tint || '#ECEBE6' }">{{ initial }}</span>
    <div class="grow t"><span>{{ invoice.client.name }}</span><small>{{ invoice.number }}</small></div>
    <div class="cols">
      <span>{{ invoice.subject }}</span>
      <span>{{ fmtShort(invoice.issuedOn) }}</span>
      <span>{{ invoice.paidOn ? `Lunas ${fmtShort(invoice.paidOn)}` : fmtShort(invoice.dueOn) }}</span>
    </div>
    <div class="end"><span class="amt">{{ rp(invoice.totals.total) }}</span><span class="tag" :class="chip.tone">{{ chip.text }}</span></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { fmtShort, initialsOf, rp, statusChip } from '@/lib/invoice.js'

const props = defineProps({ invoice: { type: Object, required: true } })
defineEmits(['open'])

const chip = computed(() => statusChip(props.invoice))
const initial = computed(() => initialsOf(props.invoice.client.name).toUpperCase() || '?')
</script>

<style scoped>
.inv { display: flex; align-items: center; gap: 12px; padding: 12px 10px; cursor: pointer; }
.inv + .inv { box-shadow: inset 0 1px 0 var(--hair); }
.av { width: 40px; height: 40px; border-radius: 14px; display: grid; place-items: center; font-weight: 800; font-size: 13.5px; color: #141410; flex: none; letter-spacing: -0.02em; }
.t { min-width: 0; font-size: 15px; font-weight: 700; }
.t > span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.t small { display: block; font-size: 12px; color: var(--muted); font-weight: 600; margin-top: 2px; font-variant-numeric: tabular-nums; }
.end { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex: none; }
.amt { font-size: 14.5px; font-weight: 800; font-variant-numeric: tabular-nums; }
.inv.paid .amt, .inv.paid .t { opacity: .55; }
.cols { display: none; }
.tag { display: inline-flex; align-items: center; height: 22px; padding: 0 8px; border-radius: 99px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.tag.red { background: rgba(240, 83, 61, .12); color: var(--red); }
.tag.amber { background: rgba(245, 165, 36, .16); color: #C27C00; }
:root.theme-dark .tag.amber { color: var(--amber, #F5A524); }
.tag.green { background: rgba(43, 168, 100, .12); color: var(--green); }
.tag.soft { background: var(--soft); color: var(--muted); }

/* ≥1600: baris jadi tabel (Klien · Perihal · Tanggal · Jatuh tempo · Total) */
@media (min-width: 1600px) {
  .cols { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(90px, .6fr) minmax(130px, .8fr); gap: 16px; flex: 2; min-width: 0; font-size: 13px; font-weight: 600; color: var(--muted); }
  .cols span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .t { flex: 1.1; }
}
@media (hover: hover) { .inv:hover .t > span { text-decoration: underline; } }
</style>
