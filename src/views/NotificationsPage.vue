<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page" :class="wide ? 'pc' : 'narrow'">
        <PageHeader eyebrow="Notifikasi" back-to="/tabs/home" back-label="Kembali">Notifikasi.<br v-if="!wide" /><span>{{ subtitle }}</span></PageHeader>

        <div v-if="!wide" class="actions rise" style="--i: 2">
          <button class="chipbtn" data-test="read-all" :disabled="!notifications.unread || busy" @click="readAll">
            <PhChecks :size="16" />Tandai semua dibaca
          </button>
          <button class="chipbtn" data-test="settings" @click="ionRouter.push('/tabs/notifikasi/atur')">
            <PhSlidersHorizontal :size="16" />Atur notifikasi
          </button>
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <div :class="{ cols: wide }">
          <div class="list-col">
            <div v-if="notifications.loaded && !notifications.items.length" class="shell rise" style="--i: 3">
              <div class="core empty" data-test="empty">
                <div class="art">🔔</div>
                <b>Belum ada notif.</b>
                <p>Nanti tagihan yang mau jatuh tempo, to-do, agenda, dan login baru bakal nongol di sini. Santai dulu 😌</p>
              </div>
            </div>

            <template v-for="(group, gi) in groups" :key="group.label">
              <div class="group-label rise" :style="{ '--i': 3 + gi }">{{ group.label }}<small v-if="wide">{{ group.items.length }}</small></div>
              <div class="shell rise" :style="{ '--i': 3 + gi }">
                <div class="core list">
                  <button v-for="n in group.items" :key="n.id" class="notif" :class="{ unread: !n.read }" data-test="notif" @click="open(n)">
                    <span v-if="!n.read" class="udot" />
                    <span class="em" :style="{ background: look(n.type).tint }">{{ look(n.type).emoji }}</span>
                    <span class="body">
                      <span class="row1"><span class="t">{{ n.title }}</span><span class="time">{{ timeLabel(n.createdAt) }}</span></span>
                      <span class="msg">{{ n.body }}</span>
                    </span>
                    <PhCaretRight v-if="wide" class="go" :size="16" />
                  </button>
                </div>
              </div>
            </template>
          </div>

          <aside v-if="wide" class="side-col" data-test="side">
            <div class="shell rise" style="--i: 2">
              <div class="sum" data-test="sum">
                <div class="k">{{ notifications.unread ? 'Belum dibaca' : 'Kotak notif' }}</div>
                <div class="v"><template v-if="notifications.unread">{{ notifications.unread }} <span>notif baru</span></template><template v-else>Beres 🎉</template></div>
                <div class="facts"><span class="fact">{{ notifications.items.length ? `dari ${notifications.items.length} notif` : 'Belum ada notif' }}</span></div>
                <button class="readall" data-test="sum-read-all" :disabled="!notifications.unread || busy" @click="readAll">
                  Tandai semua dibaca <span class="ic"><PhChecks :size="18" weight="bold" /></span>
                </button>
              </div>
            </div>
            <div class="rise" style="--i: 3">
              <div class="group-label side-label">Atur notifikasi<small>berlaku buat akun lo</small></div>
              <div class="shell"><NotificationSettingsList /></div>
              <p class="hint">Notif di layar HP (kayak WhatsApp) nyusul. iPhone/iPad: app harus dibuka dari Home Screen.</p>
            </div>
          </aside>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { IonContent, IonPage, onIonViewWillEnter, useIonRouter } from '@ionic/vue'
import { PhCaretRight, PhChecks, PhSlidersHorizontal } from '@phosphor-icons/vue'
import NotificationSettingsList from '@/components/NotificationSettingsList.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useMedia } from '@/lib/media.js'
import { dayGroup, timeLabel } from '@/lib/notifTime.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { useNotificationsStore } from '@/stores/notifications.js'

const ionRouter = useIonRouter()
const notifications = useNotificationsStore()
const error = ref('')
const busy = ref(false)
/** Mac / iPad landscape: dua kolom (daftar kiri, ringkasan + saklar kanan). */
const wide = useMedia('(min-width: 1100px)')

/** Emoji + tint per jenis notif (pastel, sesuai mockup). */
const LOOKS = {
  tagihan: { emoji: '🧾', tint: '#E4F7C4' },
  todo: { emoji: '✅', tint: '#DCEBFF' },
  agenda: { emoji: '📅', tint: '#F3E1FF' },
  keamanan: { emoji: '🔐', tint: '#FFE0E6' },
}
const look = (type) => LOOKS[type] ?? { emoji: '🔔', tint: '#ECEBE6' }

const subtitle = computed(() => {
  if (!notifications.loaded) return 'Bentar ya…'
  if (!notifications.items.length) return 'Masih sepi.'
  return notifications.unread ? `${notifications.unread} belum dibaca` : 'Semua udah dibaca'
})

const ORDER = ['Hari ini', 'Kemarin', 'Minggu ini', 'Lebih lama']
const groups = computed(() =>
  ORDER.map((label) => ({ label, items: notifications.items.filter((n) => dayGroup(n.createdAt) === label) })).filter((g) => g.items.length),
)

onIonViewWillEnter(async () => {
  try {
    await notifications.load()
    error.value = ''
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
})

// Tap dobel (sering di iPhone) jangan buka halaman tujuan dua kali.
let lastOpen = 0
function open(n) {
  if (Date.now() - lastOpen < 800) return
  lastOpen = Date.now()
  notifications.markRead(n.id).catch(() => {})
  if (n.link) ionRouter.push(n.link)
}

async function readAll() {
  busy.value = true
  try {
    await notifications.markAllRead()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.narrow { max-width: 620px; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; margin: -6px 0 6px; }
.chipbtn { display: inline-flex; align-items: center; gap: 7px; height: 38px; padding: 0 14px 0 12px; border: 0; border-radius: 99px; background: var(--card); color: var(--text);
  box-shadow: 0 0 0 1px var(--hair); font: 600 13px var(--ion-font-family); cursor: pointer; transition: transform .4s var(--spring); }
.chipbtn:active { transform: scale(.96); background: var(--soft); }
.chipbtn:disabled { opacity: .45; pointer-events: none; }
.error { color: var(--red); font-size: 13px; font-weight: 600; margin: 10px 6px 0; }
.group-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 22px 8px 10px; }
.list { padding: 6px; }
.notif { position: relative; display: flex; gap: 14px; width: 100%; padding: 12px 12px 12px 14px; border: 0; border-radius: 20px; background: transparent; color: var(--text);
  font: inherit; text-align: left; cursor: pointer; transition: background-color .3s var(--spring); }
.notif + .notif { margin-top: 2px; }
.notif:active { background: var(--soft); }
.notif.unread { background: color-mix(in srgb, var(--lime) 9%, transparent); }
.udot { position: absolute; left: 5px; top: 50%; width: 6px; height: 6px; margin-top: -3px; border-radius: 9px; background: var(--lime); box-shadow: 0 0 0 2px rgba(200, 240, 74, .3); }
.em { width: 42px; height: 42px; border-radius: 14px; display: grid; place-items: center; font-size: 20px; flex-shrink: 0; }
.body { flex: 1; min-width: 0; }
.row1 { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
.t { font-weight: 600; font-size: 14.5px; }
.notif.unread .t { font-weight: 700; }
.time { font-size: 11.5px; color: var(--muted); white-space: nowrap; }
.msg { display: block; font-size: 13px; color: var(--muted); margin-top: 3px; line-height: 1.45; }
.empty { text-align: center; padding: 46px 24px 40px; }
.empty .art { width: 92px; height: 92px; margin: 0 auto 18px; border-radius: 30px; background: var(--card); box-shadow: 0 0 0 1px var(--hair), var(--lift);
  display: grid; place-items: center; font-size: 42px; position: relative; animation: float 4s var(--spring) infinite alternate; }
.empty .art::after { content: ''; position: absolute; right: 10px; top: 10px; width: 14px; height: 14px; border-radius: 99px; background: var(--lime); box-shadow: 0 0 0 4px rgba(200, 240, 74, .25); }
@keyframes float { to { transform: translateY(-6px) rotate(-4deg); } }
.empty b { display: block; font-size: 18px; letter-spacing: -0.02em; }
.empty p { color: var(--muted); font-size: 13.5px; margin: 6px auto 0; max-width: 300px; line-height: 1.5; }

/* Layar lebar (≥1100px): dua kolom kayak Profil. */
.pc { max-width: none; padding-left: 48px; padding-right: 48px; padding-bottom: 60px; }
.pc :deep(.h1 span) { margin-left: .2em; }
.cols { display: grid; grid-template-columns: minmax(0, 8fr) minmax(320px, 4fr); gap: 28px; align-items: start; }
.pc .group-label { display: flex; justify-content: space-between; align-items: center; margin: 0 10px 10px; }
.pc .group-label small { font-size: 12px; letter-spacing: .02em; text-transform: none; color: var(--text); font-weight: 700; }
.pc .shell + .group-label { margin-top: 22px; }
.pc .empty { padding: 64px 24px 60px; }
.pc .empty p { max-width: 360px; }
.pc .notif { align-items: center; padding: 13px 16px 13px 18px; }
.pc .notif:hover { background: var(--soft); }
.pc .notif.unread:hover { background: color-mix(in srgb, var(--lime) 16%, transparent); }
.pc .em { width: 44px; height: 44px; }
.pc .t { font-size: 15px; }
.go { flex-shrink: 0; color: var(--muted); opacity: 0; transition: opacity .2s, transform .3s var(--spring); }
.notif:hover .go { opacity: 1; transform: translateX(2px); }
.side-col { display: flex; flex-direction: column; gap: 24px; position: sticky; top: 24px; }
.sum { position: relative; overflow: hidden; padding: 24px 24px 22px; border-radius: 25px; background: #141410; color: #F3F2EE; }
.sum::before { content: ''; position: absolute; right: -80px; top: -150px; width: 360px; height: 360px; border-radius: 99px; background: radial-gradient(circle, rgba(200, 240, 74, .2), transparent 65%); }
.sum > * { position: relative; }
.sum .k { font-size: 12px; font-weight: 600; color: rgba(243, 242, 238, .6); }
.sum .v { font-size: 44px; font-weight: 800; letter-spacing: -0.045em; line-height: 1.05; margin-top: 6px; }
.sum .v span { font-size: 18px; font-weight: 600; letter-spacing: -0.02em; color: rgba(243, 242, 238, .6); }
.sum .facts { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
.sum .fact { padding: 6px 11px; border-radius: 99px; background: rgba(243, 242, 238, .08); font-size: 12px; font-weight: 600; color: rgba(243, 242, 238, .75); }
.readall { display: flex; align-items: center; justify-content: space-between; width: 100%; height: 50px; margin-top: 18px; padding: 6px 6px 6px 18px; border: 0; border-radius: 99px;
  background: var(--lime); color: var(--lime-ink); font: 700 14.5px var(--ion-font-family); cursor: pointer; transition: transform .4s var(--spring); }
.readall:active { transform: scale(.98); }
.readall .ic { width: 38px; height: 38px; border-radius: 99px; display: grid; place-items: center; background: rgba(28, 36, 0, .1); }
.readall:disabled { background: rgba(243, 242, 238, .1); color: rgba(243, 242, 238, .5); cursor: default; }
.readall:disabled .ic { background: transparent; }
.side-label { margin-top: 0; }
.side-col :deep(.sub) { text-wrap: pretty; }
.side-col .hint { color: var(--muted); font-size: 12.5px; margin: 10px 10px 0; line-height: 1.45; }
</style>
