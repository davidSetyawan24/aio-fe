<template>
  <ion-page>
    <ion-content :fullscreen="true" class="c">
      <div class="aurora" aria-hidden="true"><i class="b1" /><i class="b2" /><i class="b3" /><div class="grain" /></div>

      <div class="layout">
        <!-- Panggung: logo + kartu melayang + judul -->
        <section class="stage">
          <div class="orbit">
            <div class="ring r1" /><div class="ring r2" />
            <button v-for="(t, i) in tiles" :key="t.l" class="tile" :class="['t' + i, { on: i === idx }]"
              :style="{ '--d': i * -1.3 + 's', '--bg': t.bg }" @click="idx = i; restart()">
              <span class="em">{{ t.e }}</span><small>{{ t.l }}</small>
            </button>
            <div class="badge"><AioLogo :size="38" variant="light" /></div>
          </div>
          <h1 class="kin">
            <span class="rot"><span v-for="(t, i) in tiles" :key="t.l" :class="{ on: i === idx }">{{ t.l }}.</span></span>
            <span class="rest">Semua di sini.</span>
          </h1>
        </section>

        <!-- Form kaca -->
        <form class="sheet" :class="{ shake, done: success }" @submit.prevent="submit">
          <span class="grab" />
          <div class="hello">Halo lagi, David 👋</div>
          <p class="sub">Semua urusan lo udah nungguin.</p>
          <div class="fields">
            <div class="row"><PhUser :size="19" /><ion-input v-model="username" class="field" aria-label="Username" placeholder="Username" autocapitalize="off" autocomplete="username" :spellcheck="false" enterkeyhint="next" /></div>
            <span class="sep" />
            <div class="row"><PhLock :size="19" /><ion-input v-model="password" class="field" aria-label="Password" :type="show ? 'text' : 'password'" placeholder="Password" autocomplete="current-password" enterkeyhint="go" @keyup.enter="submit" />
              <button type="button" class="eye" :aria-label="show ? 'Sembunyikan password' : 'Lihat password'" @click="show = !show"><component :is="show ? PhEyeSlash : PhEye" :size="19" /></button></div>
          </div>
          <p v-if="error" class="err">{{ error }}</p>
          <button class="go" :disabled="loading || locked > 0">
            <span>{{ success ? 'Selamat datang 👋' : loading ? 'Ngecek…' : locked ? `Tunggu ${locked} detik` : 'Masuk' }}</span>
            <span class="ic"><span v-if="loading" class="spin" /><PhArrowRight v-else :size="18" weight="bold" /></span>
          </button>
          <p class="note"><PhShieldCheck :size="15" /> Sekali masuk, nempel terus sampai lo logout.</p>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonContent, IonInput, IonPage } from '@ionic/vue'
import { PhArrowRight, PhEye, PhEyeSlash, PhLock, PhShieldCheck, PhUser } from '@phosphor-icons/vue'
import AioLogo from '@/components/AioLogo.vue'
import { loginMessage, retryAfterFromMessage } from '@/lib/loginMessage.js'
import { decideNavigation } from '@/router/guard.js'
import { useAuthStore } from '@/stores/auth.js'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const username = ref('')
const password = ref('')
const show = ref(false)
const error = ref('')
const shake = ref(false)
const success = ref(false)
const locked = ref(0)

/*
 * Keyboard HP/iPad: layout SENGAJA nggak diubah pas kolom kefokus. Safari iOS geser halaman sendiri ke kolom
 * yang di-tap (native, mulus). Scroll assist Ionic dimatiin di main.js (tebakan keyboard 290px-nya salah),
 * dan "mode ngetik" yang mindahin form bikin dobel geser → form kelempar keluar layar (bug 14/11).
 */
const loading = computed(() => auth.loggingIn)
let lockTimer

const tiles = [
  { e: '💸', l: 'Duit', bg: '#FFE9D6' },
  { e: '🧾', l: 'Tagihan', bg: '#C8F04A' },
  { e: '✅', l: 'To-do', bg: '#DCEBFF' },
  { e: '📅', l: 'Agenda', bg: '#F3E1FF' },
]
const idx = ref(0)
let rotateTimer
const restart = () => {
  clearInterval(rotateTimer)
  rotateTimer = setInterval(() => (idx.value = (idx.value + 1) % tiles.length), 2000)
}
onMounted(restart)
onUnmounted(() => {
  clearInterval(rotateTimer)
  clearInterval(lockTimer)
})

function doShake() {
  shake.value = false
  requestAnimationFrame(() => {
    shake.value = true
    setTimeout(() => (shake.value = false), 500)
  })
}

function startLock(seconds) {
  locked.value = seconds
  clearInterval(lockTimer)
  lockTimer = setInterval(() => {
    locked.value -= 1
    if (locked.value <= 0) {
      clearInterval(lockTimer)
      error.value = ''
    }
  }, 1000)
}

async function submit() {
  if (loading.value || locked.value > 0) return
  if (!username.value.trim() || !password.value) {
    error.value = 'Username & password wajib diisi.'
    doShake()
    return
  }
  error.value = ''
  try {
    await auth.login(username.value.trim(), password.value)
    success.value = true
    const next = decideNavigation(route, 'authed')
    await router.replace(next === true ? '/tabs/home' : next.path)
  } catch (err) {
    error.value = loginMessage(err)
    if (err?.status === 429) startLock(retryAfterFromMessage(err.message))
    doShake()
  }
}
</script>

<style scoped>
.c { --background: #070807; --color: #F3F2EE; color: #F3F2EE; }
.layout, .kin, .rest, .hello { color: #F3F2EE; }
.c::part(scroll) { padding-bottom: 0; }

/* aurora */
.aurora { position: fixed; inset: 0; overflow: hidden; pointer-events: none; }
.aurora i { position: absolute; border-radius: 50%; filter: blur(60px); will-change: transform; }
.b1 { width: 70vmax; height: 70vmax; left: -25vmax; top: -30vmax; background: radial-gradient(circle, #C8F04A, transparent 60%); opacity: .5; animation: f1 16s ease-in-out infinite alternate; }
.b2 { width: 60vmax; height: 60vmax; right: -25vmax; top: 18vh; background: radial-gradient(circle, #2BA864, transparent 60%); opacity: .38; animation: f2 19s ease-in-out infinite alternate; }
.b3 { width: 50vmax; height: 50vmax; left: 10vw; bottom: -35vmax; background: radial-gradient(circle, #E9FF9A, transparent 60%); opacity: .28; animation: f3 22s ease-in-out infinite alternate; }
@keyframes f1 { to { transform: translate(18vw, 22vh) scale(1.15); } }
@keyframes f2 { to { transform: translate(-22vw, -12vh) scale(.9); } }
@keyframes f3 { to { transform: translate(14vw, -18vh) scale(1.2); } }
.grain { position: absolute; inset: 0; opacity: .07; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }

/* layout */
.layout { position: relative; min-height: 100%; display: flex; flex-direction: column; }
@media (min-width: 900px) { .layout { flex-direction: row; align-items: center; justify-content: space-between; max-width: 1180px; margin: 0 auto; padding: 0 48px; min-height: 100vh; } }

.stage { display: flex; flex-direction: column; align-items: center; padding: calc(env(safe-area-inset-top) + 34px) 22px 0; flex: 1; }
@media (min-width: 900px) { .stage { align-items: flex-start; padding: 0; flex: 0 1 auto; } }

/* orbit */
.orbit { position: relative; width: 270px; height: 270px; flex-shrink: 0; }
@media (min-width: 900px) { .orbit { width: 340px; height: 340px; } }
.ring { position: absolute; inset: 0; margin: auto; border-radius: 50%; border: 1px dashed rgba(255,255,255,.14); }
.r1 { width: 100%; height: 100%; animation: spin 60s linear infinite; } .r2 { width: 62%; height: 62%; animation: spin 40s linear infinite reverse; }
@keyframes spin { to { transform: rotate(360deg); } }
.badge { position: absolute; inset: 0; margin: auto; width: 104px; height: 104px; border-radius: 32px; display: grid; place-items: center; transform: rotate(-6deg);
  background: rgba(20,20,16,.75); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.14), 0 0 0 1px rgba(255,255,255,.08), 0 30px 60px -20px rgba(0,0,0,.7); }
.tile { position: absolute; width: 78px; height: 78px; border: 0; border-radius: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
  background: var(--bg); color: #141410; cursor: pointer; animation: bob 5.2s ease-in-out infinite; animation-delay: var(--d);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.6), 0 18px 36px -18px rgba(0,0,0,.6); opacity: .55; filter: saturate(.6);
  transition: opacity .6s, filter .6s, box-shadow .6s, scale .6s cubic-bezier(.32,.72,0,1); }
.tile .em { font-size: 28px; } .tile small { font: 700 10.5px 'Plus Jakarta Sans', sans-serif; opacity: .7; }
.tile.on { opacity: 1; filter: none; scale: 1.16; box-shadow: inset 0 1px 0 rgba(255,255,255,.6), 0 0 0 3px rgba(200,240,74,.9), 0 20px 50px -10px rgba(200,240,74,.55); z-index: 2; }
.t0 { left: -4px; top: 16px; --r: -10deg; } .t1 { right: -8px; top: -2px; --r: 8deg; } .t2 { left: 8px; bottom: -4px; --r: 6deg; } .t3 { right: 2px; bottom: 22px; --r: -7deg; }
@keyframes bob { 0%, 100% { transform: translateY(0) rotate(var(--r)); } 50% { transform: translateY(-13px) rotate(calc(var(--r) * -0.6)); } }

/* judul */
.kin { font-size: clamp(38px, 11vw, 76px); line-height: .96; font-weight: 800; letter-spacing: -0.055em; margin: 30px 0 0; text-align: center; }
@media (min-width: 900px) { .kin { text-align: left; margin-top: 40px; } }
.rot { display: grid; height: 1em; overflow: hidden; color: #C8F04A; }
.rot span { grid-area: 1 / 1; transform: translateY(105%); opacity: 0; transition: transform .8s cubic-bezier(.32,.72,0,1), opacity .5s; }
.rot span.on { transform: none; opacity: 1; }
.rest { display: block; }

/* form kaca */
.sheet { position: relative; margin-top: 28px; padding: 12px 20px calc(env(safe-area-inset-bottom) + 24px); border-radius: 32px 32px 0 0;
  background: rgba(255,255,255,.07); backdrop-filter: blur(26px) saturate(1.4); -webkit-backdrop-filter: blur(26px) saturate(1.4);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.14), 0 0 0 1px rgba(255,255,255,.07); animation: up 1s cubic-bezier(.32,.72,0,1) both .25s; }
@media (min-width: 900px) { .sheet { margin: 0; width: 420px; border-radius: 32px; padding: 30px; animation: fade 1s cubic-bezier(.32,.72,0,1) both .25s; box-shadow: inset 0 1px 0 rgba(255,255,255,.14), 0 0 0 1px rgba(255,255,255,.08), 0 40px 80px -40px rgba(0,0,0,.9); } .grab { display: none !important; } }
@media (min-width: 600px) and (max-width: 899px) {
  .sheet { width: 100%; max-width: 520px; margin: 28px auto calc(env(safe-area-inset-bottom) + 32px); border-radius: 32px; padding: 26px; }
  .grab { display: none !important; }
  .stage { justify-content: center; }
}
@keyframes up { from { transform: translateY(100%); } }

@keyframes fade { from { opacity: 0; transform: translateY(20px); } }
.sheet.done { transform: scale(.97); transition: transform .6s cubic-bezier(.32,.72,0,1); }
.grab { display: block; width: 42px; height: 5px; border-radius: 9px; background: rgba(255,255,255,.2); margin: 0 auto 16px; }
.hello { font-size: 24px; font-weight: 800; letter-spacing: -0.04em; }
.sub { color: rgba(243,242,238,.55); margin: 4px 0 16px; font-size: 14px; }
.fields { border-radius: 22px; background: rgba(0,0,0,.25); box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); }
.row { display: flex; align-items: center; gap: 12px; padding: 0 8px 0 16px; height: 56px; color: rgba(243,242,238,.5); }
.row:focus-within { color: #C8F04A; }
/* ion-input (bukan <input> biasa): scroll assist Ionic cuma kenal ion-input, biar form geser ke atas keyboard di iOS. */
.field { flex: 1; min-width: 0; min-height: 0; --background: transparent; --color: #F3F2EE; --placeholder-color: #F3F2EE; --placeholder-opacity: .4;
  --padding-start: 0; --padding-end: 0; --padding-top: 0; --padding-bottom: 0; --highlight-height: 0; font: 500 16px 'Plus Jakarta Sans', sans-serif; }
.sep { display: block; height: 1px; background: rgba(255,255,255,.08); margin: 0 16px; }
.eye { width: 40px; height: 40px; border: 0; border-radius: 12px; background: transparent; color: rgba(243,242,238,.5); display: grid; place-items: center; cursor: pointer; }
.err { color: #FF8A73; font-size: 13px; margin: 10px 4px 0; font-weight: 600; }
.go { margin-top: 12px; width: 100%; height: 58px; border: 0; border-radius: 22px; background: #C8F04A; color: #1C2400; display: flex; align-items: center; justify-content: space-between;
  padding: 0 8px 0 22px; font: 700 16px 'Plus Jakarta Sans', sans-serif; cursor: pointer; transition: transform .4s cubic-bezier(.32,.72,0,1); }
.go:active { transform: scale(.97); } .go:disabled { opacity: .7; }
.go .ic { width: 42px; height: 42px; border-radius: 16px; background: #141410; color: #C8F04A; display: grid; place-items: center; }
.spin { width: 16px; height: 16px; border-radius: 99px; border: 2.5px solid rgba(200,240,74,.3); border-top-color: #C8F04A; animation: spin .7s linear infinite; }
.note { display: flex; gap: 7px; align-items: flex-start; color: rgba(243,242,238,.45); font-size: 12px; margin: 14px 2px 0; line-height: 1.4; }
.note svg { flex-shrink: 0; margin-top: 1px; }
.shake { animation: sh .45s; } @keyframes sh { 20%, 60% { translate: -8px 0; } 40%, 80% { translate: 8px 0; } }
</style>
