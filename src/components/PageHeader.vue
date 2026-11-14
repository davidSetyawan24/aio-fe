<template>
  <header class="page-head">
    <button v-if="backTo" class="back" @click="goBack"><PhCaretLeft :size="18" weight="bold" />{{ backLabel }}</button>
    <div class="head-top">
      <span class="eyebrow rise"><span class="dot" />{{ eyebrow }}</span>
      <NotifBell v-if="bell" class="rise" />
    </div>
    <h1 class="h1 rise" style="--i: 1"><slot /></h1>
  </header>
</template>

<script setup>
import { useIonRouter } from '@ionic/vue'
import { PhCaretLeft } from '@phosphor-icons/vue'
import NotifBell from './NotifBell.vue'

const props = defineProps({
  eyebrow: { type: String, required: true },
  backTo: { type: String, default: '' },
  backLabel: { type: String, default: 'Semua menu' },
  /** Lonceng notif di pojok kanan atas — cuma halaman utama (akar tiap tab). */
  bell: { type: Boolean, default: false },
})
const ionRouter = useIonRouter()
const goBack = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate(props.backTo, 'back', 'replace'))
</script>

<style scoped>
.head-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 28px; }
.back { display: flex; align-items: center; gap: 4px; width: fit-content; margin: 0 0 12px -6px; padding: 6px 12px 6px 6px; border: 0; border-radius: 99px;
  background: transparent; color: var(--muted); font: 600 14px var(--ion-font-family); cursor: pointer; }
.back:active { background: var(--soft); }
</style>
