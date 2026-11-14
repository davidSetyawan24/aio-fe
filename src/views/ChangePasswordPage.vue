<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page narrow">
        <PageHeader eyebrow="Keamanan" back-to="/tabs/profil" back-label="Profil">Ganti password.<br /><span>Device lain bakal <span class="nowrap">ke-logout.</span></span></PageHeader>

        <form class="rise" :class="{ shake }" style="--i: 2" @submit.prevent="submit">
          <!-- Buat Passwords/Keychain iOS: biar tau password ini punya akun yang mana dan bisa ke-update. -->
          <input class="ghost-user" type="text" name="username" autocomplete="username" :value="auth.user?.username ?? ''" readonly tabindex="-1" aria-hidden="true" />

          <div class="shell">
            <div class="core fields">
              <div v-for="(f, i) in fields" :key="f.key" class="prow">
                <component :is="f.icon" :size="19" class="lead" />
                <ion-input
                  :ref="(c) => (inputEls[i] = c?.$el)"
                  v-model="form[f.key]"
                  class="field"
                  :aria-label="f.label"
                  :placeholder="f.label"
                  :type="show[f.key] ? 'text' : 'password'"
                  :autocomplete="f.autocomplete"
                  autocapitalize="off"
                  :spellcheck="false"
                  :enterkeyhint="i === fields.length - 1 ? 'done' : 'next'"
                  @keydown.enter.prevent="onEnter(i)"
                />
                <button type="button" class="eye" :aria-label="show[f.key] ? 'Sembunyikan password' : 'Lihat password'" @click="show[f.key] = !show[f.key]">
                  <component :is="show[f.key] ? PhEyeSlash : PhEye" :size="19" />
                </button>
              </div>
            </div>
          </div>

          <p class="hint">min. {{ MIN_PASSWORD_LENGTH }} karakter</p>
          <p v-if="error" class="error" role="alert">{{ error }}</p>

          <button type="submit" class="pill save" :disabled="saving">
            Simpan password
            <span class="ic"><span v-if="saving" class="spin" /><PhArrowRight v-else :size="16" weight="bold" /></span>
          </button>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { IonContent, IonInput, IonPage, toastController, useIonRouter } from '@ionic/vue'
import { PhArrowRight, PhEye, PhEyeSlash, PhKey, PhLock } from '@phosphor-icons/vue'
import PageHeader from '@/components/PageHeader.vue'
import { apiErrorMessage, MIN_PASSWORD_LENGTH, PASSWORD_CHANGED_MESSAGE, validatePasswordChange } from '@/lib/passwordChange.js'
import { useAuthStore } from '@/stores/auth.js'

const auth = useAuthStore()
const ionRouter = useIonRouter()

const fields = [
  { key: 'current', label: 'Password lama', icon: PhLock, autocomplete: 'current-password' },
  { key: 'next', label: 'Password baru', icon: PhKey, autocomplete: 'new-password' },
  { key: 'confirm', label: 'Ulangi password baru', icon: PhKey, autocomplete: 'new-password' },
]
const form = reactive({ current: '', next: '', confirm: '' })
const show = reactive({ current: false, next: false, confirm: false })
const error = ref('')
const shake = ref(false)
const saving = computed(() => auth.changingPassword)

/*
 * Keyboard HP/iPad: layout SENGAJA nggak diubah pas kolom kefokus (cuma warna ikon). Safari iOS geser halaman sendiri
 * ke kolom yang di-tap; scroll assist Ionic dimatiin di main.js (pelajaran bug keyboard iOS 14/11).
 */

/*
 * Enter / "next" / "done" di keyboard. Kolom ada di dalam <form>, jadi tanpa ini browser nge-submit form (implicit
 * submission) dari kolom mana pun → error "wajib diisi" padahal David cuma mau pindah kolom (temuan review 14/11).
 */
const inputEls = []
function onEnter(i) {
  if (i < fields.length - 1) inputEls[i + 1]?.setFocus?.()
  else submit()
}

function doShake() {
  shake.value = false
  requestAnimationFrame(() => {
    shake.value = true
    setTimeout(() => (shake.value = false), 500)
  })
}

async function submit() {
  if (saving.value) return
  const invalid = validatePasswordChange(form)
  if (invalid) {
    error.value = invalid
    doShake()
    return
  }
  error.value = ''
  try {
    await auth.changePassword(form.current, form.next)
  } catch (err) {
    error.value = apiErrorMessage(err)
    doShake()
    return
  }
  Object.assign(form, { current: '', next: '', confirm: '' })
  Object.assign(show, { current: false, next: false, confirm: false })
  if (ionRouter.canGoBack()) ionRouter.back()
  else ionRouter.navigate('/tabs/profil', 'back', 'replace')
  const toast = await toastController.create({ message: PASSWORD_CHANGED_MESSAGE, duration: 2500, position: 'top', cssClass: 'aio-toast' })
  await toast.present()
}
</script>

<style scoped>
.narrow { max-width: 620px; }
/* "ke-logout." jangan kepotong jadi "ke-" / "logout." di judul. */
.nowrap { white-space: nowrap; }
.ghost-user { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; overflow: hidden; }
.fields { padding: 4px 0; }
.prow { display: flex; align-items: center; gap: 12px; padding: 0 8px 0 18px; height: 58px; color: var(--muted); transition: color .3s var(--spring); }
.prow + .prow { box-shadow: inset 0 1px 0 var(--hair); }
.prow:focus-within { color: var(--text); }
.lead { flex-shrink: 0; }
/* ion-input (bukan <input> biasa), sama kayak login. */
.field { flex: 1; min-width: 0; min-height: 0; --background: transparent; --color: var(--text); --placeholder-color: var(--muted); --placeholder-opacity: 1;
  --padding-start: 0; --padding-end: 0; --padding-top: 0; --padding-bottom: 0; --highlight-height: 0; font: 500 16px var(--ion-font-family); }
.eye { width: 40px; height: 40px; border: 0; border-radius: 12px; background: transparent; color: var(--muted); display: grid; place-items: center; cursor: pointer; flex-shrink: 0; }
.eye:active { background: var(--soft); }
.hint { color: var(--muted); font-size: 12.5px; margin: 10px 6px 0; }
.error { color: var(--red); font-size: 13px; font-weight: 600; margin: 8px 6px 0; }
.save { margin-top: 18px; width: 100%; justify-content: space-between; height: 58px; padding: 8px 8px 8px 22px; font-size: 16px; }
.save .ic { width: 42px; height: 42px; }
.save:disabled { opacity: .75; }
.spin { width: 16px; height: 16px; border-radius: 99px; border: 2.5px solid rgba(28, 36, 0, .25); border-top-color: var(--lime-ink); animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.shake { animation: sh .45s; }
@keyframes sh { 20%, 60% { translate: -8px 0; } 40%, 80% { translate: 8px 0; } }
</style>
