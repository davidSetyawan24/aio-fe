<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page">
        <PageHeader :eyebrow="title" :back-to="backTo">{{ title }}.<br /><span>Segera hadir.</span></PageHeader>
        <div class="shell rise" style="--i: 2">
          <div class="core soon">
            <span class="emoji">{{ emoji }}</span>
            <div>
              <div class="title">Fitur {{ title }} lagi dibahas ✨</div>
              <div class="sub">Pondasinya udah siap. Isinya nyusul satu-satu.</div>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { IonContent, IonPage } from '@ionic/vue'
import PageHeader from '@/components/PageHeader.vue'
defineProps({ title: { type: String, required: true }, emoji: { type: String, required: true }, backTo: { type: String, default: '' } })
</script>

<style scoped>
.soon { display: flex; align-items: center; gap: 16px; padding: 22px; }
.emoji { width: 56px; height: 56px; border-radius: 18px; background: var(--soft); display: grid; place-items: center; font-size: 28px; flex-shrink: 0; }
.soon .title { white-space: normal; }
</style>
