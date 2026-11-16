<template>
  <!-- novalidate: cek isian dari kita sendiri (bahasa Indonesia), bukan pesan bawaan browser. -->
  <form ref="formEl" novalidate class="fgrid" @submit.prevent="save">
    <div class="fcol">
      <div class="label">Klien</div>
      <div class="shell"><div class="core fcard">
        <div class="sugwrap">
          <input v-model="draft.client.name" class="in big" data-test="client-name" data-nav placeholder="Nama klien, misal PT …" autocomplete="off" enterkeyhint="next" @input="onClientName" @blur="clientOpen = false" @keydown.enter.prevent="onEnter($event)" />
          <SuggestBox v-if="clientOpen && clientRows.length" test-id="client" heading="Klien lama" :rows="clientRows" @pick="pickClient" />
        </div>
        <p v-if="errors['client.name']" class="err" data-err="client.name">{{ errors['client.name'] }}</p>
        <p class="hint">Klien lama tinggal ketik namanya, sisanya keisi sendiri. Klien baru otomatis kesimpen.</p>
        <label class="fld"><span>U.p. (opsional)</span><input v-model="draft.client.attn" class="in" data-test="client-attn" data-nav placeholder="Misal: Bagian Keuangan" enterkeyhint="next" @keydown.enter.prevent="onEnter($event)" /></label>
        <p v-if="errors['client.attn']" class="err" data-err="client.attn">{{ errors['client.attn'] }}</p>
        <label class="fld"><span>Alamat</span><textarea v-model="draft.client.address" class="in" rows="3" data-test="client-address" placeholder="Alamat lengkap klien" /></label>
        <p v-if="errors['client.address']" class="err" data-err="client.address">{{ errors['client.address'] }}</p>
        <label class="fld"><span>Email (opsional)</span><input v-model="draft.client.email" class="in" data-test="client-email" data-nav placeholder="finance@klien.com" inputmode="email" autocapitalize="off" enterkeyhint="next" @keydown.enter.prevent="onEnter($event)" /></label>
        <p v-if="errors['client.email']" class="err" data-err="client.email">{{ errors['client.email'] }}</p>
      </div></div>

      <div class="label">Tanggal</div>
      <div class="shell"><div class="core fcard">
        <div class="fld first">
          <span>Tanggal invoice</span>
          <label class="in datebtn"><PhCalendarBlank :size="18" />{{ fmtLong(draft.issuedOn) }}<input type="date" data-test="issued-date" aria-label="Tanggal invoice" :value="draft.issuedOn" min="2000-01-01" @change="onIssued" /></label>
        </div>
        <p v-if="errors.issuedOn" class="err" data-err="issuedOn">{{ errors.issuedOn }}</p>
        <div class="fld">
          <span>Jatuh tempo</span>
          <div class="chips">
            <button v-for="n in DUE_OPTIONS" :key="n" type="button" class="dchip" :class="{ on: draft.dueDays === n }" :data-test="`due-chip-${n}`" @click="setDueDays(n)">+{{ n }} hari</button>
            <label class="dchip" :class="{ on: draft.dueDays === null }" data-test="due-pick">Pilih…<input type="date" data-test="due-date" aria-label="Jatuh tempo" :value="draft.dueOn" :min="draft.issuedOn" @change="onDue" /></label>
          </div>
          <p class="hint">Jatuh tempo <b data-test="due-hint">{{ fmtLong(draft.dueOn) }}</b></p>
          <p v-if="errors.dueOn" class="err" data-err="dueOn">{{ errors.dueOn }}</p>
        </div>
      </div></div>

      <div class="label">Perihal</div>
      <div class="shell"><div class="core fcard">
        <input v-model="draft.subject" class="in" data-test="subject" data-nav placeholder="Misal: Pembuatan aplikasi tahap 1" enterkeyhint="next" @keydown.enter.prevent="onEnter($event)" />
        <p v-if="errors.subject" class="err" data-err="subject">{{ errors.subject }}</p>
      </div></div>

      <div class="label">Item <small>{{ draft.items.length }}</small></div>
      <div class="shell"><div class="core items">
        <InvoiceItemEditor
          v-for="(it, i) in draft.items" :key="it.key" :model-value="it" :index="i" :removable="draft.items.length > 1"
          :suggestions="suggestions?.items ?? []" :errors="itemErrors(i)"
          @update:model-value="draft.items[i] = $event" @remove="removeItem(i)" @enter="onEnter"
        />
      </div></div>
      <p v-if="errors.items" class="err" data-err="items">{{ errors.items }}</p>
      <button type="button" class="addline" data-test="add-item" @click="addItem"><PhPlus :size="17" weight="bold" />Tambah item</button>

      <template v-if="showExtra">
        <div class="label">Diskon &amp; pajak</div>
        <div class="shell"><div class="core fcard">
          <label class="fld first"><span>Diskon (opsional)</span><div class="money"><input class="in" data-test="discount" data-nav inputmode="numeric" :value="formatAmount(draft.discount)" placeholder="0" enterkeyhint="next" @input="onDiscount" @keydown.enter.prevent="onEnter($event)" /></div></label>
          <p v-if="errors.discount" class="err" data-err="discount">{{ errors.discount }}</p>
          <div class="swrow">
            <div class="grow"><b>PPN</b><small>{{ draft.taxOn ? 'Dihitung dari total setelah diskon' : 'Nggak pakai PPN' }}</small></div>
            <input v-if="draft.taxOn" class="in pct" data-test="tax-pct" data-nav inputmode="numeric" :value="draft.taxPct" enterkeyhint="done" @input="onTaxPct" @keydown.enter.prevent="onEnter($event)" />
            <button type="button" class="sw" :class="{ on: draft.taxOn }" data-test="tax-switch" role="switch" :aria-checked="draft.taxOn" aria-label="PPN" @click="draft.taxOn = !draft.taxOn" />
          </div>
          <p v-if="errors.taxPct" class="err" data-err="taxPct">{{ errors.taxPct }}</p>
        </div></div>
      </template>
      <button v-else type="button" class="addline" data-test="add-extra" @click="showExtra = true"><PhPlus :size="17" weight="bold" />Diskon / pajak</button>

      <div class="label">Catatan <small>di bawah PDF</small></div>
      <div class="shell"><div class="core fcard">
        <div v-for="(n, i) in draft.notes" :key="i" class="note">
          <span class="nn">{{ i + 1 }}</span>
          <textarea v-model="draft.notes[i]" class="in small" :rows="Math.max(2, Math.ceil(n.length / 34))" data-test="note" />
          <button type="button" class="del" data-test="del-note" aria-label="Hapus catatan" @click="draft.notes.splice(i, 1)"><PhX :size="17" /></button>
        </div>
        <p v-if="errors.notes" class="err" data-err="notes">{{ errors.notes }}</p>
        <p class="hint">Tulis <b>{klien}</b>, nanti otomatis jadi nama klien.</p>
      </div></div>
      <button v-if="draft.notes.length < MAX_NOTES" type="button" class="addline" data-test="add-note" @click="draft.notes.push('')"><PhPlus :size="17" weight="bold" />Tambah catatan</button>

      <p v-for="[k, msg] in orphanErrors" :key="k" class="err" role="alert" data-test="orphan-error" :data-err="k">{{ msg }}</p>
      <p v-if="error" class="err" role="alert" data-test="error">{{ error }}</p>

      <div class="totbar">
        <div class="grow"><div class="k">Total</div><div class="v" data-test="total">{{ rp(sums.total) }}</div></div>
        <button v-if="!wide" type="button" class="ghostbtn" data-test="pdf" @click="pvOpen = true"><PhFilePdf :size="18" />PDF</button>
        <button type="button" class="pill save" data-test="save" :disabled="saving" @click="save">
          Simpan
          <span class="ic"><span v-if="saving" class="spin" /><PhCheck v-else :size="16" weight="bold" /></span>
        </button>
      </div>
    </div>

    <div v-if="wide" class="pstick" data-test="preview">
      <div class="plabel"><b>Pratinjau PDF</b><span>ikut berubah pas lo ngetik</span></div>
      <div class="pdesk"><InvoicePaper :invoice="previewInvoice" fit="desk" /></div>
    </div>
  </form>

  <!-- Ke ion-app: popup Ionic dipasang di situ, jangan ketutup lapisan ini. -->
  <Teleport to="ion-app">
    <div v-if="pvOpen && !wide" class="pv" data-test="pv">
      <div class="pvbar">
        <button type="button" class="iconbtn" data-test="pv-close" aria-label="Tutup" @click="pvOpen = false"><PhX :size="20" /></button>
        <b>Pratinjau PDF</b>
        <span class="iconbtn ghost" />
      </div>
      <div class="pvbody"><InvoicePaper :invoice="previewInvoice" fit="width" /></div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { PhCalendarBlank, PhCheck, PhFilePdf, PhPlus, PhX } from '@phosphor-icons/vue'
import InvoiceItemEditor from '@/components/InvoiceItemEditor.vue'
import InvoicePaper from '@/components/InvoicePaper.vue'
import SuggestBox from '@/components/SuggestBox.vue'
import { formatAmount } from '@/lib/duit.js'
import { addDays } from '@/lib/agenda.js'
import { formatNumber, fmtLong, initialsOf, rp, totals } from '@/lib/invoice.js'
import { useMedia } from '@/lib/media.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { useInvoicesStore } from '@/stores/invoices.js'

/**
 * Bikin / Ubah / Duplikat invoice, satu layar. `invoice` = yang lagi diubah (null = baru); `from` = sumber Duplikat.
 * Pratinjau kertas: PC di kanan (ikut ketikan), HP lewat tombol PDF.
 */
const props = defineProps({
  invoice: { type: Object, default: null },
  from: { type: Object, default: null },
})
const emit = defineEmits(['saved', 'number'])

const DUE_OPTIONS = [7, 14, 30]
const MAX_NOTES = 10
const store = useInvoicesStore()
const wide = useMedia('(min-width: 1100px)')

// Kalender WIB, sama kayak BE. `today` dari server dipake begitu ada.
const localToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
const today = store.today ?? localToday()
const settings = store.settings

let keySeed = 0
const newItem = (it = {}) => ({ key: ++keySeed, desc: it.desc ?? '', detail: it.detail ?? '', qty: it.qty ?? 1, unit: it.unit ?? 'Paket', price: it.price ?? 0 })
const dueDaysOf = (issuedOn, dueOn) => DUE_OPTIONS.find((n) => addDays(issuedOn, n) === dueOn) ?? null

function initialDraft() {
  const src = props.invoice ?? props.from
  if (!src) {
    return {
      client: { name: '', attn: '', address: '', email: '' }, issuedOn: today, dueOn: addDays(today, settings.dueDays), dueDays: settings.dueDays,
      subject: '', items: [newItem()], discount: 0, taxOn: false, taxPct: 11, notes: [...(settings.defaultNotes ?? [])],
    }
  }
  const base = {
    client: { name: src.client.name, attn: src.client.attn ?? '', address: src.client.address ?? '', email: src.client.email ?? '' },
    subject: src.subject ?? '', items: src.items.map(newItem), discount: src.discount, taxOn: src.taxOn, taxPct: src.taxPct, notes: [...src.notes],
  }
  if (props.invoice) return { ...base, issuedOn: src.issuedOn, dueOn: src.dueOn, dueDays: dueDaysOf(src.issuedOn, src.dueOn) }
  return { ...base, issuedOn: today, dueOn: addDays(today, settings.dueDays), dueDays: settings.dueDays }
}

const draft = reactive(initialDraft())
const showExtra = ref(draft.discount > 0 || draft.taxOn)
const errors = ref({})
const error = ref('')
const saving = ref(false)
const pvOpen = ref(false)
const clientOpen = ref(false)
const formEl = ref(null)

/* ---- saran ---- */
const suggestions = computed(() => store.suggestions)
store.loadSuggestions().catch(() => {})
const clientMatches = computed(() => {
  const q = draft.client.name.trim().toLowerCase()
  if (q.length < 2) return []
  return (suggestions.value?.clients ?? []).filter((c) => c.name.toLowerCase().includes(q)).slice(0, 5)
})
const clientRows = computed(() =>
  clientMatches.value.map((c) => ({ key: c.id, title: c.name, sub: c.attn || c.email || '', tint: c.tint, initial: initialsOf(c.name).toUpperCase() })),
)
/* Nama klien lama diketik persis → kolom yang masih kosong keisi sendiri (cuma pas ngetik, bukan pas buka Ubah). */
function onClientName() {
  clientOpen.value = true
  const key = draft.client.name.trim().toLowerCase()
  const c = key && (suggestions.value?.clients ?? []).find((x) => x.name.trim().toLowerCase() === key)
  if (!c) return
  for (const f of ['attn', 'address', 'email']) if (!draft.client[f] && c[f]) draft.client[f] = c[f]
}
function pickClient(i) {
  const c = clientMatches.value[i]
  clientOpen.value = false
  if (c) draft.client = { name: c.name, attn: c.attn ?? '', address: c.address ?? '', email: c.email ?? '' }
}

/* ---- tanggal ---- */
function setDueDays(n) {
  draft.dueDays = n
  draft.dueOn = addDays(draft.issuedOn, n)
}
function onIssued(e) {
  const v = e.target.value
  if (!v) return (e.target.value = draft.issuedOn)
  draft.issuedOn = v
  if (draft.dueDays) draft.dueOn = addDays(v, draft.dueDays)
  else if (draft.dueOn < v) draft.dueOn = v
}
function onDue(e) {
  const v = e.target.value
  if (!v || v < draft.issuedOn) return (e.target.value = draft.dueOn)
  draft.dueOn = v
  draft.dueDays = dueDaysOf(draft.issuedOn, v)
}

/* ---- nomor perkiraan (nomor asli kalau lagi Ubah) ---- */
const month = computed(() => draft.issuedOn.slice(0, 7))
const fallbackNumber = () => formatNumber(settings.prefix, month.value, (settings.lastNumberThisMonth ?? 0) + 1)
const estimate = ref('')
let asked = 0
async function askNumber() {
  const mine = ++asked
  let number
  try {
    number = await store.nextNumber(draft.issuedOn)
  } catch {
    number = fallbackNumber()
  }
  if (mine !== asked) return
  estimate.value = number
  emit('number', number)
}
if (props.invoice) emit('number', props.invoice.number)
else {
  estimate.value = fallbackNumber()
  askNumber()
  watch(month, askNumber)
}
const number = computed(() => props.invoice?.number ?? estimate.value)

/* ---- item, diskon, PPN ---- */
const addItem = () => draft.items.push(newItem())
const removeItem = (i) => draft.items.length > 1 && draft.items.splice(i, 1)
function onDiscount(e) {
  draft.discount = Number(String(e.target.value).replace(/\D/g, '').replace(/^0+/, '').slice(0, 10)) || 0
  e.target.value = formatAmount(draft.discount)
}
function onTaxPct(e) {
  draft.taxPct = Number(String(e.target.value).replace(/\D/g, '').slice(0, 3)) || 0
  e.target.value = String(draft.taxPct)
}
const sums = computed(() => totals(draft))

/* ---- pratinjau: kop dari Atur invoice TERBARU (itu yang disalin pas disimpen) ---- */
const LETTERHEAD = ['name', 'phone', 'email', 'initial', 'bank', 'accountNo', 'accountName', 'opening', 'closing', 'signature']
const previewInvoice = computed(() => ({
  number: number.value,
  letterhead: Object.fromEntries(LETTERHEAD.map((k) => [k, settings[k] ?? null])),
  client: draft.client, issuedOn: draft.issuedOn, dueOn: draft.dueOn, subject: draft.subject, paidOn: props.invoice?.paidOn ?? null,
  items: draft.items, discount: draft.discount, taxOn: draft.taxOn, taxPct: draft.taxPct, notes: draft.notes,
}))

/* ---- error ---- */
const itemErrors = (i) => {
  const out = {}
  for (const f of ['desc', 'detail', 'qty', 'unit', 'price']) out[f] = errors.value[`items.${i}.${f}`]
  return out
}
const SLOT = /^(client\.(name|attn|address|email)|issuedOn|dueOn|subject|items|items\.\d+\.(desc|detail|qty|unit|price)|discount|taxPct|notes)$/
// Error 422 di luar kolom yang punya tempat sendiri tetep harus keliatan (mis. `settings`).
const orphanErrors = computed(() => Object.entries(errors.value).filter(([k, v]) => v && !SLOT.test(k)))

/* Enter / "next" di keyboard: pindah ke kolom berikutnya, bukan submit form. Kolom terakhir = tutup keyboard. */
function onEnter(e) {
  const inputs = [...(formEl.value?.querySelectorAll('input[data-nav]') ?? [])]
  const next = inputs[inputs.indexOf(e.target) + 1]
  if (next) next.focus()
  else e.target.blur()
}

const payload = () => ({
  client: { name: draft.client.name.trim(), attn: draft.client.attn.trim(), address: draft.client.address.trim(), email: draft.client.email.trim() },
  issuedOn: draft.issuedOn, dueOn: draft.dueOn, subject: draft.subject.trim(),
  items: draft.items.map((it) => ({ desc: it.desc.trim(), detail: it.detail.trim(), qty: it.qty, unit: it.unit, price: it.price })),
  discount: draft.discount, taxOn: draft.taxOn, taxPct: draft.taxPct, notes: draft.notes.map((n) => n.trim()).filter(Boolean),
})

async function showErrors(next) {
  errors.value = next
  await nextTick()
  formEl.value?.querySelector('.err')?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
}

async function save() {
  if (saving.value) return
  error.value = ''
  if (!draft.client.name.trim()) return showErrors({ 'client.name': 'Nama klien belum diisi' })
  errors.value = {}
  saving.value = true
  try {
    const saved = props.invoice ? await store.update(props.invoice.id, payload()) : await store.create(payload())
    // Emit DULU: induk bakal pindah halaman, jangan sampai kehilangan sinyal.
    emit('saved', saved)
  } catch (err) {
    if (err?.fields) {
      await showErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])))
    } else {
      error.value = apiErrorMessage(err)
    }
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.fcard { padding: 14px; }
.items { padding: 0; }
.fcol > .label { margin: 18px 8px 10px; }
.fcol > .label:first-child { margin-top: 6px; }
.label small { color: var(--muted); font-weight: 500; }
.sugwrap { position: relative; }
.fld { display: block; margin-top: 12px; }
.fld.first { margin-top: 0; }
.fld > span { display: block; font-size: 12px; font-weight: 700; color: var(--muted); margin: 0 0 6px 4px; }
.in { display: block; width: 100%; border: 0; outline: 0; background: var(--soft); border-radius: 16px; padding: 13px 14px; font: 600 16px var(--ion-font-family); color: var(--text); letter-spacing: -0.01em; }
.in::placeholder { color: var(--muted); font-weight: 500; opacity: .8; }
textarea.in { resize: none; line-height: 1.45; font-weight: 500; }
.in:focus, .in:focus-within { box-shadow: 0 0 0 2px var(--ink); }
.in.big { font-size: 17px; font-weight: 700; }
.in.small { font-size: 16px; }
.err { color: var(--red); font-size: 12.5px; font-weight: 600; margin: 6px 6px 0; }
.hint { font-size: 12px; color: var(--muted); margin: 8px 4px 0; font-weight: 500; line-height: 1.45; }
.hint b { color: var(--text); font-weight: 700; }
.grow { flex: 1; min-width: 0; }
.datebtn { display: flex; align-items: center; gap: 9px; text-align: left; cursor: pointer; position: relative; overflow: hidden; }
.datebtn svg { color: var(--muted); flex: none; }
.datebtn input, .dchip input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.dchip { position: relative; overflow: hidden; display: inline-flex; align-items: center; height: 36px; padding: 0 14px; border-radius: 99px; border: 0; background: var(--soft); font: 700 13px var(--ion-font-family); color: var(--text); cursor: pointer; }
.dchip.on { background: var(--ink); color: var(--on-ink); }
.money { position: relative; }
.money::before { content: 'Rp'; position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-weight: 700; color: var(--muted); font-size: 14px; pointer-events: none; }
.money .in { padding-left: 42px; font-variant-numeric: tabular-nums; font-weight: 700; }
.addline { width: 100%; height: 50px; border: 1.5px dashed rgba(138, 138, 130, .45); border-radius: 20px; background: transparent; font: 700 14px var(--ion-font-family); color: var(--text); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 10px; }
.swrow { display: flex; align-items: center; gap: 12px; margin-top: 16px; padding: 0 4px; }
.swrow b { display: block; font-size: 15px; }
.swrow small { display: block; font-size: 12.5px; color: var(--muted); font-weight: 600; margin-top: 1px; }
.in.pct { width: 70px; text-align: center; flex: none; }
.sw { width: 52px; height: 32px; border-radius: 99px; background: var(--soft); border: 0; position: relative; cursor: pointer; flex: none; transition: background .25s; }
.sw::after { content: ''; position: absolute; top: 3px; left: 3px; width: 26px; height: 26px; border-radius: 99px; background: #fff; box-shadow: 0 2px 6px rgba(0, 0, 0, .2); transition: transform .3s var(--spring); }
.sw.on { background: var(--lime); }
.sw.on::after { transform: translateX(20px); }
.note { display: flex; gap: 6px; align-items: flex-start; }
.note + .note { margin-top: 8px; }
.note .nn { width: 20px; text-align: center; font-weight: 800; color: var(--muted); font-size: 13px; padding-top: 13px; flex: none; }
.note .in { flex: 1; min-width: 0; }
.del { border: 0; background: transparent; color: var(--muted); cursor: pointer; padding: 12px 4px 4px; }
.totbar { position: fixed; left: 12px; right: 12px; bottom: calc(92px + env(safe-area-inset-bottom)); z-index: 25; display: flex; align-items: center; gap: 8px; padding: 7px 7px 7px 20px; border-radius: 99px; background: var(--glass); backdrop-filter: blur(22px) saturate(1.6); -webkit-backdrop-filter: blur(22px) saturate(1.6); box-shadow: 0 0 0 1px var(--hair), 0 18px 40px -16px rgba(0, 0, 0, .3); }
.totbar .k { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .14em; }
.totbar .v { font-size: 19px; font-weight: 800; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ghostbtn { height: 46px; padding: 0 16px; border: 0; border-radius: 99px; background: var(--soft); color: var(--text); font: 700 14px var(--ion-font-family); display: flex; align-items: center; gap: 7px; cursor: pointer; }
.save { height: 46px; padding-left: 22px; }
.save:disabled { opacity: .7; }
.spin { width: 14px; height: 14px; border-radius: 99px; border: 2px solid currentColor; border-top-color: transparent; animation: invspin .7s linear infinite; }
@keyframes invspin { to { transform: rotate(360deg); } }
@media (hover: hover) { .dchip:not(.on):hover, .ghostbtn:hover { box-shadow: 0 0 0 1.5px var(--text); } }

/* pratinjau layar penuh (HP) */
.pv { position: fixed; inset: 0; z-index: 65; background: var(--app-bg); display: flex; flex-direction: column; font-family: var(--ion-font-family); color: var(--text); }
.pvbar { display: flex; align-items: center; justify-content: space-between; padding: calc(env(safe-area-inset-top) + 14px) 14px 10px; font-size: 15px; }
.pvbody { flex: 1; overflow: auto; padding: 6px 12px 28px; }
.iconbtn { width: 42px; height: 42px; border: 0; border-radius: 99px; background: var(--soft); color: var(--text); display: grid; place-items: center; cursor: pointer; }
.iconbtn.ghost { background: transparent; }

@media (min-width: 768px) { .totbar { bottom: calc(12px + env(safe-area-inset-bottom)); } }
@media (min-width: 1100px) {
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
