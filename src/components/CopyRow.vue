<template>
  <div class="p-crow" data-test="copy-row" @click="doCopy">
    <div class="p-grow">
      <div class="k">{{ label }}</div>
      <div class="v" :class="{ num: /\d{6,}/.test(value) }">{{ displayNumber(value) }}</div>
    </div>
    <button type="button" class="p-cbtn" :class="{ ok: copiedKey === 'me' }" :aria-label="`Salin ${label}`">
      <PhCheck v-if="copiedKey === 'me'" :size="17" weight="bold" />
      <PhCopy v-else :size="17" />
    </button>
  </div>
</template>

<script setup>
import { PhCheck, PhCopy } from '@phosphor-icons/vue'
import { copyValue, displayNumber } from '@/lib/personal.js'
import { useCopy } from '@/lib/useCopy.js'

/** Satu baris isi yang bisa disalin: tap di mana aja = kesalin. */
const props = defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  /** Salin persis seperti tampilan (mis. tanggal lahir "24-07-1997"), jangan dibersihin jadi angka doang. */
  verbatim: { type: Boolean, default: false },
})
const { copiedKey, copy } = useCopy()
const doCopy = () => copy('me', props.label, props.verbatim ? props.value : copyValue(props.value))
</script>

<style scoped>
.p-crow { display: flex; align-items: center; gap: 10px; padding: 11px 8px 11px 16px; cursor: pointer; }
.p-crow + .p-crow { border-top: 1px solid var(--hair); }
.p-grow { flex: 1; min-width: 0; }
.k { font-size: 11.5px; font-weight: 700; color: var(--muted); }
.v { font-size: 15.5px; font-weight: 700; margin-top: 1px; word-break: break-word; }
.v.num { font-variant-numeric: tabular-nums; letter-spacing: .01em; }
.p-cbtn { flex-shrink: 0; width: 38px; height: 38px; border: 0; border-radius: 12px; background: var(--soft); display: grid; place-items: center; cursor: pointer; color: var(--text); transition: transform .2s var(--spring), background .2s; }
.p-cbtn:active { transform: scale(.92); }
.p-cbtn.ok { background: var(--lime); color: #141410; }
@media (hover: hover) { .p-crow:hover { background: var(--soft); } }
</style>
