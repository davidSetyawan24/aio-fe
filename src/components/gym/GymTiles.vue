<template>
  <div class="gy-tiles" data-test="tiles">
    <button
      v-for="(p, i) in programs" :key="p.key" type="button" class="gy-tile rise" :style="{ '--i': i, '--t': PROGRAM_TINT[p.key] }"
      :data-pick="p.key" :disabled="disabled" @click="$emit('pick', p.key)"
    >
      <span class="em">{{ PROGRAM_EMOJI[p.key] }}</span>
      <span class="grow"><b>{{ PROGRAM_LABEL[p.key] }}</b><small>{{ p.exerciseIds.length }} gerakan · {{ p.lastOn ? `terakhir ${agoText(p.lastOn, today)}` : 'belum pernah' }}</small></span>
      <span class="go"><PhCaretRight :size="18" weight="bold" /></span>
    </button>
  </div>
</template>

<script setup>
import { PhCaretRight } from '@phosphor-icons/vue'
import { PROGRAM_EMOJI, PROGRAM_LABEL, PROGRAM_TINT, agoText } from '@/lib/gym.js'
import './gym.css'

/** 5 tombol latihan. `disabled` = ada sesi yang lagi jalan. */
defineProps({
  programs: { type: Array, required: true },
  today: { type: String, required: true },
  disabled: { type: Boolean, default: false },
})
defineEmits(['pick'])
</script>
