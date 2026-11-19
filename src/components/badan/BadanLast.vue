<template>
  <div>
    <div class="b-label rise" style="--i: 3"><span>Timbangan terakhir</span><button type="button" class="b-lk" data-test="last-open" @click="$emit('open', last.id)">{{ whenText }} <PhCaretRight :size="14" weight="bold" /></button></div>
    <div class="shell rise" style="--i: 3">
      <div class="b-core b-kv" data-test="last">
        <div v-for="k in KEYS" :key="k">
          <div class="k">{{ METRIC_LABEL[k][0] }}</div>
          <div class="v">{{ fmt(last[k], METRICS[k].dec) }}<small v-if="UNIT[k] && last[k] != null">{{ UNIT[k] }}</small></div>
        </div>
        <div>
          <div class="k">Tipe badan</div>
          <div class="v" style="font-size: 14.5px">
            <template v-if="type">{{ type.label }}<em>{{ type.zepp }} di Zepp</em></template>
            <template v-else>–</template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PhCaretRight } from '@phosphor-icons/vue'
import { BODY_TYPES, METRICS, METRIC_LABEL, UNIT, fmt } from '@/lib/badan.js'
import { dayWord, jam } from '@/lib/badanView.js'
import './badan.css'

const KEYS = ['water', 'bmr', 'visceral', 'bone', 'protein', 'bmi', 'score']
const props = defineProps({ last: { type: Object, required: true }, today: { type: String, required: true } })
defineEmits(['open'])

const type = computed(() => BODY_TYPES.find((t) => t.key === props.last.bodyType) ?? null)
const whenText = computed(() => {
  const w = dayWord(props.last.weighedOn, props.today)
  return `${w.charAt(0).toUpperCase()}${w.slice(1)}, ${jam(props.last.weighedAt)}`
})
</script>
