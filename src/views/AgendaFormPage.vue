<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page narrow">
        <PageHeader back-to="/tabs/agenda" back-label="Agenda" />
        <p v-if="missing" class="hint">{{ missing }}</p>
        <p v-else-if="!ready" class="hint">Bentar…</p>
        <AgendaForm v-else ref="form" class="rise" style="--i: 1" :initial-kind="kind" :item="item" :date="date" :occurrence="occurrence" @saved="goBack" @deleted="goBack" />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { IonContent, IonPage, onIonViewDidEnter, useIonRouter } from '@ionic/vue'
import AgendaForm from '@/components/AgendaForm.vue'
import PageHeader from '@/components/PageHeader.vue'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { useAgendaStore } from '@/stores/agenda.js'

const route = useRoute()
const ionRouter = useIonRouter()
const store = useAgendaStore()

// Dibaca SEKALI (Ionic nyimpen halaman ketumpuk tetep hidup; route global bisa pindah ke halaman lain).
const id = route.params.id ? Number(route.params.id) : null
const kind = id ? (route.path.includes('/acara/') ? 'event' : 'todo') : route.query.jenis === 'acara' ? 'event' : 'todo'
const date = typeof route.query.tanggal === 'string' ? route.query.tanggal : ''
const occurrence = id && date ? date : null

const item = ref(null)
const ready = ref(!id)
const missing = ref('')
const form = ref(null)

/** To-do diambil dari Agenda yang udah kebuka (nggak ada endpoint satu to-do). */
function findTodo() {
  const rows = [...Object.values(store.days).flatMap((d) => d.todos), ...store.undated]
  return rows.find((t) => t.id === id) ?? null
}

onMounted(async () => {
  if (!id) return
  try {
    if (kind === 'event') item.value = await store.getEvent(id)
    else item.value = findTodo()
    if (!item.value) missing.value = kind === 'event' ? 'Acara nggak ketemu. Mungkin udah dihapus.' : 'To-do nggak ketemu. Mungkin udah dihapus.'
  } catch (err) {
    missing.value = err?.status === 404 ? 'Acara nggak ketemu. Mungkin udah dihapus.' : apiErrorMessage(err)
  } finally {
    ready.value = true
  }
})

// Mac (pointer: fine): langsung fokus ke judul. HP/iPad nggak (biar Safari yang ngatur keyboard).
onIonViewDidEnter(() => {
  if (!id && window.matchMedia?.('(pointer: fine)').matches) form.value?.focusTitle()
})

const goBack = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate('/tabs/agenda', 'back', 'replace'))
</script>

<style scoped>
.narrow { max-width: 620px; padding-bottom: calc(120px + env(safe-area-inset-bottom)); }
@media (min-width: 768px) { .narrow { padding-bottom: 60px; } }
.hint { color: var(--muted); font-size: 13.5px; margin: 12px 6px; }
</style>
