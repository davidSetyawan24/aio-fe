<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page narrow">
        <template v-if="device">
          <PageHeader eyebrow="Device" back-to="/tabs/profil" back-label="Profil">
            <b class="name">{{ title }}</b>.<br /><span>{{ seen }}</span>
          </PageHeader>

          <form class="rise" :class="{ shake }" style="--i: 2" @submit.prevent="save">
            <div class="shell">
              <div class="core name-card">
                <label class="field">
                  <PhPencilSimple :size="19" class="lead" />
                  <ion-input
                    v-model="draft"
                    class="input"
                    aria-label="Nama device"
                    :placeholder="device.kind"
                    :maxlength="40"
                    autocapitalize="sentences"
                    enterkeyhint="done"
                    @keydown.enter.prevent="save"
                  />
                </label>
              </div>
            </div>
            <p class="hint">Nama ini nempel ke device-nya, tetep kepake walau logout-login lagi. Kosongin = balik ke "{{ device.kind }}".</p>
            <p v-if="error" class="error" role="alert">{{ error }}</p>
            <button type="submit" class="pill save" data-test="save" :disabled="!changed || saving">
              Simpan nama
              <span class="ic"><span v-if="saving" class="spin" /><PhCheck v-else :size="16" weight="bold" /></span>
            </button>
          </form>

          <div class="group-label rise" style="--i: 3">Info</div>
          <div class="shell rise" style="--i: 3">
            <div class="core info">
              <div v-for="row in info" :key="row.label" class="info-row"><span>{{ row.label }}</span><b>{{ row.value }}</b></div>
            </div>
          </div>

          <button v-if="!device.current" class="pill ghost kill rise" style="--i: 4" data-test="kill" :disabled="killing" @click="confirmKill">
            Keluarin device ini <span class="ic"><PhPower :size="18" weight="bold" /></span>
          </button>
          <p v-else class="hint rise" style="--i: 4" data-test="self-note">
            Ini device yang lagi lo pegang. Buat keluar dari sini, pakai tombol <b>Keluar</b> di Profil.
          </p>
        </template>

        <template v-else-if="ready">
          <PageHeader eyebrow="Device" back-to="/tabs/profil" back-label="Profil">Device nggak ketemu.<br /><span>Mungkin udah ke-logout.</span></PageHeader>
          <p class="hint" data-test="missing">Device nggak ketemu. Balik ke Profil buat lihat daftar terbaru.</p>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { actionSheetController, IonContent, IonInput, IonPage, toastController, useIonRouter } from '@ionic/vue'
import { useRoute } from 'vue-router'
import { PhCheck, PhPencilSimple, PhPower } from '@phosphor-icons/vue'
import PageHeader from '@/components/PageHeader.vue'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { activeLabel, formatDay } from '@/lib/relativeTime.js'
import { displayName, useDevicesStore } from '@/stores/devices.js'

const route = useRoute()
const ionRouter = useIonRouter()
const devices = useDevicesStore()

const ready = ref(devices.loaded)
// Id dibaca SEKALI pas halaman dibikin: Ionic nyimpen halaman ketumpuk tetep hidup, sementara route global bisa
// pindah ke halaman lain yang juga punya :id (mis. menu/kartu/1).
const pageId = route.params.id
const device = computed(() => devices.byId(pageId))
const title = computed(() => displayName(device.value))
const seen = computed(() => activeLabel(device.value.lastUsedAt, new Date(), device.value.current))
const info = computed(() => [
  { label: 'Jenis', value: device.value.kind },
  { label: 'Browser', value: device.value.browser },
  { label: 'Login sejak', value: formatDay(device.value.createdAt) },
  { label: 'Terakhir aktif', value: seen.value },
])

/*
 * Kolom nama: pola sama kayak Ganti password. Layout SENGAJA nggak berubah pas kolom fokus (Safari iOS yang geser),
 * Enter/"done" = simpan (dicegat biar nggak submit dobel).
 */
const draft = ref('')
const error = ref('')
const shake = ref(false)
const saving = ref(false)
const killing = ref(false)
watch(device, (d) => (draft.value = d?.name ?? ''), { immediate: true })
const changed = computed(() => draft.value.trim() !== (device.value?.name ?? ''))

onMounted(async () => {
  if (devices.loaded) return
  try {
    await devices.load()
  } finally {
    ready.value = true
  }
})

function doShake() {
  shake.value = false
  requestAnimationFrame(() => {
    shake.value = true
    setTimeout(() => (shake.value = false), 500)
  })
}

const showToast = async (message) => (await toastController.create({ message, duration: 2500, position: 'top', cssClass: 'aio-toast' })).present()

async function save() {
  if (!changed.value || saving.value) return
  saving.value = true
  error.value = ''
  try {
    await devices.rename(device.value.id, draft.value.trim())
    await showToast('Nama device disimpan.')
  } catch (err) {
    error.value = apiErrorMessage(err)
    doShake()
  } finally {
    saving.value = false
  }
}

async function confirmKill() {
  const name = title.value
  const sheet = await actionSheetController.create({
    header: `Keluarin ${name}?`,
    subHeader: 'Device itu harus login ulang kalau mau masuk lagi.',
    buttons: [
      { text: 'Keluarin', role: 'destructive', data: 'kill' },
      { text: 'Batal', role: 'cancel' },
    ],
  })
  await sheet.present()
  const { data } = await sheet.onDidDismiss()
  if (data !== 'kill') return
  killing.value = true
  try {
    await devices.kill(device.value.id)
  } catch (err) {
    killing.value = false
    error.value = apiErrorMessage(err)
    return
  }
  if (ionRouter.canGoBack()) ionRouter.back()
  else ionRouter.navigate('/tabs/profil', 'back', 'replace')
  await showToast(`${name} udah ke-logout.`)
}
</script>

<style scoped>
.narrow { max-width: 620px; }
.name-card { padding: 0; }
.name { color: var(--text); font-weight: 800; }
.field { display: flex; align-items: center; gap: 12px; padding: 0 18px; height: 58px; color: var(--muted); transition: color .3s var(--spring); }
.field:focus-within { color: var(--text); }
.lead { flex-shrink: 0; }
.input { flex: 1; min-width: 0; min-height: 0; --background: transparent; --color: var(--text); --placeholder-color: var(--muted); --placeholder-opacity: 1;
  --padding-start: 0; --padding-end: 0; --padding-top: 0; --padding-bottom: 0; --highlight-height: 0; font: 500 16px var(--ion-font-family); }
.hint { color: var(--muted); font-size: 12.5px; margin: 10px 6px 0; line-height: 1.45; }
.error { color: var(--red); font-size: 13px; font-weight: 600; margin: 8px 6px 0; }
.save { margin-top: 16px; width: 100%; justify-content: space-between; height: 58px; padding: 8px 8px 8px 22px; font-size: 16px; }
.save .ic { width: 42px; height: 42px; }
.save:disabled { opacity: .4; }
.group-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 26px 8px 10px; }
.info { padding: 6px 18px; }
.info-row { display: flex; justify-content: space-between; gap: 12px; padding: 12px 0; font-size: 14px; }
.info-row + .info-row { box-shadow: inset 0 1px 0 var(--hair); }
.info-row span { color: var(--muted); }
.info-row b { font-weight: 600; text-align: right; }
.kill { margin-top: 26px; width: 100%; justify-content: space-between; height: 58px; padding: 8px 8px 8px 22px; font-size: 16px; }
.kill .ic { width: 42px; height: 42px; background: rgba(240, 83, 61, 0.14); color: var(--red); }
.spin { width: 16px; height: 16px; border-radius: 99px; border: 2.5px solid rgba(28, 36, 0, .25); border-top-color: var(--lime-ink); animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.shake { animation: sh .45s; }
@keyframes sh { 20%, 60% { translate: -8px 0; } 40%, 80% { translate: 8px 0; } }
</style>
