<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page narrow">
        <PageHeader eyebrow="Notifikasi" back-to="/tabs/notifikasi" back-label="Notifikasi">Atur notifikasi.<br /><span>Pilih yang mau lo terima.</span></PageHeader>

        <div class="group-label rise" style="--i: 2">Device ini</div>
        <div class="shell rise" style="--i: 2">
          <div class="core list">
            <div class="setting" data-test="push">
              <span class="em" style="background: #DCEBFF"><PhBellRinging :size="21" /></span>
              <span class="grow">
                <span class="title">Notif di layar HP <span class="soon">Segera</span></span>
                <span class="sub">Kayak notif WhatsApp, walau app lagi ditutup. iPhone/iPad: app harus dibuka dari Home Screen.</span>
              </span>
              <button class="toggle" role="switch" aria-checked="false" aria-label="Notif di layar HP" data-test="toggle-push" disabled />
            </div>
          </div>
        </div>

        <div class="group-label rise" style="--i: 3">Yang dikabarin</div>
        <div class="shell rise" style="--i: 3">
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
        </div>
        <p class="hint rise" style="--i: 4">Isi & jadwal tiap notif nyusul pas fiturnya (Tagihan, To-do, Agenda) jadi. Pilihan di sini berlaku buat akun lo.</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { IonContent, IonPage, toastController } from '@ionic/vue'
import { PhBellRinging } from '@phosphor-icons/vue'
import PageHeader from '@/components/PageHeader.vue'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { useNotificationsStore } from '@/stores/notifications.js'

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
.narrow { max-width: 620px; }
.group-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 22px 8px 10px; }
.list { padding: 0; }
.setting { display: flex; align-items: center; gap: 14px; padding: 12px 14px 12px 12px; }
.setting + .setting { box-shadow: inset 0 1px 0 var(--hair); }
.em { width: 42px; height: 42px; border-radius: 14px; display: grid; place-items: center; font-size: 20px; flex-shrink: 0; color: #141410; }
.grow { flex: 1; min-width: 0; }
.title { display: block; font-weight: 600; font-size: 15px; }
.sub { display: block; font-size: 12.5px; color: var(--muted); margin-top: 2px; line-height: 1.4; }
.soon { display: inline-block; margin-left: 4px; padding: 2px 7px; border-radius: 99px; background: var(--soft); color: var(--muted); font-size: 10.5px; font-weight: 700; vertical-align: 2px; }
/* Saklar: nyala = hitam (--ink), bukan lime (lime maks 1–2 titik per layar). */
.toggle { position: relative; width: 52px; height: 32px; flex-shrink: 0; border-radius: 99px; border: 0; background: var(--soft); cursor: pointer; transition: background-color .35s var(--spring); }
.toggle::after { content: ''; position: absolute; left: 3px; top: 3px; width: 26px; height: 26px; border-radius: 99px; background: #fff; box-shadow: 0 2px 6px rgba(0, 0, 0, .18);
  transition: transform .45s var(--spring); }
.toggle.on { background: var(--ink); }
.toggle.on::after { transform: translateX(20px); background: var(--app-bg); box-shadow: 0 2px 6px rgba(0, 0, 0, .25); }
.toggle:disabled { opacity: .5; cursor: default; }
.loading { color: var(--muted); font-size: 13px; margin: 0; padding: 16px; }
.hint { color: var(--muted); font-size: 12.5px; margin: 12px 6px 0; line-height: 1.45; }
</style>
