<template>
  <!-- Ke dalem ion-app (bukan body): popup Ionic (konfirmasi Hapus) dipasang di ion-app, kalau panel di body konfirmasinya ketutup scrim. -->
  <Teleport to="ion-app">
    <div class="pp-scrim" :class="{ show: open }" @click="requestClose" />
    <aside class="pp-panel p-page" :class="{ show: open }" data-test="panel" role="dialog" aria-modal="true" :aria-hidden="String(!open)">
      <div class="pp-head">
        <span class="eyebrow"><span class="dot" />Data Pribadi</span>
        <button type="button" class="pp-x" aria-label="Tutup" @click="requestClose"><PhX :size="18" weight="bold" /></button>
      </div>
      <template v-if="open">
        <PersonalDocDetail v-if="view === 'doc'" ref="child" :key="`${formKey}d${id}`" :doc-id="id" @edit="$emit('edit')" @done="(m, n) => $emit('done', m, n)" />
        <PersonalDocForm v-else-if="view === 'doc-new' || view === 'doc-edit'" ref="child" :key="`${formKey}f${view}`" :doc-id="view === 'doc-edit' ? id : null" @done="(m, n) => $emit('done', m, n)" />
        <PersonalAddressForm v-else-if="view === 'addr-new' || view === 'addr-edit'" ref="child" :key="`${formKey}a${view}`" :address-id="view === 'addr-edit' ? id : null" @done="(m, n) => $emit('done', m, n)" />
        <PersonalBioForm v-else-if="view === 'bio'" ref="child" :key="`${formKey}b`" @done="(m, n) => $emit('done', m, n)" />
      </template>
    </aside>
  </Teleport>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { PhX } from '@phosphor-icons/vue'
import PersonalAddressForm from '@/components/PersonalAddressForm.vue'
import PersonalBioForm from '@/components/PersonalBioForm.vue'
import PersonalDocDetail from '@/components/PersonalDocDetail.vue'
import PersonalDocForm from '@/components/PersonalDocForm.vue'

/** Panel geser dari kanan (PC) buat detail dokumen & form Data Pribadi. view: doc | doc-new | doc-edit | addr-new | addr-edit | bio. */
const props = defineProps({
  open: { type: Boolean, default: false },
  view: { type: String, default: 'doc' },
  id: { type: [Number, String], default: null },
  /** Naikin tiap buka biar isinya mulai dari awal. */
  formKey: { type: Number, default: 0 },
})
const emit = defineEmits(['close', 'edit', 'done'])
const child = ref(null)

/** Tutup — kecuali lagi nyimpen / hapus: ditutup di tengah jalan, hasilnya nggak nyampe. */
function requestClose() {
  if (child.value?.busy) return
  emit('close')
}

// Esc nutup panel — kecuali ada konfirmasi Ionic (mis. "Hapus?") di atasnya: Esc-nya buat batalin itu aja.
const onKey = (e) => {
  if (e.key !== 'Escape' || !props.open) return
  if (document.querySelector('ion-action-sheet, ion-alert')) return
  requestClose()
}
document.addEventListener('keydown', onKey)
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<!-- Di-teleport ke ion-app → style-nya global (diawali pp-, nggak bentrok). -->
<style>
.pp-scrim { position: fixed; inset: 0; z-index: 40; background: rgba(0, 0, 0, .35); opacity: 0; pointer-events: none; transition: opacity .4s var(--spring); }
.pp-scrim.show { opacity: 1; pointer-events: auto; }
.pp-panel { position: fixed; top: 0; right: 0; bottom: 0; z-index: 41; width: min(520px, 100vw); overflow-y: auto; padding: 30px 32px 40px;
  background: var(--app-bg); color: var(--text); font-family: var(--ion-font-family); box-shadow: -24px 0 60px -30px rgba(0, 0, 0, .6);
  transform: translateX(105%); visibility: hidden; transition: transform .5s var(--spring), visibility 0s .5s; }
.pp-panel.show { transform: none; visibility: visible; transition: transform .5s var(--spring), visibility 0s; }
.pp-head { display: flex; justify-content: space-between; align-items: center; }
.pp-x { width: 40px; height: 40px; border-radius: 99px; border: 0; background: var(--soft); color: var(--text); display: grid; place-items: center; cursor: pointer; }
.pp-panel .pf-title:first-child, .pp-panel .pf-head:first-child { margin-top: 8px; }
</style>
