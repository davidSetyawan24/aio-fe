<template>
  <div>
    <div class="b-label rise" style="--i: 5"><span>Riwayat</span><small>{{ rows.length }} timbangan<template v-if="sleeps.length"> · {{ sleeps.length }} malam tidur</template></small></div>
    <div class="shell rise" style="--i: 5">
      <div class="b-core" data-test="history">
        <div class="b-rhead">
          <span>Tanggal</span><span>Berat</span><span>Lemak</span><span>Otot</span><span>Tidur</span>
          <span class="x w2">Air</span><span class="x w2">Visc.</span><span class="x">Tulang</span><span class="x">Protein</span><span class="x">BMR</span><span />
        </div>
        <div class="b-rlist">
          <template v-for="g in groups" :key="g.month">
            <div class="b-rmonth">{{ monthLabel(g.month) }}</div>
            <div v-for="d in g.days" :key="d.date" class="b-rrow" role="button" tabindex="0" data-test="hrow" @click="openDay(d)" @keydown.enter.self.prevent="openDay(d)">
              <div class="dt">
                <b>{{ rowTitle(d.date, today) }}</b>
                <small v-if="d.weighing"><span v-if="d.date >= yesterday" class="b-rpre">{{ dShort(d.date) }} · </span>{{ jam(d.weighing.weighedAt) }}<span v-if="d.weighing.source === 'manual'" class="b-mtag">manual</span></small>
                <small v-else><span v-if="d.date >= yesterday" class="b-rpre sl">{{ dShort(d.date) }} · </span>cuma tidur</small>
              </div>
              <template v-if="d.weighing">
                <span class="c">{{ fmt(d.weighing.weight, 2) }}</span>
                <span class="c">{{ fmt(d.weighing.fat, 1) }}<small v-if="d.weighing.fat != null">%</small></span>
                <span class="c">{{ fmt(d.weighing.muscle, 2) }}</span>
              </template>
              <template v-else><span class="c na">–</span><span class="c na">–</span><span class="c na">–</span></template>
              <button v-if="d.sleep" type="button" class="c b-rsl" data-test="hsleep" :aria-label="`Detail tidur ${dShort(d.date)}`" @click.stop="$emit('openSleep', d.sleep.id)">{{ durS(d.sleep.totalMin) }}</button>
              <span v-else class="c na">–</span>
              <template v-if="d.weighing">
                <span class="c x w2">{{ fmt(d.weighing.water, 1) }}<small v-if="d.weighing.water != null">%</small></span>
                <span class="c x w2">{{ fmt(d.weighing.visceral, 0) }}</span>
                <span class="c x">{{ fmt(d.weighing.bone, 2) }}</span>
                <span class="c x">{{ fmt(d.weighing.protein, 1) }}<small v-if="d.weighing.protein != null">%</small></span>
                <span class="c x">{{ fmt(d.weighing.bmr, 0) }}</span>
              </template>
              <template v-else><span class="c x w2 na">–</span><span class="c x w2 na">–</span><span class="c x na">–</span><span class="c x na">–</span><span class="c x na">–</span></template>
              <span class="go"><PhCaretRight :size="16" /></span>
            </div>
          </template>
        </div>
        <button v-if="!all && days.length > limit" type="button" class="b-rmore" data-test="more" @click="expanded = !expanded">{{ expanded ? 'Ringkes lagi' : `Liat semua ${days.length} hari` }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { PhCaretRight } from '@phosphor-icons/vue'
import { addDays } from '@/lib/agenda.js'
import { fmt, monthLabel } from '@/lib/badan.js'
import { durS, sleepHistory } from '@/lib/badanSleep.js'
import { dShort, jam, rowTitle } from '@/lib/badanView.js'
import './badan.css'

/** Riwayat per tanggal: timbangan + tidur digabung. Tap baris → detail timbangan (kalau nggak ada → detail tidur); tap sel Tidur → detail tidur. */
const props = defineProps({
  /** Timbangan, terbaru dulu. */
  rows: { type: Array, required: true },
  sleeps: { type: Array, default: () => [] },
  today: { type: String, required: true },
  /** PC: semua baris, tanpa tombol. */
  all: { type: Boolean, default: false },
  limit: { type: Number, default: 8 },
})
const emit = defineEmits(['open', 'openSleep'])

const expanded = ref(false)
const yesterday = computed(() => addDays(props.today, -1))
const days = computed(() => sleepHistory(props.rows, props.sleeps))
const shown = computed(() => (props.all || expanded.value ? days.value : days.value.slice(0, props.limit)))
const groups = computed(() => {
  const out = []
  for (const d of shown.value) {
    const month = d.date.slice(0, 7)
    const g = out.at(-1)
    if (g && g.month === month) g.days.push(d)
    else out.push({ month, days: [d] })
  }
  return out
})
const openDay = (d) => (d.weighing ? emit('open', d.weighing.id) : emit('openSleep', d.sleep.id))
</script>
