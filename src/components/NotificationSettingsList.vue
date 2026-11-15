<template>
  <div class="core list">
    <p v-if="!notifications.settings" class="loading">{{ error || 'Lagi ngambil pengaturan…' }}</p>
    <template v-else>
      <div v-for="k in KINDS" :key="k.key" class="setting">
        <span class="em" :style="{ background: k.tint }">{{ k.emoji }}</span>
        <span class="grow"><span class="title">{{ k.label }}</span><span class="sub">{{ k.sub }}</span></span>
        <button class="toggle" :class="{ on: notifications.settings[k.key] }" role="switch" :aria-checked="String(notifications.settings[k.key])"
          :aria-label="k.label" :data-test="`toggle-${k.key}`" @click="flip(k.key)" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { toastController } from '@ionic/vue'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { useNotificationsStore } from '@/stores/notifications.js'

/** Saklar "Yang dikabarin" — dipakai halaman Atur notifikasi (HP) dan kolom kanan Notifikasi (PC). */
const notifications = useNotificationsStore()
const error = ref('')

const KINDS = [
  { key: 'tagihan', label: 'Tagihan jatuh tempo', sub: 'H-3 dan hari H', emoji: '🧾', tint: '#E4F7C4' },
  { key: 'todo', label: 'To-do', sub: 'Pas tenggatnya hari ini', emoji: '✅', tint: '#DCEBFF' },
  { key: 'agenda', label: 'Agenda', sub: '30 menit sebelum acara', emoji: '📅', tint: '#F3E1FF' },
  { key: 'keamanan', label: 'Keamanan', sub: 'Ada device baru login ke akun lo', emoji: '🔐', tint: '#FFE0E6' },
]

onMounted(async () => {
  try {
    await notifications.loadSettings()
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
})

async function flip(key) {
  try {
    await notifications.saveSetting(key, !notifications.settings[key])
  } catch (err) {
    await (await toastController.create({ message: apiErrorMessage(err), duration: 2500, position: 'top', cssClass: 'aio-toast' })).present()
  }
}
</script>

<style scoped>
.list { padding: 0; }
.setting { display: flex; align-items: center; gap: 14px; padding: 12px 14px 12px 12px; }
.setting + .setting { box-shadow: inset 0 1px 0 var(--hair); }
.em { width: 42px; height: 42px; border-radius: 14px; display: grid; place-items: center; font-size: 20px; flex-shrink: 0; color: #141410; }
.grow { flex: 1; min-width: 0; }
.title { display: block; font-weight: 600; font-size: 15px; }
.sub { display: block; font-size: 12.5px; color: var(--muted); margin-top: 2px; line-height: 1.4; }
/* Saklar: nyala = hitam (--ink), bukan lime (lime maks 1–2 titik per layar). */
.toggle { position: relative; width: 52px; height: 32px; flex-shrink: 0; border-radius: 99px; border: 0; background: var(--soft); cursor: pointer; transition: background-color .35s var(--spring); }
.toggle::after { content: ''; position: absolute; left: 3px; top: 3px; width: 26px; height: 26px; border-radius: 99px; background: #fff; box-shadow: 0 2px 6px rgba(0, 0, 0, .18);
  transition: transform .45s var(--spring); }
.toggle.on { background: var(--ink); }
.toggle.on::after { transform: translateX(20px); background: var(--app-bg); box-shadow: 0 2px 6px rgba(0, 0, 0, .25); }
.loading { color: var(--muted); font-size: 13px; margin: 0; padding: 16px; }
</style>
