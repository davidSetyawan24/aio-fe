<template>
  <!-- Ke dalem ion-app (bukan body): popup Ionic (konfirmasi Hapus) dipasang di ion-app — kalau panel di body, konfirmasinya ketutup scrim. -->
  <Teleport to="ion-app">
    <div class="br-scrim" :class="{ show: open }" @click="requestClose" />
    <aside class="br-panel" :class="{ show: open }" data-test="panel" role="dialog" aria-modal="true" :aria-hidden="String(!open)">
      <div class="panel-head">
        <span class="eyebrow"><span class="dot" />Bayar Rutin</span>
        <button class="x" data-test="panel-close" aria-label="Tutup" @click="requestClose"><PhX :size="18" weight="bold" /></button>
      </div>
      <h2 class="panel-h1">
        <template v-if="billId"><b>{{ store.billById(billId)?.name ?? 'Bayar rutin' }}</b>.<br /><span>Ubah bayar rutin</span></template>
        <template v-else>Bayar rutin baru.<br /><span>Nominal, jadwal, pengingat</span></template>
      </h2>
      <BayarRutinForm v-if="open" ref="form" :key="formKey" :bill-id="billId" @done="$emit('done', $event)" />
    </aside>
  </Teleport>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { PhX } from '@phosphor-icons/vue'
import BayarRutinForm from '@/components/BayarRutinForm.vue'
import { useBayarRutinStore } from '@/stores/bayarRutin.js'

/** Panel geser dari kanan (PC ≥1100px) buat bikin / ubah Bayar Rutin. */
const props = defineProps({
  open: { type: Boolean, default: false },
  /** null = baru. */
  billId: { type: [Number, String], default: null },
  /** Naikin tiap buka biar form-nya mulai dari awal. */
  formKey: { type: Number, default: 0 },
})
const emit = defineEmits(['close', 'done'])
const store = useBayarRutinStore()
const form = ref(null)

/** Tutup — kecuali form lagi nyimpen/hapus (hasilnya biar nyampe). */
function requestClose() {
  if (form.value?.busy) return
  emit('close')
}

// Esc nutup panel — kecuali ada konfirmasi Ionic di atasnya (Esc-nya buat batalin itu aja).
const onKey = (e) => {
  if (e.key !== 'Escape' || !props.open) return
  // Konfirmasi Ionic / daftar "Dibayar dari mana?" di atasnya: Esc-nya buat nutup itu aja.
  if (document.querySelector('ion-action-sheet, ion-alert, .br-src-sheet.show')) return
  requestClose()
}
document.addEventListener('keydown', onKey)
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<!-- Di-teleport ke ion-app → style global (diawali br-). -->
<style>
.br-scrim { position: fixed; inset: 0; z-index: 40; background: rgba(0, 0, 0, .35); opacity: 0; pointer-events: none; transition: opacity .4s var(--spring); }
.br-scrim.show { opacity: 1; pointer-events: auto; }
.br-panel { position: fixed; top: 0; right: 0; bottom: 0; z-index: 41; width: min(520px, 100vw); overflow-y: auto; padding: 30px 32px 40px;
  background: var(--app-bg); color: var(--text); font-family: var(--ion-font-family); box-shadow: -24px 0 60px -30px rgba(0, 0, 0, .6);
  transform: translateX(105%); visibility: hidden; transition: transform .5s var(--spring), visibility 0s .5s; }
.br-panel.show { transform: none; visibility: visible; transition: transform .5s var(--spring), visibility 0s; }
.br-panel .panel-head { display: flex; justify-content: space-between; align-items: center; }
.br-panel .x { width: 40px; height: 40px; border-radius: 99px; border: 0; background: var(--soft); color: var(--text); display: grid; place-items: center; cursor: pointer; }
.br-panel .panel-h1 { margin: 14px 0 18px; font-size: 34px; font-weight: 800; letter-spacing: -0.04em; line-height: 1.05; }
.br-panel .panel-h1 span { color: var(--muted); font-weight: 600; }
</style>
