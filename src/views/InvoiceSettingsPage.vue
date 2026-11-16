<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page set-page" :class="{ wide }">
        <PageHeader back-to="/tabs/menu/invoice" back-label="Invoice" eyebrow="Atur invoice">Isi sekali<span>kepake di semua invoice</span></PageHeader>

        <p v-if="first" class="firsthint" data-test="first-hint">Isi sekali dulu ya, abis itu langsung bisa bikin invoice.</p>
        <p v-if="loadError" class="err" role="alert">{{ loadError }}</p>

        <form v-if="loaded" ref="formEl" novalidate class="fgrid" @submit.prevent="save">
          <div class="fcol">
            <LaptopNote />

            <div class="label">Kop</div>
            <div class="shell"><div class="core fcard">
              <div class="kop">
                <div class="mark" data-test="mark">{{ form.initial }}<i /></div>
                <label class="fld grow"><span>Inisial logo</span><input v-model="form.initial" class="in" data-f="initial" data-nav maxlength="3" autocapitalize="off" enterkeyhint="next" @keydown.enter.prevent="onEnter($event)" /></label>
              </div>
              <p v-if="errors.initial" class="err" :data-err="'initial'">{{ errors.initial }}</p>
              <label class="fld"><span>Nama</span><input v-model="form.name" class="in" data-f="name" data-nav placeholder="Nama lo" autocomplete="name" enterkeyhint="next" @keydown.enter.prevent="onEnter($event)" /></label>
              <p v-if="errors.name" class="err" data-err="name">{{ errors.name }}</p>
              <label class="fld"><span>Telp / WA</span><input v-model="form.phone" class="in" data-f="phone" data-nav placeholder="08…" inputmode="tel" enterkeyhint="next" @keydown.enter.prevent="onEnter($event)" /></label>
              <p v-if="errors.phone" class="err" data-err="phone">{{ errors.phone }}</p>
              <label class="fld"><span>Email</span><input v-model="form.email" class="in" data-f="email" data-nav placeholder="email@lo.com" inputmode="email" autocapitalize="off" enterkeyhint="next" @keydown.enter.prevent="onEnter($event)" /></label>
              <p v-if="errors.email" class="err" data-err="email">{{ errors.email }}</p>
            </div></div>

            <div class="label">Rekening tujuan</div>
            <div class="shell"><div class="core fcard">
              <label class="fld first"><span>Bank</span><input v-model="form.bank" class="in" data-f="bank" data-nav placeholder="Misal: Bank Central Asia (BCA)" enterkeyhint="next" @keydown.enter.prevent="onEnter($event)" /></label>
              <p v-if="errors.bank" class="err" data-err="bank">{{ errors.bank }}</p>
              <label class="fld"><span>No. rekening</span><input v-model="form.accountNo" class="in" data-f="accountNo" data-nav placeholder="0000000000" inputmode="numeric" enterkeyhint="next" @keydown.enter.prevent="onEnter($event)" /></label>
              <p v-if="errors.accountNo" class="err" data-err="accountNo">{{ errors.accountNo }}</p>
              <label class="fld"><span>Atas nama</span><input v-model="form.accountName" class="in" data-f="accountName" data-nav placeholder="Nama di rekening" enterkeyhint="next" @keydown.enter.prevent="onEnter($event)" /></label>
              <p v-if="errors.accountName" class="err" data-err="accountName">{{ errors.accountName }}</p>
            </div></div>

            <div class="label">Tanda tangan</div>
            <div class="shell"><div class="core fcard">
              <div class="sigbox">
                <img v-if="form.signature" :src="form.signature" alt="Tanda tangan" data-test="sig-img" />
                <span v-else class="sigph">Belum ada tanda tangan</span>
              </div>
              <div class="row2">
                <button type="button" class="ghostbtn" data-test="draw" @click="padOpen = true"><PhPenNib :size="18" />{{ form.signature ? 'Coret ulang' : 'Coret' }}</button>
                <button type="button" class="ghostbtn" data-test="pick" :disabled="reading" @click="photoEl?.click()"><PhImage :size="18" />Pakai foto</button>
              </div>
              <input ref="photoEl" class="filein" type="file" accept="image/*" data-test="photo" tabindex="-1" aria-hidden="true" @change="onPhoto" />
              <button v-if="form.signature" type="button" class="linkbtn" data-test="sig-remove" @click="form.signature = null">Hapus tanda tangan</button>
              <p v-if="errors.signature" class="err" data-err="signature">{{ errors.signature }}</p>
              <p class="hint">Coret pakai jari / mouse, atau foto tanda tangan di kertas putih.</p>
            </div></div>

            <div class="label">Nomor invoice</div>
            <div class="shell"><div class="core fcard">
              <label class="fld first"><span>Awalan</span><input v-model="form.prefix" class="in" data-f="prefix" data-nav placeholder="INV/DS" autocapitalize="characters" enterkeyhint="next" @keydown.enter.prevent="onEnter($event)" /></label>
              <p v-if="errors.prefix" class="err" data-err="prefix">{{ errors.prefix }}</p>
              <p class="hint">Contoh nomor berikutnya: <b data-test="next-example">{{ nextExample }}</b>. Nomor urut mulai lagi dari 001 tiap bulan.</p>
              <label class="fld"><span>Nomor terakhir bulan ini</span><input v-model="form.lastNumberThisMonth" class="in" data-f="lastNumberThisMonth" data-nav inputmode="numeric" placeholder="0" enterkeyhint="next" @input="digitsOnly" @keydown.enter.prevent="onEnter($event)" /></label>
              <p v-if="errors.lastNumberThisMonth" class="err" data-err="lastNumberThisMonth">{{ errors.lastNumberThisMonth }}</p>
              <p class="hint">Udah ngirim invoice di luar app bulan ini? Isi nomor terakhirnya biar nggak dobel.</p>
            </div></div>

            <div class="label">Jatuh tempo bawaan</div>
            <div class="shell"><div class="core fcard">
              <div class="chips">
                <button v-for="n in DUE_OPTIONS" :key="n" type="button" class="dchip" :class="{ on: form.dueDays === n }" :data-due="n" @click="form.dueDays = n">{{ n }} hari</button>
              </div>
              <p v-if="errors.dueDays" class="err" data-err="dueDays">{{ errors.dueDays }}</p>
            </div></div>

            <div class="label">Kalimat di PDF</div>
            <div class="shell"><div class="core fcard">
              <label class="fld first"><span>Pembuka</span><textarea v-model="form.opening" class="in small" rows="2" data-f="opening" /></label>
              <p v-if="errors.opening" class="err" data-err="opening">{{ errors.opening }}</p>
              <label class="fld"><span>Penutup</span><input v-model="form.closing" class="in" data-f="closing" data-nav placeholder="Terima kasih …" enterkeyhint="done" @keydown.enter.prevent="onEnter($event)" /></label>
              <p v-if="errors.closing" class="err" data-err="closing">{{ errors.closing }}</p>
            </div></div>

            <div class="label">Catatan bawaan <small>buat invoice baru</small></div>
            <div class="shell"><div class="core fcard">
              <div v-for="(n, i) in form.defaultNotes" :key="i" class="note" data-test="note">
                <span class="nn">{{ i + 1 }}</span>
                <textarea v-model="form.defaultNotes[i]" class="in small" :rows="Math.max(2, Math.ceil(n.length / 34))" :data-f="`notes.${i}`" />
                <button type="button" class="del" data-test="del-note" aria-label="Hapus catatan" @click="form.defaultNotes.splice(i, 1)"><PhX :size="17" /></button>
              </div>
              <p v-if="errors.defaultNotes" class="err" data-err="defaultNotes">{{ errors.defaultNotes }}</p>
              <p class="hint">Tulis <b>{klien}</b>, nanti otomatis jadi nama klien.</p>
            </div></div>
            <button v-if="form.defaultNotes.length < MAX_NOTES" type="button" class="addline" data-test="add-note" @click="form.defaultNotes.push('')"><PhPlus :size="17" weight="bold" />Tambah catatan</button>

            <p v-for="[k, msg] in orphanErrors" :key="k" class="err" role="alert" data-test="orphan-error" :data-err="k">{{ msg }}</p>
            <p v-if="error" class="err" role="alert" data-test="error">{{ error }}</p>

            <div class="totbar">
              <div class="grow"><div class="v">Kepake di semua invoice</div></div>
              <button type="button" class="pill save" data-test="save" :disabled="saving" @click="save">
                Simpan
                <span class="ic"><span v-if="saving" class="spin" /><PhCheck v-else :size="16" weight="bold" /></span>
              </button>
            </div>
          </div>

          <div v-if="wide" class="pstick" data-test="preview">
            <div class="plabel"><b>Contoh hasilnya</b><span>{{ latest ? 'pakai invoice terakhir' : 'contoh isian' }}</span></div>
            <div class="pdesk"><InvoicePaper :invoice="previewInvoice" fit="desk" /></div>
          </div>
        </form>
      </div>

      <!-- Ke ion-app: popup Ionic dipasang di situ, jangan ketutup lapisan ini. -->
      <Teleport to="ion-app">
        <div v-if="padOpen" class="scrim" data-test="pad" @click.self="padOpen = false">
          <div class="padsheet" role="dialog" aria-label="Coret tanda tangan">
            <div class="handle" />
            <b class="padttl">Coret tanda tangan</b>
            <SignaturePad @use="usePad" @cancel="padOpen = false" />
          </div>
        </div>
      </Teleport>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, nextTick, reactive, ref } from 'vue'
import { IonContent, IonPage, onIonViewWillEnter, toastController, useIonRouter } from '@ionic/vue'
import { useRoute } from 'vue-router'
import { PhCheck, PhImage, PhPenNib, PhPlus, PhX } from '@phosphor-icons/vue'
import InvoicePaper from '@/components/InvoicePaper.vue'
import LaptopNote from '@/components/LaptopNote.vue'
import PageHeader from '@/components/PageHeader.vue'
import SignaturePad from '@/components/SignaturePad.vue'
import { formatNumber } from '@/lib/invoice.js'
import { useMedia } from '@/lib/media.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { fromPhoto } from '@/lib/signatureImage.js'
import { useInvoicesStore } from '@/stores/invoices.js'

const BASE = '/tabs/menu/invoice'
const DUE_OPTIONS = [7, 14, 30]
const MAX_NOTES = 10
const route = useRoute()
const ionRouter = useIonRouter()
const store = useInvoicesStore()
const wide = useMedia('(min-width: 1100px)')

// Dibaca SEKALI (halaman Ionic ketumpuk tetep hidup; route global bisa berubah).
const first = route.query.lanjut === 'baru'

const form = reactive({
  name: '', phone: '', email: '', initial: '', bank: '', accountNo: '', accountName: '', opening: '', closing: '',
  signature: null, prefix: '', dueDays: 7, defaultNotes: [], lastNumberThisMonth: '0',
})
const loaded = ref(false)
const loadError = ref('')
const errors = ref({})
const error = ref('')
// Kolom yang punya tempat pesan sendiri; error 422 di luar ini tetep harus keliatan (jangan gagal diem-diem).
const SLOTS = ['initial', 'name', 'phone', 'email', 'bank', 'accountNo', 'accountName', 'signature', 'prefix', 'lastNumberThisMonth', 'dueDays', 'opening', 'closing', 'defaultNotes']
const orphanErrors = computed(() => Object.entries(errors.value).filter(([k, v]) => v && !SLOTS.includes(k)))
const saving = ref(false)
const reading = ref(false)
const padOpen = ref(false)
const formEl = ref(null)
const photoEl = ref(null)

function fill(s) {
  Object.assign(form, {
    name: s.name, phone: s.phone ?? '', email: s.email ?? '', initial: s.initial, bank: s.bank ?? '', accountNo: s.accountNo ?? '',
    accountName: s.accountName ?? '', opening: s.opening ?? '', closing: s.closing ?? '', signature: s.signature ?? null,
    prefix: s.prefix, dueDays: s.dueDays, defaultNotes: [...(s.defaultNotes ?? [])], lastNumberThisMonth: String(s.lastNumberThisMonth ?? 0),
  })
}

onIonViewWillEnter(async () => {
  if (saving.value) return
  try {
    fill(await store.loadSettings())
    loadError.value = ''
    loaded.value = true
  } catch (err) {
    if (!loaded.value) loadError.value = apiErrorMessage(err)
  }
  // Buat pratinjau PC (invoice terakhir); gagal nggak masalah.
  if (!store.list) store.load().catch(() => {})
})

// Kalender WIB, sama kayak BE. `today` dari server dipake begitu ada.
const localToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
const today = computed(() => store.today ?? localToday())
const lastNumber = computed(() => Number(form.lastNumberThisMonth) || 0)
const nextExample = computed(() => formatNumber(form.prefix || 'INV', today.value.slice(0, 7), lastNumber.value + 1))

const letterhead = computed(() => ({
  name: form.name, phone: form.phone, email: form.email, initial: form.initial, bank: form.bank, accountNo: form.accountNo,
  accountName: form.accountName, opening: form.opening, closing: form.closing, signature: form.signature,
}))
const latest = computed(() => store.list?.[0] ?? null)
const previewInvoice = computed(() => {
  if (latest.value) return { ...latest.value, letterhead: letterhead.value }
  return {
    number: nextExample.value,
    letterhead: letterhead.value,
    client: { name: 'PT Contoh Klien', attn: 'Bagian Keuangan', address: 'Jl. Contoh No. 1\nJakarta', email: '' },
    issuedOn: today.value, dueOn: today.value, subject: 'Contoh perihal invoice', paidOn: null,
    items: [{ desc: 'Contoh pekerjaan', detail: '', qty: 1, unit: 'Paket', price: 5000000 }],
    discount: 0, taxOn: false, taxPct: 11, notes: form.defaultNotes,
  }
})

const digitsOnly = () => (form.lastNumberThisMonth = form.lastNumberThisMonth.replace(/\D/g, ''))

/* Enter / "next" di keyboard: pindah ke kolom berikutnya, bukan submit form. Kolom terakhir = tutup keyboard. */
function onEnter(e) {
  const inputs = [...(formEl.value?.querySelectorAll('input[data-nav]') ?? [])]
  const next = inputs[inputs.indexOf(e.target) + 1]
  if (next) next.focus()
  else e.target.blur()
}

async function onPhoto(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file || reading.value) return
  reading.value = true
  try {
    form.signature = await fromPhoto(file)
    errors.value = { ...errors.value, signature: undefined }
  } catch (err) {
    errors.value = { ...errors.value, signature: err?.message || 'Fotonya nggak kebaca, coba foto lain.' }
  } finally {
    reading.value = false
  }
}

function usePad(url) {
  form.signature = url
  errors.value = { ...errors.value, signature: undefined }
  padOpen.value = false
}

const showToast = async (message) => (await toastController.create({ message, duration: 2200, position: 'top', cssClass: 'aio-toast' })).present()

async function save() {
  if (saving.value) return
  saving.value = true
  errors.value = {}
  error.value = ''
  try {
    await store.saveSettings({
      name: form.name, phone: form.phone, email: form.email, initial: form.initial, bank: form.bank, accountNo: form.accountNo,
      accountName: form.accountName, opening: form.opening, closing: form.closing, signature: form.signature, prefix: form.prefix,
      dueDays: form.dueDays, defaultNotes: form.defaultNotes, lastNumberThisMonth: lastNumber.value,
    })
    showToast('Pengaturan invoice kesimpen ✓')
    if (first) ionRouter.navigate(`${BASE}/baru`, 'forward', 'replace')
    else if (ionRouter.canGoBack()) ionRouter.back()
    else ionRouter.navigate(BASE, 'back', 'replace')
  } catch (err) {
    if (err?.fields) {
      errors.value = Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]))
      await nextTick()
      formEl.value?.querySelector('.err')?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    } else {
      error.value = apiErrorMessage(err)
    }
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.set-page { padding-bottom: 130px; }
.set-page:not(.wide) { max-width: 620px; }
.firsthint { margin: -4px 6px 12px; font-size: 13.5px; font-weight: 600; color: var(--muted); line-height: 1.45; }
.err { color: var(--red); font-size: 12.5px; font-weight: 600; margin: 6px 6px 0; }
.fcard { padding: 14px; }
.fcol > .label { margin: 18px 8px 10px; }
.fcol > .label:first-of-type { margin-top: 6px; }
.label small { color: var(--muted); font-weight: 500; }
.fld { display: block; margin-top: 12px; }
.fld.first { margin-top: 0; }
.fld > span { display: block; font-size: 12px; font-weight: 700; color: var(--muted); margin: 0 0 6px 4px; }
.in { display: block; width: 100%; border: 0; outline: 0; background: var(--soft); border-radius: 16px; padding: 13px 14px; font: 600 15px var(--ion-font-family); color: var(--text); letter-spacing: -0.01em; }
.in::placeholder { color: var(--muted); font-weight: 500; opacity: .8; }
textarea.in { resize: none; line-height: 1.45; font-weight: 500; font-size: 14px; }
.in:focus { box-shadow: 0 0 0 2px var(--ink); }
.in.small { font-size: 13.5px; }
.hint { font-size: 12px; color: var(--muted); margin: 8px 4px 0; font-weight: 500; line-height: 1.45; }
.hint b { color: var(--text); font-weight: 700; }
.kop { display: flex; align-items: flex-end; gap: 12px; }
.kop .fld { margin-top: 0; }
.grow { flex: 1; min-width: 0; }
.mark { width: 46px; height: 46px; border-radius: 13px; background: #141410; color: #F3F2EE; display: flex; align-items: baseline; justify-content: center; padding-top: 9px; font-weight: 800; font-size: 22px; letter-spacing: -0.065em; line-height: 1; flex: none; margin-bottom: 1px; overflow: hidden; }
.mark i { width: 5px; height: 5px; border-radius: 9px; background: #C8F04A; margin-left: 2px; }
.sigbox { height: 110px; border-radius: 18px; background: #fff; box-shadow: inset 0 0 0 1.5px var(--hair); display: grid; place-items: center; padding: 8px; }
.sigbox img { max-width: 100%; max-height: 94px; object-fit: contain; }
.sigph { color: #8A8A82; font-weight: 600; font-size: 13.5px; }
.row2 { display: flex; gap: 8px; margin-top: 10px; }
.ghostbtn { flex: 1; height: 46px; border: 0; border-radius: 99px; background: var(--soft); color: var(--text); font: 700 14px var(--ion-font-family); display: flex; align-items: center; justify-content: center; gap: 7px; cursor: pointer; }
.ghostbtn:disabled { opacity: .5; }
.filein { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.linkbtn { border: 0; background: transparent; color: var(--red); font: 700 13px var(--ion-font-family); margin: 8px 0 0 4px; padding: 4px; cursor: pointer; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.dchip { height: 36px; padding: 0 14px; border-radius: 99px; border: 0; background: var(--soft); font: 700 13px var(--ion-font-family); color: var(--text); cursor: pointer; }
.dchip.on { background: var(--ink); color: var(--on-ink); }
.note { display: flex; gap: 6px; align-items: flex-start; }
.note + .note { margin-top: 8px; }
.note .nn { width: 20px; text-align: center; font-weight: 800; color: var(--muted); font-size: 13px; padding-top: 13px; flex: none; }
.note .in { flex: 1; min-width: 0; }
.note .del { border: 0; background: transparent; color: var(--muted); cursor: pointer; padding: 12px 4px 4px; }
.addline { width: 100%; height: 50px; border: 1.5px dashed rgba(138, 138, 130, .45); border-radius: 20px; background: transparent; font: 700 14px var(--ion-font-family); color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 10px; }
.totbar { position: fixed; left: 12px; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom)); z-index: 25; display: flex; align-items: center; gap: 8px; padding: 7px 7px 7px 20px; border-radius: 99px; background: var(--glass); backdrop-filter: blur(22px) saturate(1.6); -webkit-backdrop-filter: blur(22px) saturate(1.6); box-shadow: 0 0 0 1px var(--hair), 0 18px 40px -16px rgba(0, 0, 0, .3); }
.totbar .v { font-size: 14px; font-weight: 800; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.save { height: 46px; padding-left: 22px; }
.save:disabled { opacity: .7; }
.spin { width: 14px; height: 14px; border-radius: 99px; border: 2px solid currentColor; border-top-color: transparent; animation: setspin .7s linear infinite; }
@keyframes setspin { to { transform: rotate(360deg); } }
@media (hover: hover) {
  .ghostbtn:hover, .dchip:not(.on):hover { box-shadow: 0 0 0 1.5px var(--text); }
}

/* papan coret */
.scrim { position: fixed; inset: 0; z-index: 70; background: rgba(0, 0, 0, .42); display: flex; align-items: flex-end; justify-content: center; font-family: var(--ion-font-family); color: var(--text); }
.padsheet { width: 100%; max-width: 560px; background: var(--card); border-radius: 30px 30px 0 0; padding: 10px 16px calc(18px + env(safe-area-inset-bottom)); }
.handle { width: 38px; height: 5px; border-radius: 99px; background: var(--hair); margin: 0 auto 12px; }
.padttl { display: block; font-size: 16px; margin: 0 4px 12px; }
@media (min-width: 768px) {
  .scrim { align-items: center; }
  .padsheet { border-radius: 30px; padding: 22px; }
  .handle { display: none; }
}

@media (min-width: 1100px) {
  .set-page { padding-bottom: 48px; }
  .fgrid { display: grid; grid-template-columns: minmax(440px, 560px) minmax(0, 1fr); gap: 28px; align-items: start; margin-top: 10px; }
  .pstick { position: sticky; top: 24px; }
  .plabel { display: flex; align-items: baseline; gap: 8px; margin: 0 8px 10px; font-size: 13px; }
  .plabel span { color: var(--muted); font-weight: 600; font-size: 12.5px; }
  .pdesk { background: var(--shell); box-shadow: 0 0 0 1px var(--hair); border-radius: 30px; padding: 24px; display: flex; justify-content: center; align-items: flex-start; height: calc(100vh - 150px); --paper-h: calc(100vh - 198px); }
  .pdesk > :deep(.paper) { width: 100%; height: var(--paper-h); }
  .totbar { position: sticky; left: auto; right: auto; bottom: 16px; margin-top: 22px; max-width: none; }
}
@media (min-width: 1600px) {
  .fgrid { grid-template-columns: minmax(520px, 640px) minmax(0, 1fr); }
}
</style>
