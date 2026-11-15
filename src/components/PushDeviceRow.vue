<template>
  <div class="core push" data-test="push-row">
    <div class="setting">
      <span class="em"><PhBellRinging :size="21" /></span>
      <span class="grow">
        <span class="title">Notif di {{ noun }} ini</span>
        <span class="sub" :class="tone">{{ sub }}</span>
      </span>
      <button v-if="push.state === 'on'" class="toggle on" role="switch" aria-checked="true" :aria-label="`Matiin notif di ${noun} ini`" data-test="push-toggle"
        :disabled="push.busy" @click="turnOff" />
    </div>

    <div v-if="push.state === 'off' || push.state === 'asking'" class="foot">
      <button class="pill" data-test="push-enable" :disabled="push.state === 'asking'" @click="turnOn">
        {{ push.state === 'asking' ? 'Nunggu izin' : 'Nyalain notif' }}
        <span class="ic" :class="{ spin: push.state === 'asking' }"><PhCircleNotch v-if="push.state === 'asking'" :size="16" weight="bold" /><PhBell v-else :size="16" weight="bold" /></span>
      </button>
    </div>

    <div v-else-if="push.state === 'on'" class="foot">
      <button class="link" data-test="push-test" :disabled="push.busy" @click="test">Kirim notif tes <PhCaretRight :size="13" weight="bold" /></button>
    </div>

    <div v-else-if="push.state === 'safari'" class="foot">
      <ol class="steps">
        <li><span>Di Safari, tap <b>Bagikan</b> <PhExport :size="14" /></span></li>
        <li><span>Pilih <b>Tambahkan ke Layar Utama</b></span></li>
        <li><span>Buka AIO dari ikon <b>aio.</b> itu, terus balik ke sini</span></li>
      </ol>
    </div>

    <div v-else-if="push.state === 'blocked'" class="foot">
      <ol v-if="ios" class="steps">
        <li><span>Buka <b>Pengaturan</b> {{ noun }} → <b>Notifikasi</b></span></li>
        <li><span>Cari <b>AIO</b>, nyalain <b>Izinkan Notifikasi</b></span></li>
        <li><span>Balik ke sini, tap <b>Cek lagi</b></span></li>
      </ol>
      <ol v-else class="steps">
        <li><span>Klik <b>ikon gembok</b> di sebelah alamat web</span></li>
        <li><span>Ubah <b>Notifikasi</b> jadi <b>Izinkan</b></span></li>
        <li><span>Balik ke sini, tap <b>Cek lagi</b></span></li>
      </ol>
      <button class="link" data-test="push-recheck" @click="push.recheck()">Cek lagi <PhArrowClockwise :size="13" weight="bold" /></button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { toastController } from '@ionic/vue'
import { PhArrowClockwise, PhBell, PhBellRinging, PhCaretRight, PhCircleNotch, PhExport } from '@phosphor-icons/vue'
import { detectKind } from '@/lib/device.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { deviceNoun } from '@/lib/push.js'
import { usePushStore } from '@/stores/push.js'

/** Baris "Notif di <device> ini" (grup DEVICE INI) — 6 keadaan mockup push-notif.html. Dipakai Atur notifikasi (HP) & kolom kanan Notifikasi (PC). */
const props = defineProps({ kind: { type: String, default: '' } })
const push = usePushStore()
const kind = computed(() => props.kind || detectKind(globalThis.navigator))
const noun = computed(() => deviceNoun(kind.value))
/** iPhone/iPad: izin notif diatur di Pengaturan device; selain itu di pengaturan situs browser. */
const ios = computed(() => kind.value === 'iPhone' || kind.value === 'iPad')

const SUBS = {
  loading: 'Lagi ngecek device ini…',
  off: 'Belum nyala. Pengingat cuma masuk lonceng di dalem app.',
  asking: 'Pilih Allow / Izinkan di jendela yang muncul…',
  on: 'Nyala ✓ · notif nongol walau app ditutup',
  safari: () => `${noun.value === 'iPad' ? 'iPad' : 'iPhone'} cuma ngizinin notif dari AIO yang dibuka lewat ikon di Home Screen.`,
  blocked: () => (ios.value ? `Izinnya keblok di ${noun.value}.` : 'Izinnya keblok di browser ini.'),
  nosupport: 'Browser/iOS di device ini belum bisa notif di layar (iPhone minimal iOS 16.4). Pengingat tetep masuk lonceng.',
  noserver: 'Notif di layar belum disetel di server. Pengingat tetep masuk lonceng.',
}
const sub = computed(() => {
  const s = SUBS[push.state] ?? ''
  return typeof s === 'function' ? s() : s
})
const tone = computed(() => ({ ok: push.state === 'on', bad: push.state === 'blocked' }))

onMounted(() => {
  if (push.state === 'loading') push.init().catch(() => {})
})

const toast = async (message) => (await toastController.create({ message, duration: 2500, position: 'top', cssClass: 'aio-toast' })).present()
async function run(fn, done) {
  try {
    const result = await fn()
    if (result !== false && result !== null) await toast(done)
  } catch (err) {
    await toast(apiErrorMessage(err))
  }
}
const turnOn = () => run(() => push.enable(), `Notif nyala di ${noun.value} ini ✓`)
const turnOff = () => run(() => push.disable(), `Notif di ${noun.value} ini dimatiin`)
const test = () => run(() => push.sendTest(), 'Notif tes terkirim. Cek layar HP lo 👀')
</script>

<style scoped>
.push { padding: 0; }
.setting { display: flex; align-items: center; gap: 14px; padding: 12px 14px 12px 12px; }
.em { width: 42px; height: 42px; border-radius: 14px; display: grid; place-items: center; flex-shrink: 0; background: #DCEBFF; color: #141410; }
.grow { flex: 1; min-width: 0; }
.title { display: block; font-weight: 600; font-size: 15px; }
.sub { display: block; font-size: 12.5px; color: var(--muted); margin-top: 2px; line-height: 1.4; }
.sub.ok { color: var(--green); font-weight: 600; }
.sub.bad { color: var(--red); font-weight: 600; }
/* Saklar: nyala = hitam (--ink), sama kayak NotificationSettingsList. */
.toggle { position: relative; width: 52px; height: 32px; flex-shrink: 0; border-radius: 99px; border: 0; background: var(--soft); cursor: pointer; }
.toggle::after { content: ''; position: absolute; left: 3px; top: 3px; width: 26px; height: 26px; border-radius: 99px; background: #fff; box-shadow: 0 2px 6px rgba(0, 0, 0, .18);
  transition: transform .45s var(--spring); }
.toggle.on { background: var(--ink); }
.toggle.on::after { transform: translateX(20px); }
:root.theme-dark .push .toggle.on::after { background: #0B0B0A; }
.toggle:disabled { opacity: .6; cursor: default; }

.foot { display: flex; flex-direction: column; gap: 10px; padding: 0 14px 14px 68px; }
.pill { align-self: flex-start; display: inline-flex; align-items: center; gap: 10px; padding: 6px 6px 6px 16px; border-radius: 99px; border: 0; background: var(--ink); color: var(--on-ink);
  font: 700 14px var(--ion-font-family); cursor: pointer; transition: transform .3s var(--spring); }
.pill:active:not(:disabled) { transform: scale(.97); }
.pill:disabled { cursor: default; opacity: .85; }
.pill .ic { width: 30px; height: 30px; border-radius: 99px; display: grid; place-items: center; background: var(--lime); color: var(--lime-ink); }
.pill .ic.spin svg { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.steps { margin: 0; padding: 12px 14px; border-radius: 18px; background: var(--soft); list-style: none; counter-reset: s; display: flex; flex-direction: column; gap: 8px; font-size: 12.5px; font-weight: 600; }
.steps li { counter-increment: s; display: flex; gap: 10px; align-items: flex-start; line-height: 1.4; }
.steps li::before { content: counter(s); width: 20px; height: 20px; border-radius: 99px; background: var(--card); display: grid; place-items: center; font-size: 11px; font-weight: 800; flex-shrink: 0; }
.steps b { font-weight: 800; }
.steps svg { vertical-align: -2px; }
.link { align-self: flex-start; display: inline-flex; align-items: center; gap: 4px; border: 0; background: transparent; padding: 0; font: 700 13px var(--ion-font-family); color: var(--text); cursor: pointer; }
.link:disabled { opacity: .5; cursor: default; }
@media (hover: hover) { .link:hover:not(:disabled) { text-decoration: underline; } }
</style>
