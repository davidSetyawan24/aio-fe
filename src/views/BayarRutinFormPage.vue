<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page narrow">
        <PageHeader eyebrow="Bayar Rutin" back-to="/tabs/menu/bayar-rutin" back-label="Bayar Rutin">
          <template v-if="pageId"><b class="name">{{ store.billById(pageId)?.name ?? 'Bayar rutin' }}</b>.<br /><span>Ubah bayar rutin</span></template>
          <template v-else>Bayar rutin baru.<br /><span>Nominal, jadwal, pengingat</span></template>
        </PageHeader>

        <BayarRutinForm :bill-id="pageId ?? null" @done="onDone" />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { IonContent, IonPage, onIonViewWillEnter, toastController, useIonRouter } from '@ionic/vue'
import { useRoute } from 'vue-router'
import BayarRutinForm from '@/components/BayarRutinForm.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useMedia } from '@/lib/media.js'
import { useBayarRutinStore } from '@/stores/bayarRutin.js'

const route = useRoute()
const ionRouter = useIonRouter()
const store = useBayarRutinStore()
const wide = useMedia('(min-width: 1100px)')

// Dibaca SEKALI pas halaman dibikin (Ionic nyimpen halaman ketumpuk tetep hidup; route global bisa pindah ke :id lain).
const pageId = route.params.id

// Layar lebar: form ada di panel geser halaman Bayar Rutin.
onIonViewWillEnter(() => {
  if (wide.value) ionRouter.navigate('/tabs/menu/bayar-rutin', 'back', 'replace')
})

const goBack = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate('/tabs/menu/bayar-rutin', 'back', 'replace'))

async function onDone(message) {
  goBack()
  await (await toastController.create({ message, duration: 2500, position: 'top', cssClass: 'aio-toast' })).present()
}
</script>

<style scoped>
.narrow { max-width: 620px; padding-bottom: 40px; }
.name { color: var(--text); font-weight: 800; }
</style>
