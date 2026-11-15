<template>
  <!-- Ke dalem ion-app (bukan body): ion-app bikin tumpukan z-index sendiri, popup Ionic (konfirmasi Hapus) dipasang di situ.
       Kalau panel di body, konfirmasinya ketutup scrim panel & nggak bisa dipencet. -->
  <Teleport to="ion-app">
    <div class="cat-scrim" :class="{ show: open }" @click="$emit('close')" />
    <aside class="cat-panel" :class="{ show: open }" data-test="panel" role="dialog" aria-modal="true" :aria-hidden="String(!open)">
      <div class="panel-head">
        <span class="eyebrow"><span class="dot" />Kategori</span>
        <button class="x" aria-label="Tutup" @click="$emit('close')"><PhX :size="18" weight="bold" /></button>
      </div>
      <h2 class="panel-h1">
        <template v-if="categoryId"><b>{{ categories.byId(categoryId)?.name ?? 'Kategori' }}</b>.<br /><span>Ubah kategori</span></template>
        <template v-else>Kategori baru.<br /><span>Nama, emoji, warna</span></template>
      </h2>
      <CategoryForm v-if="open" :key="formKey" :category-id="categoryId" :for-catat="forCatat" @done="$emit('done', $event)" />
    </aside>
  </Teleport>
</template>

<script setup>
import { onBeforeUnmount } from 'vue'
import { PhX } from '@phosphor-icons/vue'
import CategoryForm from '@/components/CategoryForm.vue'
import { useCategoriesStore } from '@/stores/categories.js'

/** Panel geser dari kanan (PC) buat bikin / ubah kategori — dipakai halaman Kategori & form Catat di Duit. */
const props = defineProps({
  open: { type: Boolean, default: false },
  /** null = kategori baru. */
  categoryId: { type: [Number, String], default: null },
  /** Naikin tiap buka biar form-nya mulai dari awal. */
  formKey: { type: Number, default: 0 },
  /** Dibuka dari "+ Baru" di form Catat → kategori barunya dioper balik ke sana. */
  forCatat: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'done'])
const categories = useCategoriesStore()

// Esc nutup panel — kecuali lagi ada konfirmasi Ionic (mis. "Hapus?") di atasnya: Esc-nya buat batalin itu aja.
const onKey = (e) => {
  if (e.key !== 'Escape' || !props.open) return
  if (document.querySelector('ion-action-sheet, ion-alert')) return
  emit('close')
}
document.addEventListener('keydown', onKey)
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<!-- Di-teleport ke ion-app → style-nya global (diawali cat-, nggak bentrok). -->
<style>
.cat-scrim { position: fixed; inset: 0; z-index: 40; background: rgba(0, 0, 0, .35); opacity: 0; pointer-events: none; transition: opacity .4s var(--spring); }
.cat-scrim.show { opacity: 1; pointer-events: auto; }
.cat-panel { position: fixed; top: 0; right: 0; bottom: 0; z-index: 41; width: min(520px, 100vw); overflow-y: auto; padding: 30px 32px 40px;
  background: var(--app-bg); color: var(--text); font-family: var(--ion-font-family); box-shadow: -24px 0 60px -30px rgba(0, 0, 0, .6);
  transform: translateX(105%); visibility: hidden; transition: transform .5s var(--spring), visibility 0s .5s; }
.cat-panel.show { transform: none; visibility: visible; transition: transform .5s var(--spring), visibility 0s; }
.cat-panel .panel-head { display: flex; justify-content: space-between; align-items: center; }
.cat-panel .x { width: 40px; height: 40px; border-radius: 99px; border: 0; background: var(--soft); color: var(--text); display: grid; place-items: center; cursor: pointer; }
.cat-panel .panel-h1 { margin: 14px 0 18px; font-size: 34px; font-weight: 800; letter-spacing: -0.04em; line-height: 1.05; }
.cat-panel .panel-h1 span { color: var(--muted); font-weight: 600; }
</style>
