<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page narrow">
        <PageHeader back-to="/tabs/menu/split-bill" back-label="Split bill" />
        <p v-if="error" class="hint">{{ error }}</p>
        <SplitBillDetail v-else-if="store.byId(pageId)" :bill-id="pageId" @edit="ionRouter.push(`/tabs/menu/split-bill/${pageId}/ubah`)" @deleted="goBack" />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref } from 'vue'
import { IonContent, IonPage, onIonViewWillEnter, useIonRouter } from '@ionic/vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import SplitBillDetail from '@/components/SplitBillDetail.vue'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { useSplitBillsStore } from '@/stores/splitBills.js'

const route = useRoute()
const ionRouter = useIonRouter()
const store = useSplitBillsStore()

// Dibaca SEKALI (Ionic nyimpen halaman ketumpuk tetep hidup; route global bisa pindah ke :id lain).
const pageId = route.params.id
const error = ref('')
let deleted = false

// Tiap masuk (mis. balik dari Ubah) dimuat ulang biar status lunas & angkanya terbaru.
onIonViewWillEnter(async () => {
  if (deleted) return
  try {
    await store.loadOne(pageId)
    error.value = ''
  } catch (err) {
    if (!store.byId(pageId)) error.value = apiErrorMessage(err)
  }
})

function goBack() {
  deleted = true
  if (ionRouter.canGoBack()) ionRouter.back()
  else ionRouter.navigate('/tabs/menu/split-bill', 'back', 'replace')
}
</script>

<style scoped>
.narrow { max-width: 620px; padding-bottom: calc(120px + env(safe-area-inset-bottom)); }
@media (min-width: 768px) { .narrow { padding-bottom: 60px; } }
.hint { color: var(--muted); font-size: 13.5px; margin: 12px 6px; }
</style>
