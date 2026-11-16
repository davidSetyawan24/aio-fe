<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page form-page" :class="{ wide }">
        <PageHeader :back-to="backTo" :back-label="isEdit ? 'Batal' : 'Invoice'" :eyebrow="isEdit ? 'Ubah invoice' : 'Invoice baru'">
          {{ number || 'Invoice' }}<span>{{ isEdit ? 'abis disimpen, PDF-nya ikut baru' : 'nomornya jalan sendiri' }}</span>
        </PageHeader>

        <p v-if="loadError" class="err" role="alert" data-test="load-error">{{ loadError }}</p>

        <div v-if="notFound" class="shell rise" data-test="notfound">
          <div class="core empty">
            <div class="big">📄</div>
            <b>Invoice-nya nggak ketemu.</b>
            <button class="pill" data-test="notfound-back" @click="ionRouter.navigate(BASE, 'back', 'replace')">Balik ke Invoice</button>
          </div>
        </div>

        <template v-else-if="ready">
          <LaptopNote />
          <InvoiceForm :invoice="editing" :from="source" @number="number = $event" @saved="onSaved" />
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { IonContent, IonPage, onIonViewWillEnter, onIonViewWillLeave, toastController, useIonRouter } from '@ionic/vue'
import { useRoute } from 'vue-router'
import InvoiceForm from '@/components/InvoiceForm.vue'
import LaptopNote from '@/components/LaptopNote.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useMedia } from '@/lib/media.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { useInvoicesStore } from '@/stores/invoices.js'

const BASE = '/tabs/menu/invoice'
const HIDE_TABS = 'aio-no-tabbar'
const route = useRoute()
const ionRouter = useIonRouter()
const store = useInvoicesStore()
const wide = useMedia('(min-width: 1100px)')

// Dibaca SEKALI (halaman Ionic ketumpuk tetep hidup; route global bisa pindah ke :id lain).
const pageId = route.params.id ?? null
const fromId = route.query.dari ?? null
const isEdit = Boolean(pageId)
const backTo = isEdit ? `${BASE}/${pageId}` : BASE

const ready = ref(false)
const notFound = ref(false)
const loadError = ref('')
const number = ref('')
const editing = ref(null)
const source = ref(null)

const showToast = async (message) => (await toastController.create({ message, duration: 2200, position: 'top', cssClass: 'aio-toast' })).present()

// Tab bar HP disembunyiin di halaman ini (bar Total kaca yang nempel di bawah).
const hideTabs = (on) => document.body.classList.toggle(HIDE_TABS, on)
onBeforeUnmount(() => hideTabs(false))
onIonViewWillLeave(() => hideTabs(false))

onIonViewWillEnter(async () => {
  hideTabs(true)
  if (ready.value) return
  try {
    await Promise.all([store.loadSettings(), store.load().catch(() => {})])
    loadError.value = ''
  } catch (err) {
    loadError.value = apiErrorMessage(err)
    return
  }
  if (!store.settings.complete) {
    ionRouter.navigate(`${BASE}/atur?lanjut=baru`, 'forward', 'replace')
    return
  }
  if (isEdit) {
    editing.value = store.byId(pageId) ?? null
    if (!editing.value) {
      notFound.value = true
      return
    }
  } else if (fromId) {
    source.value = store.byId(fromId) ?? null
  }
  ready.value = true
})

async function onSaved(saved) {
  const message = isEdit ? 'Kesimpen, PDF-nya udah ikut baru ✓' : 'Invoice jadi ✓'
  ionRouter.navigate(`${BASE}/${saved.id}`, 'forward', 'replace')
  showToast(message)
}
</script>

<style scoped>
.form-page { padding-bottom: 130px; }
.form-page:not(.wide) { max-width: 620px; }
.err { color: var(--red); font-size: 12.5px; font-weight: 600; margin: 6px 6px 0; }
.empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 36px 18px; text-align: center; }
.big { font-size: 38px; }
@media (min-width: 1100px) {
  .form-page { padding-bottom: 48px; }
}
</style>
