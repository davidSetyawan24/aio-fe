<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page">
        <div class="toprow">
          <button type="button" class="gy-back" data-test="back" @click="goBack"><PhCaretLeft :size="18" weight="bold" />Gym</button>
        </div>
        <h1 class="h1">Detail sesi.</h1>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { IonContent, IonPage, useIonRouter } from '@ionic/vue'
import { PhCaretLeft } from '@phosphor-icons/vue'

// Sementara: isinya diganti task berikutnya.
const ionRouter = useIonRouter()
const goBack = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate('/tabs/menu/gym', 'back', 'replace'))
</script>

<style scoped>
.gy-back { display: inline-flex; align-items: center; gap: 2px; height: 44px; margin-left: -6px; padding: 0 8px 0 6px; border: 0; background: none; color: var(--muted); font: 700 14.5px var(--ion-font-family); cursor: pointer; }
</style>
