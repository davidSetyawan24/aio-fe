<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page det-page" :class="{ wide }">
        <PageHeader back-to="/tabs/menu/invoice" back-label="Invoice" :eyebrow="inv?.number ?? 'Invoice'">
          <template v-if="inv">{{ rp(inv.totals.total) }}<br /><span>{{ inv.client.name }}</span></template>
        </PageHeader>

        <p v-if="error" class="det-error">{{ error }}</p>

        <div v-if="!inv && loadError" class="shell rise" data-test="load-failed">
          <div class="core det-empty">
            <div class="big">📡</div>
            <b>{{ loadError }}</b>
            <button class="pill" data-test="retry" :disabled="reloading" @click="reload">Coba lagi</button>
          </div>
        </div>

        <div v-else-if="!inv && loaded" class="shell rise" data-test="notfound">
          <div class="core det-empty">
            <div class="big">📄</div>
            <b>Invoice-nya nggak ketemu.</b>
            <button class="pill" data-test="notfound-back" @click="goBack">Balik ke Invoice <span class="ic"><PhCaretLeft :size="17" weight="bold" /></span></button>
          </div>
        </div>

        <template v-if="inv">
          <div class="stline" data-test="stline">
            <span class="tag" :class="chip.tone">{{ chip.text }}</span>
            <span>{{ inv.paidOn ? `Diterima ${fmtLong(inv.paidOn)}` : `Jatuh tempo ${fmtLong(inv.dueOn)}` }}</span>
          </div>
          <LaptopNote />

          <div class="detgrid">
            <div class="dpaper">
              <div v-if="wide" class="desk-wrap"><InvoicePaper :invoice="inv" fit="desk" /></div>
              <template v-else>
                <div class="rise" data-test="paper" @click="preview = true"><InvoicePaper :invoice="inv" fit="width" tap /></div>
                <p class="hint">Tap PDF-nya buat lihat lebih gede</p>
              </template>
            </div>

            <div class="dside">
              <div class="actions">
                <button class="pill share" data-test="share" :disabled="!pdfFile && !pdfFailed" @click="share">
                  <span class="grow">Bagikan PDF</span>
                  <span v-if="pdfFailed" class="soon">PDF-nya gagal dibikin, tap buat coba lagi</span>
                  <span v-else-if="!pdfFile" class="soon">Lagi nyiapin PDF…</span>
                  <span class="ic"><PhShareFat :size="18" weight="bold" /></span>
                </button>
                <div class="act3">
                  <button class="tile" data-test="download" :disabled="!pdfFile" @click="download"><PhDownloadSimple :size="22" />Unduh</button>
                  <button class="tile" data-test="edit" @click="edit"><PhPencilSimple :size="22" />Ubah</button>
                  <button class="tile" data-test="dup" @click="duplicate"><PhCopy :size="22" />Duplikat</button>
                </div>
                <button v-if="inv.paidOn" class="paybtn done" data-test="unpaid" :disabled="busy" @click="unpaid">
                  <span class="pc"><PhCheck :size="17" weight="bold" /></span>
                  <span class="grow"><b>Udah lunas</b><small>Diterima {{ fmtLong(inv.paidOn) }} · tap buat batalin</small></span>
                </button>
                <button v-else class="paybtn" data-test="paid" :disabled="busy" @click="paidOpen = true">
                  <span class="pc"><PhCheck :size="17" weight="bold" /></span>
                  <span class="grow"><b>Tandain lunas</b><small>PDF-nya langsung dapet cap LUNAS</small></span>
                  <PhCaretRight :size="18" />
                </button>
                <button class="delbtn" data-test="delete" :disabled="busy" @click="confirmDelete"><PhTrash :size="18" />Hapus invoice</button>
              </div>

              <template v-if="wide">
                <div class="label det-label">Detail</div>
                <div class="shell"><div class="core" data-test="info">
                  <div v-for="[k, v] in info" :key="k" class="kvrow"><span>{{ k }}</span><b>{{ v }}</b></div>
                </div></div>
              </template>
            </div>
          </div>
        </template>
      </div>

      <InvoicePaidSheet v-if="inv" :open="paidOpen" :wide="sheetWide" :today="store.today ?? localToday()" :issued-on="inv.issuedOn" :busy="busy" @close="paidOpen = false" @done="markPaid" />

      <!-- Ke ion-app: popup Ionic (action sheet) dipasang di situ, jangan ketutup lapisan ini. -->
      <Teleport to="ion-app">
        <div v-if="preview && inv" class="pv" data-test="preview">
          <div class="pvbar">
            <button class="iconbtn" data-test="preview-close" aria-label="Tutup" @click="preview = false"><PhX :size="20" /></button>
            <b>Pratinjau PDF</b>
            <button class="iconbtn" data-test="preview-share" aria-label="Bagikan" :disabled="!pdfFile" @click="share"><PhShareFat :size="20" /></button>
          </div>
          <div class="pvbody"><InvoicePaper :invoice="inv" fit="width" /></div>
        </div>
      </Teleport>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, ref, watch, watchEffect } from 'vue'
import { IonContent, IonPage, actionSheetController, onIonViewWillEnter, toastController, useIonRouter } from '@ionic/vue'
import { useRoute } from 'vue-router'
import { PhCaretLeft, PhCaretRight, PhCheck, PhCopy, PhDownloadSimple, PhPencilSimple, PhShareFat, PhTrash, PhX } from '@phosphor-icons/vue'
import InvoicePaidSheet from '@/components/InvoicePaidSheet.vue'
import InvoicePaper from '@/components/InvoicePaper.vue'
import LaptopNote from '@/components/LaptopNote.vue'
import PageHeader from '@/components/PageHeader.vue'
import { fileName, fmtLong, rp, sheetModel, statusChip } from '@/lib/invoice.js'
import { buildInvoicePdf } from '@/lib/invoicePdf.js'
import { useMedia } from '@/lib/media.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { downloadFile, shareOrDownload } from '@/lib/shareFile.js'
import { useInvoicesStore } from '@/stores/invoices.js'

const BASE = '/tabs/menu/invoice'
const route = useRoute()
const ionRouter = useIonRouter()
const store = useInvoicesStore()
const wide = useMedia('(min-width: 1100px)')
const sheetWide = useMedia('(min-width: 768px)')

// Dibaca SEKALI (Ionic nyimpen halaman ketumpuk tetep hidup; route global bisa pindah ke :id lain).
const pageId = route.params.id
const loaded = ref(false)
const error = ref('')
// Gagal muat (mis. jaringan) & invoice-nya belum pernah kebaca → bukan "nggak ketemu", tapi tawarin coba lagi.
const loadError = ref('')
const reloading = ref(false)
const busy = ref(false)
const paidOpen = ref(false)
const preview = ref(false)
let leaving = false

// Pegang invoice terakhir yang ketemu: abis dihapus daftar langsung berubah, tapi halaman nggak boleh kedip "nggak ketemu".
const last = ref(null)
watchEffect(() => {
  const found = store.byId(pageId)
  if (found) last.value = found
})
const inv = computed(() => last.value)
const chip = computed(() => statusChip(inv.value))
const info = computed(() => [
  ['Klien', inv.value.client.name],
  ['Tanggal', fmtLong(inv.value.issuedOn)],
  ['Jatuh tempo', fmtLong(inv.value.dueOn)],
  ['Perihal', inv.value.subject || '—'],
  ['Item', `${inv.value.items.length} item`],
])

/*
 * PDF disiapin di belakang layar begitu invoice-nya ada, biar tap Bagikan langsung manggil `navigator.share`
 * (iOS cuma ngizinin dari tap, nggak boleh nunggu PDF dibikin dulu). Dibikin ulang cuma kalau isi kertasnya berubah
 * (mis. abis Tandain lunas), bukan tiap daftar dimuat ulang.
 */
const pdfFile = ref(null)
const pdfFailed = ref(false)
let pdfRun = 0
let sharing = false
const paperKey = computed(() => (inv.value ? JSON.stringify(sheetModel(inv.value)) : ''))

async function preparePdf() {
  const invoice = inv.value
  if (!invoice) return
  const run = ++pdfRun
  pdfFile.value = null
  pdfFailed.value = false
  try {
    const blob = await buildInvoicePdf(invoice)
    // PDF lama yang telat jadi nggak boleh nimpa yang terbaru
    if (run === pdfRun) pdfFile.value = new File([blob], fileName(invoice.number), { type: 'application/pdf' })
  } catch {
    if (run === pdfRun) pdfFailed.value = true
  }
}
watch(paperKey, (key) => key && preparePdf(), { immediate: true })

async function share() {
  if (pdfFailed.value) return preparePdf()
  if (!pdfFile.value || sharing) return
  sharing = true
  try {
    // Langsung dari tap, tanpa await sebelumnya (aturan iOS). Menu ditutup = 'cancelled', bukan error.
    await shareOrDownload(pdfFile.value, `Invoice ${inv.value.number}`)
  } catch {
    error.value = 'PDF-nya gagal dibagiin. Coba lagi ya.'
  } finally {
    sharing = false
  }
}

function download() {
  if (pdfFile.value) downloadFile(pdfFile.value)
}

// Cadangan kalau daftar belum ke-load (kalender HP/WIB sama kayak BE, `today` dari server dipake begitu ada).
const localToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())

const showToast = async (message) => (await toastController.create({ message, duration: 2200, position: 'top', cssClass: 'aio-toast' })).present()

async function reload() {
  if (reloading.value) return
  reloading.value = true
  try {
    await store.load()
    loadError.value = ''
  } catch (err) {
    if (!store.byId(pageId)) loadError.value = apiErrorMessage(err)
  } finally {
    loaded.value = true
    reloading.value = false
  }
}

onIonViewWillEnter(() => {
  if (!leaving) reload()
})

const goBack = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate(BASE, 'back', 'replace'))
const edit = () => ionRouter.push(`${BASE}/${pageId}/ubah`)
const duplicate = () => ionRouter.push(`${BASE}/baru?dari=${pageId}`)

async function markPaid(paidOn) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await store.setPaid(pageId, paidOn)
    paidOpen.value = false
    showToast('Lunas ✓ PDF-nya udah dapet cap LUNAS')
  } catch (err) {
    error.value = apiErrorMessage(err)
    paidOpen.value = false
  } finally {
    busy.value = false
  }
}

async function unpaid() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await store.unsetPaid(pageId)
    showToast('Lunasnya dibatalin.')
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    busy.value = false
  }
}

async function confirmDelete() {
  if (busy.value) return
  // Dikunci dari sebelum action sheet kebuka: tap dobel nggak boleh munculin dua pilihan / dua hapus.
  busy.value = true
  const sheet = await actionSheetController.create({
    header: 'Hapus invoice ini?',
    subHeader: `${inv.value.number} bakal ilang permanen. Nomornya nggak dipakai ulang.`,
    buttons: [
      { text: 'Hapus', role: 'destructive', data: 'delete' },
      { text: 'Batal', role: 'cancel' },
    ],
  })
  await sheet.present()
  const { data } = await sheet.onDidDismiss()
  if (data !== 'delete') return (busy.value = false)
  error.value = ''
  try {
    await store.remove(pageId)
    leaving = true
    showToast('Invoice dihapus.')
    goBack()
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.det-page { padding-bottom: 60px; }
.det-page:not(.wide) { max-width: 620px; }
.det-page :deep(.h1) { font-variant-numeric: tabular-nums; }
.det-error { color: var(--red); font-size: 13px; font-weight: 600; margin: 0 6px 12px; }
.det-empty { padding: 28px 22px; text-align: center; }
.det-empty .big { font-size: 40px; }
.det-empty b { display: block; font-size: 17px; margin: 8px 0 16px; }

.stline { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--muted); font-weight: 600; margin: -6px 0 14px; flex-wrap: wrap; }
.tag { display: inline-flex; align-items: center; height: 22px; padding: 0 8px; border-radius: 99px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.tag.red { background: rgba(240, 83, 61, .12); color: var(--red); }
.tag.amber { background: rgba(245, 165, 36, .16); color: #C27C00; }
:root.theme-dark .tag.amber { color: var(--amber, #F5A524); }
.tag.green { background: rgba(43, 168, 100, .12); color: var(--green); }
.tag.soft { background: var(--soft); color: var(--muted); }

.dpaper { margin-top: 6px; }
.hint { text-align: center; font-size: 12.5px; color: var(--muted); margin: 10px 0 0; }
.actions { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
.share { width: 100%; height: 56px; padding: 6px 6px 6px 22px; font-size: 15.5px; }
.share:disabled { opacity: .55; cursor: default; }
.share .grow { text-align: left; }
.share .soon { font-size: 11.5px; font-weight: 600; opacity: .7; }
.share .ic { width: 44px; height: 44px; }
.act3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.tile { height: 74px; border-radius: 22px; border: 0; background: var(--card); box-shadow: 0 0 0 1px var(--hair); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; font: 700 13px var(--ion-font-family); cursor: pointer; color: var(--text); transition: transform .2s var(--spring); }
.tile:active:not(:disabled) { transform: scale(.97); }
.tile:disabled { opacity: .5; cursor: default; }
.paybtn { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 16px 12px 12px; border: 0; border-radius: 22px; background: var(--card); box-shadow: 0 0 0 1px var(--hair); text-align: left; cursor: pointer; color: var(--text); transition: transform .2s var(--spring); }
.paybtn:active:not(:disabled) { transform: scale(.97); }
.paybtn:disabled { opacity: .6; }
.paybtn .pc { width: 42px; height: 42px; border-radius: 99px; box-shadow: inset 0 0 0 2px var(--green); color: var(--green); display: grid; place-items: center; flex: none; }
.paybtn.done .pc { background: var(--green); color: #fff; box-shadow: none; }
.paybtn b { display: block; font-size: 15px; }
.paybtn small { display: block; font-size: 12.5px; color: var(--muted); font-weight: 600; margin-top: 1px; }
.paybtn > svg { color: var(--muted); flex: none; }
.delbtn { border: 0; background: transparent; color: var(--red); font: 700 14px var(--ion-font-family); display: flex; align-items: center; gap: 6px; justify-content: center; width: 100%; height: 44px; cursor: pointer; }
.delbtn:disabled { opacity: .5; }
.det-label { margin: 22px 8px 10px; }
.kvrow { display: flex; justify-content: space-between; gap: 16px; padding: 12px 14px; font-size: 13.5px; }
.kvrow + .kvrow { box-shadow: inset 0 1px 0 var(--hair); }
.kvrow span { color: var(--muted); font-weight: 600; flex: none; }
.kvrow b { text-align: right; font-weight: 700; min-width: 0; overflow-wrap: anywhere; }
@media (hover: hover) {
  .tile:hover:not(:disabled), .paybtn:hover:not(:disabled) { box-shadow: 0 0 0 1.5px var(--text); }
}

@media (min-width: 1100px) {
  .det-page { padding-bottom: 48px; }
  .detgrid { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 28px; align-items: start; margin-top: 16px; }
  /* Judul 2 baris (total + klien) + baris status di atasnya: kertas muat penuh dari awal buka. */
  .dpaper { margin-top: 0; --paper-h: calc(100vh - 304px); }
  .desk-wrap { min-height: 520px; display: flex; }
  .desk-wrap > :deep(.paper) { height: max(520px, var(--paper-h)); }
  .dside { position: sticky; top: 24px; }
  .actions { margin-top: 0; }
  .stline { margin: 8px 0 0; }
}
@media (min-width: 1600px) { .detgrid { grid-template-columns: minmax(0, 1fr) 420px; } }

/* pratinjau layar penuh (HP/iPad) */
.pv { position: fixed; inset: 0; z-index: 65; background: var(--app-bg); display: flex; flex-direction: column; font-family: var(--ion-font-family); color: var(--text); }
.pvbar { display: flex; align-items: center; justify-content: space-between; padding: calc(env(safe-area-inset-top) + 14px) 14px 10px; font-size: 15px; }
.pvbody { flex: 1; overflow: auto; padding: 6px 12px 28px; }
.iconbtn { width: 42px; height: 42px; border: 0; border-radius: 99px; background: var(--soft); color: var(--text); display: grid; place-items: center; cursor: pointer; }
.iconbtn:disabled { opacity: .4; }
</style>
