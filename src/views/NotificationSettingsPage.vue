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
          <NotificationSettingsList />
        </div>
        <p class="hint rise" style="--i: 4">Jadwal pengingatnya diatur di tiap Bayar Rutin, to-do, & acara. Pilihan di sini berlaku buat akun lo.</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { IonContent, IonPage, onIonViewWillEnter, useIonRouter } from '@ionic/vue'
import { PhBellRinging } from '@phosphor-icons/vue'
import NotificationSettingsList from '@/components/NotificationSettingsList.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useMedia } from '@/lib/media.js'

const ionRouter = useIonRouter()
const wide = useMedia('(min-width: 1100px)')

// Layar lebar: saklarnya udah ada di kolom kanan halaman Notifikasi.
onIonViewWillEnter(() => {
  if (wide.value) ionRouter.navigate('/tabs/notifikasi', 'back', 'replace')
})
</script>

<style scoped>
.narrow { max-width: 620px; }
.group-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 22px 8px 10px; }
.list { padding: 0; }
.setting { display: flex; align-items: center; gap: 14px; padding: 12px 14px 12px 12px; }
.em { width: 42px; height: 42px; border-radius: 14px; display: grid; place-items: center; font-size: 20px; flex-shrink: 0; color: #141410; }
.grow { flex: 1; min-width: 0; }
.title { display: block; font-weight: 600; font-size: 15px; }
.sub { display: block; font-size: 12.5px; color: var(--muted); margin-top: 2px; line-height: 1.4; }
.soon { display: inline-block; margin-left: 4px; padding: 2px 7px; border-radius: 99px; background: var(--soft); color: var(--muted); font-size: 10.5px; font-weight: 700; vertical-align: 2px; }
/* Saklar "Notif di layar HP" (masih mati); saklar lain ada di NotificationSettingsList. */
.toggle { position: relative; width: 52px; height: 32px; flex-shrink: 0; border-radius: 99px; border: 0; background: var(--soft); cursor: pointer; transition: background-color .35s var(--spring); }
.toggle::after { content: ''; position: absolute; left: 3px; top: 3px; width: 26px; height: 26px; border-radius: 99px; background: #fff; box-shadow: 0 2px 6px rgba(0, 0, 0, .18);
  transition: transform .45s var(--spring); }
.toggle:disabled { opacity: .5; cursor: default; }
.hint { color: var(--muted); font-size: 12.5px; margin: 12px 6px 0; line-height: 1.45; }
</style>
