<template>
  <div>
    <div class="b-label rise" style="--i: 4"><span>Riwayat</span><small>{{ rows.length }} timbangan</small></div>
    <div class="shell rise" style="--i: 4">
      <div class="b-core" data-test="history">
        <div class="b-rhead">
          <span>Tanggal</span><span>Berat</span><span>Lemak</span><span>Otot</span>
          <span class="x w2">Air</span><span class="x w2">Visc.</span><span class="x">Tulang</span><span class="x">Protein</span><span class="x">BMR</span><span />
        </div>
        <div class="b-rlist">
          <template v-for="g in groups" :key="g.month">
            <div class="b-rmonth">{{ monthLabel(g.month) }}</div>
            <button v-for="r in g.rows" :key="r.id" type="button" class="b-rrow" data-test="hrow" @click="$emit('open', r.id)">
              <div class="dt">
                <b>{{ rowTitle(r.weighedOn, today) }}</b>
                <small>{{ r.weighedOn >= yesterday ? `${dShort(r.weighedOn)} · ` : '' }}{{ jam(r.weighedAt) }}<span v-if="r.source === 'manual'" class="b-mtag">manual</span></small>
              </div>
              <span class="c">{{ fmt(r.weight, 2) }}</span>
              <span class="c">{{ fmt(r.fat, 1) }}<small v-if="r.fat != null">%</small></span>
              <span class="c">{{ fmt(r.muscle, 2) }}</span>
              <span class="c x w2">{{ fmt(r.water, 1) }}<small v-if="r.water != null">%</small></span>
              <span class="c x w2">{{ fmt(r.visceral, 0) }}</span>
              <span class="c x">{{ fmt(r.bone, 2) }}</span>
              <span class="c x">{{ fmt(r.protein, 1) }}<small v-if="r.protein != null">%</small></span>
              <span class="c x">{{ fmt(r.bmr, 0) }}</span>
              <span class="go"><PhCaretRight :size="16" /></span>
            </button>
          </template>
        </div>
        <button v-if="!all && rows.length > limit" type="button" class="b-rmore" data-test="more" @click="expanded = !expanded">{{ expanded ? 'Ringkes lagi' : `Liat semua ${rows.length} timbangan` }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { PhCaretRight } from '@phosphor-icons/vue'
import { addDays } from '@/lib/agenda.js'
import { fmt, monthLabel } from '@/lib/badan.js'
import { dShort, jam, rowTitle } from '@/lib/badanView.js'
import './badan.css'

const props = defineProps({
  /** Terbaru dulu. */
  rows: { type: Array, required: true },
  today: { type: String, required: true },
  /** PC: semua baris, tanpa tombol. */
  all: { type: Boolean, default: false },
  limit: { type: Number, default: 8 },
})
defineEmits(['open'])

const expanded = ref(false)
const yesterday = computed(() => addDays(props.today, -1))
const shown = computed(() => (props.all || expanded.value ? props.rows : props.rows.slice(0, props.limit)))
const groups = computed(() => {
  const out = []
  for (const r of shown.value) {
    const month = r.weighedOn.slice(0, 7)
    const g = out.at(-1)
    if (g && g.month === month) g.rows.push(r)
    else out.push({ month, rows: [r] })
  }
  return out
})
</script>
