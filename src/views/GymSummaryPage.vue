<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page gy-page">
        <div class="gy-toprow">
          <button type="button" class="gy-back" data-test="back" @click="toGym"><PhCaretLeft :size="18" weight="bold" />Gym</button>
        </div>

        <p v-if="failed" class="gy-fail" data-test="failed">Nggak bisa muat ringkasannya. <button type="button" @click="load">Coba lagi</button></p>
        <p v-else-if="!report" class="gy-wait" data-test="wait">Bentar ya…</p>
        <template v-else>
          <GymReport :report="report" mode="summary" />
          <button type="button" class="gy-save gy-bigsave" data-test="back-gym" @click="toGym">Balik ke Gym <span><PhCheck :size="20" weight="bold" /></span></button>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { IonContent, IonPage, useIonRouter } from '@ionic/vue'
import { PhCaretLeft, PhCheck } from '@phosphor-icons/vue'
import { useRoute } from 'vue-router'
import GymReport from '@/components/gym/GymReport.vue'
import '@/components/gym/gym.css'
import '@/components/gym/gymReport.css'
import { useGymStore } from '@/stores/gym.js'

const GYM = '/tabs/menu/gym'
const store = useGymStore()
const ionRouter = useIonRouter()
const route = useRoute()
const id = Number(route.params.id)
const failed = ref(false)

// Report dari halaman sesi (abis Selesai) langsung dipake; kalau nggak ada (buka lewat link / reload) baru diambil.
const report = computed(() => store.reports[id] ?? null)

async function load() {
  failed.value = false
  try {
    await store.report(id)
  } catch {
    failed.value = true
  }
}
load()

const toGym = () => ionRouter.replace(GYM)
</script>

<style scoped>
.gy-bigsave { max-width: 520px; margin-left: auto; margin-right: auto; }
</style>
