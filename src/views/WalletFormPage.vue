<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page narrow">
        <PageHeader eyebrow="Kartu & Rekening" back-to="/tabs/menu/kartu" back-label="Kartu & Rekening">
          <template v-if="isEdit"><b class="name">{{ original?.name ?? 'Kartu/rekening' }}</b>.<br /><span>Ubah detail</span></template>
          <template v-else>Tambah baru.<br /><span>Tabungan atau kartu kredit</span></template>
        </PageHeader>

        <WalletForm :source-id="pageId" @done="onDone" />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed } from 'vue'
import { IonContent, IonPage, toastController, useIonRouter } from '@ionic/vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import WalletForm from '@/components/WalletForm.vue'
import { useWalletStore } from '@/stores/wallet.js'

const route = useRoute()
const ionRouter = useIonRouter()
const wallet = useWalletStore()

// Id dibaca SEKALI pas halaman dibikin: Ionic nyimpen halaman ketumpuk tetep hidup, sementara route global bisa
// pindah ke halaman lain yang juga punya :id (mis. profil/device/4) — jangan sampai form ini ikut ganti isi.
const pageId = route.params.id ?? null
const isEdit = computed(() => Boolean(pageId))
const original = computed(() => (pageId ? wallet.byId(pageId) : null))

const showToast = async (message) => (await toastController.create({ message, duration: 2500, position: 'top', cssClass: 'aio-toast' })).present()
const goBack = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate('/tabs/menu/kartu', 'back', 'replace'))
async function onDone(message) {
  goBack()
  await showToast(message)
}
</script>

<style scoped>
.narrow { max-width: 620px; }
.name { color: var(--text); font-weight: 800; }
</style>
