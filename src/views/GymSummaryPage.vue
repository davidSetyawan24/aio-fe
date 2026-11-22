<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page gy-page">
        <div class="gy-toprow">
          <button type="button" class="gy-back" data-test="back" @click="toGym"><PhCaretLeft :size="18" weight="bold" />Gym</button>
        </div>

        <p v-if="missing" class="gy-fail" data-test="missing">Sesinya udah nggak ada. <button type="button" @click="toGym">Balik ke Gym</button></p>
        <p v-else-if="failed" class="gy-fail" data-test="failed">Nggak bisa muat ringkasannya. <button type="button" @click="load">Coba lagi</button></p>
        <p v-else-if="!report" class="gy-wait" data-test="wait">Bentar ya…</p>
        <template v-else>
          <GymReport :report="report" mode="summary" @talk="talk('gym', id)" />
          <button type="button" class="gy-save gy-bigsave" data-test="back-gym" @click="toGym">Balik ke Gym <span><PhCheck :size="20" weight="bold" /></span></button>
        </template>
      </div>
      <AiChatPanel v-if="aiWide" v-bind="aiPanel" @close="closeAi" />
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { IonContent, IonPage, useIonRouter } from '@ionic/vue'
import { PhCaretLeft, PhCheck } from '@phosphor-icons/vue'
import { useRoute } from 'vue-router'
import AiChatPanel from '@/components/ai/AiChatPanel.vue'
import GymReport from '@/components/gym/GymReport.vue'
import '@/components/gym/gym.css'
import '@/components/gym/gymReport.css'
import { useAiTalk } from '@/lib/aiTalk.js'
import { useGymStore } from '@/stores/gym.js'

const GYM = '/tabs/menu/gym'
const store = useGymStore()
const ionRouter = useIonRouter()
const route = useRoute()
const id = Number(route.params.id)
const { wide: aiWide, panel: aiPanel, talk, close: closeAi } = useAiTalk()
const failed = ref(false)
const missing = ref(false)

// Report dari halaman sesi (abis Selesai) langsung dipake; kalau nggak ada (buka lewat link / reload) baru diambil.
const report = computed(() => store.reports[id] ?? null)

async function load() {
  failed.value = false
  missing.value = false
  try {
    await store.report(id)
  } catch (e) {
    if (e?.status === 404) missing.value = true
    else failed.value = true
  }
}
load()
// Simpenan dibuang (abis ubah / hapus sesi lain) → ambil lagi dari server.
watch(report, (r) => !r && !missing.value && !failed.value && load())

const toGym = () => ionRouter.replace(GYM)
</script>

<style scoped>
.gy-bigsave { max-width: 520px; margin-left: auto; margin-right: auto; }
</style>
