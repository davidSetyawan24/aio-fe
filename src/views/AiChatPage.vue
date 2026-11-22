<template>
  <ion-page>
    <ion-content :fullscreen="true" :scroll-y="false" class="aic-content">
      <div class="aipage">
        <AiChat ref="chat" :context="context" :session-id="sessionId" :conv-id="convId" :back-from="backFrom" @close="back" />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { IonContent, IonPage, onIonViewDidEnter, useIonRouter } from '@ionic/vue'
import { useRoute } from 'vue-router'
import AiChat from '@/components/ai/AiChat.vue'

/** Halaman chat AI di HP (`/tabs/menu/gym/tanya`, `/tabs/menu/badan/tanya`; `?sesi=<id>` / `?obrolan=<id>`). Tab bar disembunyiin. */
const route = useRoute()
const ionRouter = useIonRouter()
const chat = ref(null)
const num = (v) => (v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null)

const context = computed(() => (route.path.includes('/badan/') ? 'badan' : 'gym'))
const sessionId = num(route.query.sesi)
const convId = num(route.query.obrolan)
const backFrom = route.query.dari === 'riwayat' ? 'riwayat' : ''

const back = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate(`/tabs/menu/${context.value}`, 'back', 'replace'))

// Fokus kolom ketik baru jalan abis halaman kelihatan (pas dipasang Ionic masih nyembunyiin).
onIonViewDidEnter(() => chat.value?.focus())
</script>

<style scoped>
.aic-content::part(scroll) { padding-bottom: 0; }
.aipage { height: 100%; display: flex; flex-direction: column; }
</style>
