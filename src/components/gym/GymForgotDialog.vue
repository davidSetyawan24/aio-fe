<template>
  <!-- Ke dalem ion-app (bukan body): popup Ionic dipasang di ion-app, kalau di body ketutup scrim. `defer`: dialog ini sendiri anak ion-app, jadi targetnya baru ada abis dipasang. -->
  <Teleport defer to="ion-app">
    <div class="gy-scrim" :class="{ show: open }" />
    <div class="gy-sheet" :class="{ show: open, dialog: wide }" data-test="forgot-dialog" role="alertdialog" aria-modal="true" aria-labelledby="gy-forgot-title" :aria-hidden="String(!open)">
      <div class="gy-handle" />
      <div v-if="info" class="gy-forgot">
        <div class="em">⏱️</div>
        <template v-if="info.sets">
          <h2 id="gy-forgot-title">Sesi {{ label }} masih jalan dari {{ wibTime(info.startedAt) }} — udah selesai?</h2>
          <p data-test="last">Set terakhir dicentang jam {{ wibTime(info.lastAt) }}.</p>
          <form novalidate @submit.prevent="done">
            <label class="gy-nf" :class="{ bad: err }">
              <span class="lb">Jam selesai · usulan: set terakhir + 5 menit</span>
              <input v-model="time" type="time" data-test="forgot-time" :disabled="store.finishing" />
            </label>
            <p v-if="err" class="gy-ferr" data-test="forgot-err">{{ err }}</p>
            <button type="submit" class="gy-save" data-test="forgot-done" :disabled="store.finishing">Selesai <span><PhCheck :size="20" weight="bold" /></span></button>
          </form>
        </template>
        <template v-else>
          <h2 id="gy-forgot-title">Sesi {{ label }} dari {{ wibTime(info.startedAt) }} belum ada set yang dicentang — buang aja?</h2>
          <button type="button" class="gy-save red" data-test="forgot-discard" :disabled="store.finishing" @click="discard">Buang sesi <span><PhTrash :size="20" /></span></button>
        </template>
        <button type="button" class="gy-ghost" style="margin-top: 10px" data-test="forgot-keep" :disabled="store.finishing" @click="keep">Lanjut sesi</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { PhCheck, PhTrash } from '@phosphor-icons/vue'
import { ApiError } from '@/lib/api.js'
import { PROGRAM_LABEL, wibDate, wibTime } from '@/lib/gym.js'
import { wibIso } from '@/lib/gymReport.js'
import { useMedia } from '@/lib/media.js'
import { showToast } from '@/lib/personalForm.js'
import { useAuthStore } from '@/stores/auth.js'
import { useGymStore } from '@/stores/gym.js'
import { useHomeStore } from '@/stores/home.js'
import './gym.css'
import './gymReport.css'

/** Dialog global "lupa pencet Selesai" (dipasang di App): sesi diem > 60 menit → tanya jam selesainya. HP = sheet, ≥768px = dialog. */
const store = useGymStore()
const auth = useAuthStore()
const home = useHomeStore()
const router = useRouter()
const wide = useMedia('(min-width: 768px)')

const GYM = '/tabs/menu/gym'
const info = ref(null)
const time = ref('')
const err = ref('')
const open = computed(() => !!store.forgot)
const label = computed(() => PROGRAM_LABEL[info.value?.program] ?? '')
const hhmm = (iso) => wibTime(iso).replace('.', ':')

// Isi dialog nempel sampe animasi tutup selesai; jam diisi ulang tiap pertanyaan baru.
watch(
  () => store.forgot,
  (f) => {
    if (!f) return
    info.value = f
    time.value = hhmm(f.suggest)
    err.value = ''
  },
  { immediate: true },
)

function check() {
  if (auth.status === 'authed') store.checkForgot().catch(() => {})
}
watch(() => auth.status, check, { immediate: true })
function onVisible() {
  if (document.visibilityState === 'visible') check()
}
onMounted(() => document.addEventListener('visibilitychange', onVisible))
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))

function forgetHomeCard() {
  if (home.data) home.data.gym = null
}

async function done() {
  const f = info.value
  if (!f || store.finishing) return
  // Jam nggak disentuh → kirim usulan persis (detik ikut); diganti → tanggal WIB usulan + jam pilihan.
  const endedAt = time.value === hhmm(f.suggest) ? f.suggest : wibIso(wibDate(f.suggest), time.value)
  if (!endedAt) {
    err.value = 'Jam selesainya diisi dulu.'
    return
  }
  err.value = ''
  try {
    const report = await store.finish(endedAt)
    forgetHomeCard()
    showToast(`Sesi ${label.value} kesimpen · selesai ${wibTime(report.session.endedAt)}`)
    router.push(`${GYM}/selesai/${report.session.id}`)
  } catch (e) {
    if (e instanceof ApiError && e.status === 422 && e.fields?.endedAt) {
      const m = e.fields.endedAt
      err.value = String(Array.isArray(m) ? m[0] : m)
    } else showToast(e?.message || 'Sesinya belum keselesaiin. Coba lagi.')
  }
}

async function discard() {
  if (store.finishing) return
  try {
    await store.discard()
    forgetHomeCard()
    showToast('Sesi dibuang')
  } catch (e) {
    showToast(e?.message || 'Sesinya belum kebuang. Coba lagi.')
  }
}

function keep() {
  store.snoozeForgot()
  router.push(`${GYM}/sesi`)
}
</script>

<style scoped>
.gy-forgot { text-align: center; }
.gy-forgot .em { width: 68px; height: 68px; border-radius: 22px; margin: 6px auto 12px; display: grid; place-items: center; font-size: 34px; background: var(--soft); }
.gy-forgot h2 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.25; }
.gy-forgot p { margin: 6px 0 0; color: var(--muted); font-size: 13.5px; font-weight: 600; line-height: 1.45; }
.gy-forgot form { text-align: left; }
.gy-forgot .gy-nf { margin-top: 16px; }
.gy-forgot .gy-nf input { font-size: 26px; min-height: 40px; }
.gy-forgot .gy-ferr { margin-top: 6px; text-align: left; color: var(--red); }
.gy-forgot .gy-save.red { background: var(--red); color: #fff; }
.gy-forgot .gy-ghost { height: 56px; }
</style>
