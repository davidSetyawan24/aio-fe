<template>
  <div class="gl-ex" :class="{ open }" data-test="ex">
    <button type="button" class="gl-exhead" data-test="exhead" :aria-expanded="String(open)" @click="$emit('toggle')">
      <span class="gl-exn" :class="stat.all ? 'done' : stat.n ? 'part' : ''">
        <PhCheck v-if="stat.all" :size="18" weight="bold" />
        <template v-else>{{ index + 1 }}</template>
      </span>
      <span class="grow">
        <b class="nm">{{ name }}<span v-if="item.extra" class="gl-tagx">tambahan</span></b>
        <small v-if="stat.n"><b>{{ stat.n }} set ✓</b> · terberat {{ setText(stat.best) }}<span v-if="pr" class="gy-chip pr">PR</span></small>
        <small v-else-if="lastSets.length">sesi lalu {{ setText(bestSet(lastSets)) }} · {{ lastSets.length }} set</small>
        <small v-else>belum ada riwayat</small>
      </span>
      <span class="go"><PhCaretRight :size="18" weight="bold" /></span>
    </button>

    <div v-if="body" class="gl-exbody">
      <div class="gl-exmeta">
        <span class="gy-chip mut">⏱️ istirahat {{ restText(exercise?.restSec ?? 120) }}</span>
        <span v-if="exercise?.dumbbell" class="gy-chip mut">beban per 1 dumbbell</span>
      </div>
      <template v-for="(r, j) in item.rows" :key="r.key">
        <GymSetEditor
          v-if="r.key === cur"
          :n="j + 1"
          :weight="r.weight"
          :reps="r.reps"
          :prev="r.prev"
          :done="r.done"
          :step="Number(exercise?.step ?? 2.5)"
          :disabled="disabled"
          @change="(v) => $emit('change', j, v)"
          @check="(v) => $emit('check', j, v)"
          @save="(v) => $emit('save', j, v)"
          @remove="$emit('remove', j)"
        />
        <button v-else-if="r.done" type="button" class="gl-srow done" :data-row="j" @click="$emit('row', r.key)">
          <span class="sn"><PhCheck :size="15" weight="bold" /></span>
          <span class="sl">Set {{ j + 1 }}</span>
          <span class="sv">{{ kgText(r.weight) }} <small>kg</small> × {{ r.reps }}<span v-if="j === prRow" class="gy-chip pr">PR</span></span>
          <span class="sp">{{ r.prev ? `lalu ${setText(r.prev)}` : '' }}</span>
        </button>
        <button v-else type="button" class="gl-srow todo" :data-row="j" @click="$emit('row', r.key)">
          <span class="sn">{{ j + 1 }}</span>
          <span class="sl">Set {{ j + 1 }}</span>
          <span class="sv">{{ r.weight != null && r.reps != null ? setText([r.weight, r.reps]) : '—' }}</span>
          <span class="sp">belum</span>
        </button>
      </template>
      <button type="button" class="gl-addset" data-test="addset" :disabled="disabled" @click="$emit('addset')"><PhPlus :size="16" weight="bold" />Tambah set</button>
      <button v-if="next" type="button" class="gl-nextex" data-test="nextex" @click="$emit('next')">
        <span class="grow"><small>Gerakan beres. Lanjut?</small><b>{{ next }}</b></span>
        <span class="ar"><PhCaretRight :size="18" weight="bold" /></span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PhCaretRight, PhCheck, PhPlus } from '@phosphor-icons/vue'
import GymSetEditor from './GymSetEditor.vue'
import { bestSet, kgText, prOf, restText, setText } from '@/lib/gym.js'

/**
 * Kartu satu gerakan di sesi live. Kepala: nomor / ✓, nama, ringkasan set (+ chip PR).
 * Badan (kalau `body`): chip istirahat, baris set (yang `cur` jadi editor), Tambah set, "Gerakan beres. Lanjut?".
 */
const props = defineProps({
  item: { type: Object, required: true },
  index: { type: Number, required: true },
  exercise: { type: Object, default: null },
  open: { type: Boolean, default: false },
  body: { type: Boolean, default: false },
  /** Kunci baris yang lagi kebuka di editor (null = nggak ada). */
  cur: { type: String, default: null },
  /** Nama gerakan berikutnya buat tombol "Gerakan beres. Lanjut?" (null = nggak ada). */
  nextName: { type: String, default: null },
  disabled: { type: Boolean, default: false },
})
defineEmits(['toggle', 'row', 'change', 'check', 'save', 'remove', 'addset', 'next'])

const name = computed(() => props.exercise?.name ?? 'Gerakan')
const lastSets = computed(() => (props.exercise?.last?.sets ?? []).map(([w, r]) => [Number(w), Number(r)]))
const stat = computed(() => {
  const done = props.item.rows.filter((r) => r.done).map((r) => [r.weight, r.reps])
  return { pairs: done, n: done.length, all: done.length > 0 && done.length === props.item.rows.length, best: bestSet(done) }
})
/** PR kayak ringkasan nanti (dibanding rekor sesi-sesi selesai). Chip cuma satu, di set PR-nya (biasanya set terberat). */
const pr = computed(() => (stat.value.n ? prOf(stat.value.best, props.exercise?.record ?? null, stat.value.pairs) : null))
const prRow = computed(() => {
  const s = pr.value?.set
  return s ? props.item.rows.findIndex((r) => r.done && r.weight === s[0] && r.reps === s[1]) : -1
})
const next = computed(() => (stat.value.all && props.cur == null ? props.nextName : null))
</script>
