<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page narrow">
        <PageHeader :back-to="pageId ? `/tabs/menu/split-bill/${pageId}` : '/tabs/menu/split-bill'" back-label="Split bill" />
        <p v-if="error" class="hint">{{ error }}</p>
        <SplitBillWizard v-else-if="!pageId || bill" class="rise" style="--i: 1" :bill="bill" @saved="onSaved" />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { IonContent, IonPage, onIonViewWillEnter, useIonRouter } from '@ionic/vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import SplitBillWizard from '@/components/SplitBillWizard.vue'
import { useMedia } from '@/lib/media.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { useSplitBillsStore } from '@/stores/splitBills.js'

const route = useRoute()
const ionRouter = useIonRouter()
const store = useSplitBillsStore()

// Dibaca SEKALI (Ionic nyimpen halaman ketumpuk tetep hidup; route global bisa pindah ke :id lain).
const pageId = route.params.id
const bill = ref(pageId ? (store.byId(pageId) ?? null) : null)
const error = ref('')
const wide = useMedia('(min-width: 1100px)')

// Layar lebar: Split bill baru ada di panel kanan halaman daftar.
onIonViewWillEnter(() => {
  if (wide.value && !pageId) ionRouter.navigate('/tabs/menu/split-bill?baru=1', 'back', 'replace')
})

onMounted(async () => {
  if (!pageId) return
  try {
    bill.value = await store.loadOne(pageId)
  } catch (err) {
    if (!bill.value) error.value = apiErrorMessage(err)
  }
})

function onSaved(saved) {
  // Baru → langsung ke hasilnya (halaman form diganti, jadi "back" dari hasil balik ke daftar).
  if (!pageId) return ionRouter.navigate(`/tabs/menu/split-bill/${saved.id}`, 'forward', 'replace')
  if (ionRouter.canGoBack()) ionRouter.back()
  else ionRouter.navigate(`/tabs/menu/split-bill/${pageId}`, 'back', 'replace')
}
</script>

<style scoped>
.narrow { max-width: 620px; padding-bottom: calc(120px + env(safe-area-inset-bottom)); }
@media (min-width: 768px) { .narrow { padding-bottom: 60px; } }
.hint { color: var(--muted); font-size: 13.5px; margin: 12px 6px; }
</style>
