<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page narrow">
        <PageHeader eyebrow="Kategori" :back-to="backTo" :back-label="fromCatat ? 'Catat' : 'Kategori'">
          <template v-if="pageId"><b class="name">{{ original?.name ?? 'Kategori' }}</b>.<br /><span>Ubah kategori</span></template>
          <template v-else>Kategori baru.<br /><span>Nama, emoji, warna</span></template>
        </PageHeader>

        <CategoryForm :category-id="pageId ?? null" :for-catat="fromCatat" @done="onDone" />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed } from 'vue'
import { IonContent, IonPage, onIonViewWillEnter, toastController, useIonRouter } from '@ionic/vue'
import { useRoute } from 'vue-router'
import CategoryForm from '@/components/CategoryForm.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useMedia } from '@/lib/media.js'
import { useCategoriesStore } from '@/stores/categories.js'

const route = useRoute()
const ionRouter = useIonRouter()
const categories = useCategoriesStore()
const wide = useMedia('(min-width: 1100px)')

// Dibaca SEKALI pas halaman dibikin (Ionic nyimpen halaman ketumpuk tetep hidup; route global bisa pindah ke :id lain).
const pageId = route.params.id
const fromCatat = route.query.from === 'catat'
const backTo = fromCatat ? '/tabs/menu/duit/catat' : '/tabs/menu/kategori'
const original = computed(() => (pageId ? categories.byId(pageId) : null))

// Layar lebar: form kategori ada di panel geser halaman Kategori. Dari Catat tetep di sini (balik ke Catat bawa kategori baru).
onIonViewWillEnter(() => {
  if (wide.value && !fromCatat) ionRouter.navigate('/tabs/menu/kategori', 'back', 'replace')
})

const goBack = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate(backTo, 'back', 'replace'))

async function onDone(message) {
  goBack()
  await (await toastController.create({ message, duration: 2500, position: 'top', cssClass: 'aio-toast' })).present()
}
</script>

<style scoped>
.narrow { max-width: 620px; }
.name { color: var(--text); font-weight: 800; }
</style>
