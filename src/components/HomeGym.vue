<template>
  <div v-if="info" class="h-gym" data-test="home-gym">
    <GymLiveCard :program="info.program" :started-at="info.startedAt" :sets="info.sets" @go="go" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useIonRouter } from '@ionic/vue'
import GymLiveCard from '@/components/gym/GymLiveCard.vue'
import { useGymStore } from '@/stores/gym.js'

/** Kartu "Sesi X lagi jalan" paling atas Beranda: dari `GET /home` (`active`), atau draf di HP ini (pas offline). */
const props = defineProps({ active: { type: Object, default: null } })
const store = useGymStore()
const ionRouter = useIonRouter()

// Buka draf dari HP (tanpa jaringan) biar kartunya nongol walau Beranda belum kebuka dari server.
store.restore()

const info = computed(() => {
  const l = store.live
  if (l) return { program: l.program, startedAt: l.startedAt, sets: l.items.reduce((n, it) => n + it.rows.filter((r) => r.done).length, 0) }
  const a = props.active
  return a ? { program: a.program, startedAt: a.startedAt, sets: a.sets } : null
})

const go = () => ionRouter.push('/tabs/menu/gym/sesi')
</script>

<style scoped>
.h-gym { margin-top: 12px; }
</style>
