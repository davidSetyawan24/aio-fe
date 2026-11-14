<template>
  <button class="bell" data-test="bell" :aria-label="label" @click="ionRouter.push('/tabs/notifikasi')">
    <PhBell :size="21" />
    <span v-if="text" :key="text" class="badge">{{ text }}</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useIonRouter } from '@ionic/vue'
import { PhBell } from '@phosphor-icons/vue'
import { badgeText } from '@/lib/notifTime.js'
import { useNotificationsStore } from '@/stores/notifications.js'

const ionRouter = useIonRouter()
const notifications = useNotificationsStore()
const text = computed(() => badgeText(notifications.unread))
const label = computed(() => (notifications.unread ? `Notifikasi, ${notifications.unread} belum dibaca` : 'Notifikasi'))
</script>

<style scoped>
.bell { position: relative; width: 44px; height: 44px; flex-shrink: 0; border-radius: 99px; border: 0; background: var(--card); color: var(--text);
  box-shadow: 0 0 0 1px var(--hair), var(--lift); display: grid; place-items: center; cursor: pointer; transition: transform .45s var(--spring); }
.bell:active { transform: scale(.92); }
.badge { position: absolute; top: -4px; right: -6px; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 99px; background: var(--red); color: #fff;
  font-size: 11px; font-weight: 800; display: grid; place-items: center; box-shadow: 0 0 0 2.5px var(--app-bg); font-variant-numeric: tabular-nums;
  animation: pop .5s var(--spring); }
@keyframes pop { from { transform: scale(.4); } }
</style>
