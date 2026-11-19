<template>
  <div class="shell rise">
    <div class="b-hero" data-test="hero">
      <div class="b-hk"><span>Rata-rata 7 hari</span><span class="b-hchip">{{ dShort(summary.from) }} – {{ dShort(summary.to) }}</span></div>
      <div class="b-hpair">
        <div>
          <div class="b-hl">Lemak</div>
          <div class="b-hv">{{ fmt(summary.fat, 1) }}<small>%</small></div>
          <span v-if="fatDelta" class="b-hd" :class="summary.tones.fat" data-test="delta-fat"><PhArrowDown v-if="fatDelta.dir === 'down'" :size="13" weight="bold" /><PhArrowUp v-else-if="fatDelta.dir === 'up'" :size="13" weight="bold" />{{ fatDelta.text }}</span>
          <div class="b-hraw">vs minggu lalu<br />{{ rawWord }} {{ fmt(last.fat, 1) }}%</div>
        </div>
        <div>
          <div class="b-hl">Otot</div>
          <div class="b-hv">{{ fmt(summary.muscle, 1) }}<small>kg</small></div>
          <span v-if="muscleDelta" class="b-hd" :class="summary.tones.muscle" data-test="delta-muscle"><PhArrowDown v-if="muscleDelta.dir === 'down'" :size="13" weight="bold" /><PhArrowUp v-else-if="muscleDelta.dir === 'up'" :size="13" weight="bold" />{{ muscleDelta.text }}</span>
          <div class="b-hraw">vs minggu lalu<br />{{ rawWord }} {{ fmt(last.muscle, 2) }} kg</div>
        </div>
      </div>
      <div class="b-hw">
        <div class="b-hwl">
          <span>Berat</span><b>{{ fmt(summary.weight, 1) }} kg</b>
          <span v-if="note" :class="note.cls" data-test="weight-note">{{ note.text }}</span>
        </div>
        <template v-if="scale">
          <div class="b-rbar">
            <span class="band" :style="{ left: `${scale.pos(goal.min)}%`, right: `${100 - scale.pos(goal.max)}%` }" />
            <span class="mk" :style="{ left: `${scale.pos(summary.weight)}%` }" />
          </div>
          <div class="b-rlab"><span>{{ scale.lo }}</span><span>{{ goal.min }}</span><span>{{ goal.max }}</span><span>{{ scale.hi }}</span></div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PhArrowDown, PhArrowUp } from '@phosphor-icons/vue'
import { fmt } from '@/lib/badan.js'
import { dShort, deltaView, rangeScale } from '@/lib/badanView.js'
import './badan.css'

const props = defineProps({
  summary: { type: Object, required: true },
  /** Timbangan terbaru (angka mentah "hari ini"). */
  last: { type: Object, required: true },
  today: { type: String, required: true },
})

const fatDelta = computed(() => deltaView(props.summary.deltas.fat, 1))
const muscleDelta = computed(() => deltaView(props.summary.deltas.muscle, 1))
const rawWord = computed(() => (props.last.weighedOn === props.today ? 'hari ini' : 'terakhir'))
const goal = computed(() => props.summary.weightGoal)
const scale = computed(() => (goal.value && props.summary.weight != null ? rangeScale(goal.value.min, goal.value.max, props.summary.weight) : null))

const note = computed(() => {
  const g = goal.value
  if (!g) return { cls: 'okn', text: `${rawWord.value} ${fmt(props.last.weight, 2)}` }
  const range = `${fmt(g.min, 0)}–${fmt(g.max, 0)}`
  if (g.mode === 'keep') return g.inRange ? { cls: 'ok', text: `aman di kisaran ${range}` } : { cls: 'warn', text: `di luar kisaran ${range}` }
  if (g.state === 'in') return { cls: 'ok', text: '✓ udah masuk kisaran' }
  if (g.state === 'below') return { cls: 'warn', text: `di bawah kisaran ${range}` }
  if (g.state === 'above') return { cls: 'warn', text: `di atas kisaran ${range}` }
  return { cls: 'okn', text: `kurang ${fmt(g.left, 1)} kg ke ${fmt(g.goal, 0)}` }
})
</script>
