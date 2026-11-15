<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page narrow">
        <PageHeader eyebrow="Notifikasi" back-to="/tabs/notifikasi" back-label="Notifikasi">Atur notifikasi.<br /><span>Pilih yang mau lo terima.</span></PageHeader>

        <div class="group-label rise" style="--i: 2">Device ini</div>
        <div class="shell rise" style="--i: 2"><PushDeviceRow /></div>

        <div class="group-label rise" style="--i: 3">Yang dikabarin</div>
        <div class="shell rise" style="--i: 3">
          <NotificationSettingsList />
        </div>
        <p class="hint rise" style="--i: 4">Jadwal pengingatnya diatur di tiap Bayar Rutin, to-do, & acara. Saklar "Yang dikabarin" berlaku buat semua device; notif di layar nyala-matinya per device.</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { IonContent, IonPage, onIonViewWillEnter, useIonRouter } from '@ionic/vue'
import NotificationSettingsList from '@/components/NotificationSettingsList.vue'
import PageHeader from '@/components/PageHeader.vue'
import PushDeviceRow from '@/components/PushDeviceRow.vue'
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
.hint { color: var(--muted); font-size: 12.5px; margin: 12px 6px 0; line-height: 1.45; }
</style>
