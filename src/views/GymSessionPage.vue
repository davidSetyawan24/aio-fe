<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div v-if="!wide" class="page gy-page">
        <div class="gy-toprow">
          <button type="button" class="gy-back" data-test="back" @click="back"><PhCaretLeft :size="18" weight="bold" />{{ editing ? 'Detail' : 'Riwayat' }}</button>
        </div>
        <span class="eyebrow rise"><span class="dot" />Gym</span>
        <h1 class="h1 rise" style="--i: 1">
          <template v-if="editing">Ubah sesi.</template>
          <template v-else-if="session">{{ PROGRAM_EMOJI[session.program] }} {{ PROGRAM_LABEL[session.program] }}.</template>
          <span v-if="session">{{ dateLine }}</span>
        </h1>
        <GymSessionView :id="id" :editing="editing" @edit="ionRouter.push(`${RIWAYAT}/${id}/ubah`)" @stop-edit="stopEdit" @deleted="ionRouter.navigate(RIWAYAT, 'back', 'replace')" />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, watch } from 'vue'
import { IonContent, IonPage, useIonRouter } from '@ionic/vue'
import { PhCaretLeft } from '@phosphor-icons/vue'
import { useRoute, useRouter } from 'vue-router'
import GymSessionView from '@/components/gym/GymSessionView.vue'
import '@/components/gym/gym.css'
import '@/components/gym/gymReport.css'
import { PROGRAM_EMOJI, PROGRAM_LABEL } from '@/lib/gym.js'
import { sessionDateLine } from '@/lib/gymReport.js'
import { useMedia } from '@/lib/media.js'
import { useGymStore } from '@/stores/gym.js'

const RIWAYAT = '/tabs/menu/gym/riwayat'
const store = useGymStore()
const ionRouter = useIonRouter()
const route = useRoute()
const router = useRouter()
const wide = useMedia('(min-width: 1100px)')

const id = Number(route.params.id)
const editing = route.path.endsWith('/ubah')
const session = computed(() => store.reports[id]?.session ?? null)
const dateLine = computed(() => (session.value ? sessionDateLine(session.value.startedAt, session.value.endedAt) : ''))

// Layar lebar: detail & ubah tinggal di panel kanan halaman Riwayat.
watch(wide, (w) => w && router.replace({ path: RIWAYAT, query: { sesi: String(id), ...(editing ? { ubah: '1' } : {}) } }), { immediate: true })

const back = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate(editing ? `${RIWAYAT}/${id}` : RIWAYAT, 'back', 'replace'))
const stopEdit = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate(`${RIWAYAT}/${id}`, 'back', 'replace'))
</script>
