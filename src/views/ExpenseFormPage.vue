<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page narrow">
        <PageHeader back-to="/tabs/menu/duit" back-label="Duit" />

        <p v-if="pageId && ready && !expense" class="hint">Catatan nggak ketemu. Mungkin udah dihapus.</p>
        <ExpenseForm v-if="!pageId || expense" ref="form" class="rise" style="--i: 1" :expense="expense" :autofocus="!pageId" :eyebrow="pageId ? 'Ubah catatan' : 'Catat duit keluar'" @saved="onSaved" @deleted="goBack" />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { IonContent, IonPage, onIonViewDidEnter, onIonViewWillEnter, useIonRouter } from '@ionic/vue'
import { useRoute } from 'vue-router'
import ExpenseForm from '@/components/ExpenseForm.vue'
import PageHeader from '@/components/PageHeader.vue'
import { localToday } from '@/lib/duit.js'
import { useExpensesStore } from '@/stores/expenses.js'

const route = useRoute()
const ionRouter = useIonRouter()
const expenses = useExpensesStore()

// Dibaca SEKALI (Ionic nyimpen halaman ketumpuk tetep hidup; route global bisa pindah ke :id lain).
const pageId = route.params.id
// Catatannya juga dipegang sekali: habis dihapus, store-nya kosong — form jangan sampai ilang sebelum sempat balik.
const expense = ref(pageId ? (expenses.byId(pageId) ?? null) : null)
const ready = ref(!pageId || Boolean(expense.value))
const form = ref(null)

onMounted(async () => {
  if (ready.value) return
  // Dibuka langsung dari link: muat bulan ini dulu buat nyari catatannya.
  try {
    await expenses.loadMonth(localToday().slice(0, 7))
    expense.value = expenses.byId(pageId) ?? null
  } finally {
    ready.value = true
  }
})

// Balik dari form kategori baru → kategori barunya langsung kepilih.
onIonViewWillEnter(() => form.value?.pickJustCreated())
// Pas dipasang, halaman Ionic masih disembunyiin (fokus gagal) → fokus ke nominal begitu halamannya tampil.
// Cuma sekali (pas pertama masuk), biar balik dari form kategori nggak ngelompatin kursor.
let focusedOnce = false
onIonViewDidEnter(() => {
  if (pageId || focusedOnce) return
  focusedOnce = true
  if (!form.value?.$el?.contains(document.activeElement)) form.value?.focusAmount()
})

const goBack = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate('/tabs/menu/duit', 'back', 'replace'))
function onSaved(_expense, again) {
  if (!again) goBack()
}
</script>

<style scoped>
.narrow { max-width: 620px; padding-bottom: calc(120px + env(safe-area-inset-bottom)); }
@media (min-width: 768px) { .narrow { padding-bottom: 60px; } }
.hint { color: var(--muted); font-size: 13.5px; margin: 12px 6px; }
</style>
