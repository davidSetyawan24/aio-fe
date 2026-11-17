<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page p-page narrow">
        <PersonalGate>
          <PersonalDocDetail v-if="view === 'doc'" :doc-id="id" @edit="goEdit" @done="onDone">
            <template #back><button type="button" class="pf-back" data-test="back" @click="goBack"><PhCaretLeft :size="18" weight="bold" />Data Pribadi</button></template>
          </PersonalDocDetail>
          <template v-else>
            <button type="button" class="pf-back" data-test="back" @click="goBack"><PhCaretLeft :size="18" weight="bold" />{{ isEdit ? 'Batal' : 'Data Pribadi' }}</button>
            <PersonalDocForm v-if="view === 'doc-new' || view === 'doc-edit'" :doc-id="view === 'doc-edit' ? id : null" @done="onDone" />
            <PersonalAddressForm v-else-if="view === 'addr-new' || view === 'addr-edit'" :address-id="view === 'addr-edit' ? id : null" @done="onDone" />
            <PersonalBioForm v-else-if="view === 'bio'" @done="onDone" />
          </template>
        </PersonalGate>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { provide, ref } from 'vue'
import { IonContent, IonPage, onIonViewDidEnter, onIonViewDidLeave, onIonViewWillEnter, toastController, useIonRouter } from '@ionic/vue'
import { PhCaretLeft } from '@phosphor-icons/vue'
import { useRoute } from 'vue-router'
import PersonalAddressForm from '@/components/PersonalAddressForm.vue'
import PersonalBioForm from '@/components/PersonalBioForm.vue'
import PersonalDocDetail from '@/components/PersonalDocDetail.vue'
import PersonalDocForm from '@/components/PersonalDocForm.vue'
import PersonalGate from '@/components/PersonalGate.vue'
import { useMedia } from '@/lib/media.js'
import { PERSONAL_BASE } from '@/lib/personalLock.js'

/**
 * Satu halaman pembungkus buat semua rute anak Data Pribadi di HP / iPad tegak: detail dokumen & form dokumen / alamat / biodata.
 * Yang mana yang tampil = `route.meta.view`. Di layar lebar (≥1100) semuanya panel di halaman utama, jadi halaman ini cuma ngelempar ke sana.
 */
const route = useRoute()
const ionRouter = useIonRouter()
const wide = useMedia('(min-width: 1100px)')

// Dibaca SEKALI pas halaman dibikin (Ionic nyimpen halaman ketumpuk tetep hidup; route global bisa pindah ke :id lain).
const view = route.meta.view
const id = route.params.id ?? null
const isEdit = view === 'doc-edit' || view === 'addr-edit' || view === 'bio'

// Keyboard layar PIN cuma boleh nangkep pas halaman ini yang keliatan.
const active = ref(true)
provide('pageActive', active)
onIonViewDidEnter(() => (active.value = true))
onIonViewDidLeave(() => (active.value = false))

onIonViewWillEnter(() => {
  if (!wide.value) return
  const query = `panel=${view}${id !== null ? `&id=${id}` : ''}`
  ionRouter.navigate(`${PERSONAL_BASE}?${query}`, 'back', 'replace')
})

const goBack = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate(PERSONAL_BASE, 'back', 'replace'))
const goEdit = () => ionRouter.navigate(`${PERSONAL_BASE}/dokumen/${id}/ubah`, 'forward', 'push')

async function onDone(message, next) {
  // Dokumen baru: langsung ke detailnya (gantiin form, jadi "kembali" balik ke daftar).
  if (view === 'doc-new' && next?.docId) ionRouter.navigate(`${PERSONAL_BASE}/dokumen/${next.docId}`, 'forward', 'replace')
  else goBack()
  try {
    await (await toastController.create({ message, duration: 1800, position: 'top', cssClass: 'aio-toast' })).present()
  } catch {
    // toast gagal tampil bukan urusan penting
  }
}
</script>

<style scoped>
.narrow { max-width: 620px; padding-bottom: 120px; }
</style>
