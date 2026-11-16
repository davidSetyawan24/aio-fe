<template>
  <div class="sp">
    <div class="sp-board">
      <canvas
        ref="canvas"
        class="sp-canvas"
        :width="W"
        :height="H"
        data-test="canvas"
        @pointerdown.prevent="down"
        @pointermove.prevent="move"
        @pointerup="up"
        @pointercancel="up"
        @pointerleave="up"
      />
      <span v-if="!hasInk" class="sp-ph">Coret di sini</span>
    </div>
    <div class="sp-row">
      <button type="button" class="sp-btn" data-test="cancel" @click="emit('cancel')">Batal</button>
      <button type="button" class="sp-btn" data-test="clear" :disabled="!hasInk" @click="clear"><PhEraser :size="17" />Hapus</button>
      <button type="button" class="sp-btn on" data-test="use" :disabled="!hasInk" @click="use">Pakai<PhCheck :size="17" weight="bold" /></button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { PhCheck, PhEraser } from '@phosphor-icons/vue'
import { canvasToSignature } from '@/lib/signatureImage.js'

const emit = defineEmits(['use', 'cancel'])

// Kanvas 2× biar tinta tajam; hasil akhir dikecilin ke ≤ 600×200 oleh canvasToSignature.
const W = 1200
const H = 400
const canvas = ref(null)
const hasInk = ref(false)
let drawing = false
let last = null

function point(e) {
  const r = canvas.value.getBoundingClientRect()
  return { x: ((e.clientX - r.left) / (r.width || 1)) * W, y: ((e.clientY - r.top) / (r.height || 1)) * H }
}

function pen() {
  const ctx = canvas.value.getContext('2d')
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#1B2A55'
  ctx.fillStyle = '#1B2A55'
  return ctx
}

function down(e) {
  drawing = true
  last = point(e)
  canvas.value.setPointerCapture?.(e.pointerId)
  const ctx = pen()
  ctx.beginPath()
  ctx.arc(last.x, last.y, 3.5, 0, Math.PI * 2)
  ctx.fill()
  hasInk.value = true
}

function move(e) {
  if (!drawing) return
  const p = point(e)
  const ctx = pen()
  ctx.beginPath()
  ctx.moveTo(last.x, last.y)
  ctx.lineTo(p.x, p.y)
  ctx.stroke()
  last = p
}

function up() {
  drawing = false
  last = null
}

function clear() {
  canvas.value.getContext('2d').clearRect(0, 0, W, H)
  hasInk.value = false
}

function use() {
  const url = hasInk.value ? canvasToSignature(canvas.value) : null
  if (url) emit('use', url)
}
</script>

<style scoped>
.sp-board { position: relative; border-radius: 18px; background: #fff; box-shadow: inset 0 0 0 1.5px var(--hair); overflow: hidden; }
.sp-canvas { display: block; width: 100%; aspect-ratio: 3 / 1; touch-action: none; cursor: crosshair; }
.sp-ph { position: absolute; inset: 0; display: grid; place-items: center; color: #8A8A82; font-weight: 600; font-size: 14px; pointer-events: none; }
.sp-row { display: flex; gap: 8px; margin-top: 12px; }
.sp-btn { flex: 1; height: 46px; border: 0; border-radius: 99px; background: var(--soft); color: var(--text); font: 700 14px var(--ion-font-family); display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; }
.sp-btn.on { background: var(--ink); color: var(--on-ink); }
.sp-btn:disabled { opacity: .45; cursor: default; }
</style>
