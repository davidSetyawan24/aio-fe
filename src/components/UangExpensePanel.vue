<template>
  <!-- Ke dalem ion-app (bukan body): popup Ionic (konfirmasi Hapus) dipasang di ion-app — kalau panel di body, konfirmasinya ketutup scrim. -->
  <Teleport to="ion-app">
    <div class="ue-scrim" :class="{ show: open }" @click="requestClose" />
    <aside class="ue-panel" :class="{ show: open }" data-test="panel" role="dialog" aria-modal="true" :aria-hidden="String(!open)">
      <div class="panel-head">
        <span class="eyebrow"><span class="dot" />Uang</span>
        <button class="x" data-test="panel-close" aria-label="Tutup" @click="requestClose"><PhX :size="18" weight="bold" /></button>
      </div>
      <h2 v-if="expense" class="panel-h1"><b>{{ expense.note || expense.category.name }}</b>.<br /><span>Ubah catatan</span></h2>
      <ExpenseForm
        v-if="open && expense"
        ref="form"
        :key="formKey"
        :expense="expense"
        eyebrow="Ubah catatan"
        new-category-inline
        @saved="(e, again) => $emit('saved', e, again)"
        @deleted="$emit('deleted')"
        @new-category="$emit('new-category')"
      />
    </aside>
  </Teleport>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { PhX } from '@phosphor-icons/vue'
import ExpenseForm from '@/components/ExpenseForm.vue'

/** Panel geser dari kanan (PC ≥1100px) buat ubah satu catatan duit dari tab Uang. */
const props = defineProps({
  open: { type: Boolean, default: false },
  expense: { type: Object, default: null },
  /** Naikin tiap buka biar form-nya mulai dari awal. */
  formKey: { type: Number, default: 0 },
})
const emit = defineEmits(['close', 'saved', 'deleted', 'new-category'])
const form = ref(null)

/** Tutup — kecuali form lagi nyimpen/hapus (hasilnya biar nyampe). */
function requestClose() {
  if (form.value?.busy) return
  emit('close')
}

// Esc nutup panel — kecuali ada konfirmasi Ionic di atasnya (Esc-nya buat batalin itu aja).
const onKey = (e) => {
  if (e.key !== 'Escape' || !props.open) return
  if (document.querySelector('ion-action-sheet, ion-alert')) return
  // Sheet "Bayar pakai apa?" kebuka → Esc cuma nutup sheet-nya, panel tetep.
  if (form.value?.sheetOpen) {
    form.value.closeSheet()
    return
  }
  requestClose()
}
document.addEventListener('keydown', onKey)
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))

/** Kategori baru abis dibikin → kepilih di form. */
const pickJustCreated = () => form.value?.pickJustCreated?.()
defineExpose({ pickJustCreated })
</script>

<!-- Di-teleport ke ion-app → style global (diawali ue-). -->
<style>
.ue-scrim { position: fixed; inset: 0; z-index: 40; background: rgba(0, 0, 0, .35); opacity: 0; pointer-events: none; transition: opacity .4s var(--spring); }
.ue-scrim.show { opacity: 1; pointer-events: auto; }
.ue-panel { position: fixed; top: 0; right: 0; bottom: 0; z-index: 41; width: min(520px, 100vw); overflow-y: auto; padding: 30px 32px 40px;
  background: var(--app-bg); color: var(--text); font-family: var(--ion-font-family); box-shadow: -24px 0 60px -30px rgba(0, 0, 0, .6);
  transform: translateX(105%); visibility: hidden; transition: transform .5s var(--spring), visibility 0s .5s; }
.ue-panel.show { transform: none; visibility: visible; transition: transform .5s var(--spring), visibility 0s; }
.ue-panel .panel-head { display: flex; justify-content: space-between; align-items: center; }
.ue-panel .x { width: 40px; height: 40px; border-radius: 99px; border: 0; background: var(--soft); color: var(--text); display: grid; place-items: center; cursor: pointer; }
.ue-panel .panel-h1 { margin: 14px 0 18px; font-size: 34px; font-weight: 800; letter-spacing: -0.04em; line-height: 1.05; }
.ue-panel .panel-h1 span { color: var(--muted); font-weight: 600; }
</style>
