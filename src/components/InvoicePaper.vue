<template>
  <div ref="root" class="paper" :class="fit">
    <div class="card" :class="{ tap }">
      <InvoiceSheet ref="sheet" :invoice="invoice" :style="{ zoom }" />
    </div>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import InvoiceSheet from './InvoiceSheet.vue'

/**
 * Kertas invoice yang diskalakan biar muat. fit 'width' = muat lebar wadah; 'desk' = meja abu-abu, muat lebar DAN tinggi
 * (tinggi meja diatur halaman lewat `--paper-h`). Isi kertas tetep 794px, cuma di-zoom.
 */
const props = defineProps({
  invoice: { type: Object, required: true },
  fit: { type: String, default: 'width', validator: (v) => v === 'width' || v === 'desk' },
  tap: { type: Boolean, default: false },
})

const root = ref(null)
const sheet = ref(null)
const zoom = ref(1)
let observer = null

function measure() {
  const el = root.value
  const paper = sheet.value?.$el
  if (!el || !paper) return
  paper.style.zoom = 1
  const naturalH = paper.offsetHeight || 1123
  let z
  if (props.fit === 'desk') {
    z = Math.min((el.clientWidth - 48) / 794, (el.clientHeight - 48) / naturalH)
  } else {
    z = el.clientWidth / 794
  }
  zoom.value = Number.isFinite(z) && z > 0 ? z : 1
  paper.style.zoom = zoom.value
}

onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => measure())
    observer.observe(root.value)
  }
  document.fonts?.ready?.then(measure)
})
onBeforeUnmount(() => observer?.disconnect())
// Isi kertas berubah (item nambah) → tingginya ikut berubah.
watch(() => props.invoice, () => nextTick(measure), { deep: true })
</script>

<style scoped>
.paper { width: 100%; }
.card { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 0 0 1px var(--hair), 0 1px 2px rgba(0, 0, 0, .05), 0 30px 60px -34px rgba(0, 0, 0, .35); flex: none; }
.card.tap { cursor: zoom-in; }
.paper.width .card { width: 100%; }
.paper.desk { background: var(--shell); box-shadow: 0 0 0 1px var(--hair); border-radius: 30px; padding: 24px; display: flex; justify-content: center; align-items: flex-start; height: var(--paper-h, calc(100vh - 104px)); box-sizing: border-box; overflow: auto; }
</style>
