<template>
  <div class="rest" :class="{ done: view.state === 'done' }" data-test="rest" role="timer">
    <div class="ring">
      <svg viewBox="0 0 56 56" aria-hidden="true">
        <circle class="bg" cx="28" cy="28" r="24" />
        <circle v-if="view.state === 'run'" class="fg" cx="28" cy="28" r="24" :stroke-dasharray="C" :stroke-dashoffset="C * (1 - view.ratio)" />
      </svg>
      <span class="ic">{{ view.state === 'run' ? '⏱️' : '💪' }}</span>
    </div>
    <template v-if="view.state === 'run'">
      <div class="rt"><small>Istirahat · {{ timer.name }}</small><b data-test="rest-time">{{ mss(view.left) }}</b></div>
      <button type="button" class="rb" data-test="plus30" @click="$emit('plus30')">+30 dtk</button>
      <button type="button" class="rb main" data-test="skip" @click="$emit('skip')">Lewati</button>
    </template>
    <template v-else>
      <div class="rt"><small>Istirahat beres</small><b>Gas set berikutnya</b><span class="over" data-test="rest-over">lewat {{ mss(view.over) }}</span></div>
      <button type="button" class="rb main" data-test="skip" @click="$emit('skip')">Tutup</button>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { mss, timerView } from '@/lib/gymTimer.js'
import './gymRest.css'

/** Bar timer istirahat (ngambang di bawah): gede biar kebaca dari jauh. `now` dari halaman (epoch ms). */
const props = defineProps({
  timer: { type: Object, required: true },
  now: { type: Number, required: true },
})
defineEmits(['plus30', 'skip'])

const C = 2 * Math.PI * 24
const view = computed(() => timerView(props.timer, props.now))
</script>
