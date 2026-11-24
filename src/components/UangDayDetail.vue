<template>
  <!-- key = tanggal: ganti hari, animasi swap main lagi -->
  <div :key="row.date" class="swap">
    <div class="dhead" data-test="day-head">
      <span class="k"><template v-if="isToday"><b>Hari ini</b> · {{ longDay(row.date) }}</template><template v-else>{{ dayTitle(row.date, false) }}</template></span>
      <span class="tot" data-test="day-total">{{ rp(row.total) }}</span>
    </div>
    <div class="shell">
      <div class="core list">
        <div v-if="state === 'error'" class="derr" data-test="day-error">
          <span>Catatan nggak kemuat.</span>
          <button type="button" data-test="day-retry" @click="emit('retry')">Coba lagi</button>
        </div>
        <div v-else-if="!items.length && state === 'loading'" class="dload" />
        <template v-else-if="items.length">
          <div v-if="note" class="dnote" data-test="day-note">
            jatah <b>{{ rp(note.jatah) }}</b> · <span :class="note.tone">{{ note.label }}</span>
          </div>
          <button v-for="x in items" :key="x.id" type="button" class="exp" data-test="day-expense" @click="emit('open', x)">
            <span class="av" :style="{ background: x.category.tint }">{{ x.category.emoji }}</span>
            <span class="grow">
              <span class="title">{{ x.note || x.category.name }}</span>
              <span class="sub">{{ x.category.name }} · {{ x.source.name }}</span>
            </span>
            <span class="amt">{{ rp(x.amount) }}</span>
          </button>
        </template>
        <div v-else class="dempty" data-test="day-empty">
          Nggak ada duit keluar {{ isToday ? 'hari ini' : 'hari itu' }} 👌
          <span v-if="row.jatah !== null && row.jatah !== undefined">jatah {{ rp(row.jatah) }} utuh</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { longDay } from '@/lib/duit.js'
import { dayTitle, jatahNote } from '@/lib/overview.js'
import { rp } from '@/lib/wallet.js'

const props = defineProps({
  row: { type: Object, required: true },
  isToday: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  state: { type: String, default: 'ok' },
})
const emit = defineEmits(['open', 'retry'])
const note = computed(() => jatahNote(props.row, props.isToday))
</script>

<style scoped>
/* .core global padding 18px; di sini kotak rincian pakai 4px 6px kayak mockup (specificity scoped lebih tinggi) */
.core.list { padding: 4px 6px; }
.dhead { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin: 18px 8px 10px; }
.dhead .k { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); }
.dhead .k b { color: var(--text); }
.dhead .tot { font-size: 15px; font-weight: 800; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.dnote { display: flex; align-items: center; gap: 8px; padding: 10px 12px 6px; font-size: 12px; font-weight: 600; color: var(--muted); font-variant-numeric: tabular-nums; }
.dnote b { color: var(--text); }
.dnote .bad { color: var(--red); }
.dnote .good { color: var(--green); }
.exp { position: relative; display: flex; align-items: center; gap: 12px; width: 100%; padding: 11px 10px; border: 0; background: transparent; text-align: left; cursor: pointer; border-radius: 16px; font-family: inherit; color: var(--text); }
.exp + .exp::before { content: ''; position: absolute; left: 10px; right: 10px; top: 0; height: 1px; background: var(--hair); }
.exp .av { width: 38px; height: 38px; border-radius: 13px; display: grid; place-items: center; font-size: 18px; flex-shrink: 0; }
.exp .grow { flex: 1; min-width: 0; }
.exp .title { display: block; font-size: 14.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.exp .sub { display: block; font-size: 12px; color: var(--muted); font-weight: 600; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.exp .amt { font-size: 14.5px; font-weight: 800; font-variant-numeric: tabular-nums; flex-shrink: 0; }
.dempty { padding: 22px 16px; text-align: center; font-size: 14px; font-weight: 700; }
.dempty span { display: block; margin-top: 3px; font-size: 12.5px; font-weight: 600; color: var(--muted); }
.dload { min-height: 72px; }
.derr { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 22px 16px; font-size: 14px; font-weight: 700; }
.derr button { border: 0; height: 34px; padding: 0 16px; border-radius: 99px; background: var(--soft); color: var(--text); font: 700 13px var(--ion-font-family); cursor: pointer; }
.swap { animation: swap .35s var(--spring) both; }
@keyframes swap { from { opacity: 0; transform: translateY(6px); } }
@media (hover: hover) { .exp:hover { background: var(--soft); } }
</style>
