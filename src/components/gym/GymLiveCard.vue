<template>
  <button type="button" class="gy-livecard rise" data-test="livecard" @click="$emit('go')">
    <span class="em">{{ PROGRAM_EMOJI[program] }}</span>
    <span class="grow"><b>Sesi {{ PROGRAM_LABEL[program] }} lagi jalan</b><small><i class="dot" /><span data-test="clock">{{ clock }}</span> · {{ sets }} set</small></span>
    <span class="gobtn">Lanjut <PhCaretRight :size="16" weight="bold" /></span>
  </button>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { PhCaretRight } from '@phosphor-icons/vue'
import { PROGRAM_EMOJI, PROGRAM_LABEL, clockText } from '@/lib/gym.js'
import './gym.css'

/** Kartu hitam "Sesi X lagi jalan" (halaman Gym & Beranda): durasi jalan tiap detik. */
const props = defineProps({
  program: { type: String, required: true },
  startedAt: { type: String, required: true },
  sets: { type: Number, default: 0 },
})
defineEmits(['go'])

const now = ref(Date.now())
let timer = null
onMounted(() => {
  now.value = Date.now()
  timer = setInterval(() => (now.value = Date.now()), 1000)
})
onBeforeUnmount(() => clearInterval(timer))

const clock = computed(() => clockText((now.value - new Date(props.startedAt).getTime()) / 1000))
</script>
