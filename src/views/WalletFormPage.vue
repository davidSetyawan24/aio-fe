<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page narrow">
        <PageHeader eyebrow="Kartu & Rekening" back-to="/tabs/menu/kartu" back-label="Kartu & Rekening">
          <template v-if="isEdit"><b class="name">{{ original?.name ?? 'Kartu/rekening' }}</b>.<br /><span>Ubah detail</span></template>
          <template v-else>Tambah baru.<br /><span>Tabungan atau kartu kredit</span></template>
        </PageHeader>

        <p v-if="isEdit && ready && !original" class="hint">Kartu/rekening nggak ketemu. Mungkin udah dihapus.</p>

        <form v-if="!isEdit || original" class="rise" :class="{ shake }" style="--i: 2" @submit.prevent="save">
          <div v-if="!isEdit" class="seg" :class="{ right: kind === 'cc' }">
            <span class="ind" />
            <button type="button" data-kind="debit" :class="{ on: kind === 'debit' }" @click="kind = 'debit'">🏦 Tabungan</button>
            <button type="button" data-kind="cc" :class="{ on: kind === 'cc' }" @click="kind = 'cc'">💳 Kartu kredit</button>
          </div>

          <div v-if="kind === 'cc'" class="preview" :style="{ background: bankLook(bankName || 'Lainnya').grad }">
            <div class="pv-bank">{{ bankName || 'Bank' }}</div>
            <div class="pv-name">{{ name || 'Nama kartu' }}</div>
            <span class="pv-chip" />
            <span class="pv-exp">EXP {{ exp || 'BB/TT' }}</span>
            <span class="pv-lim">{{ limitNumber ? rpShort(limitNumber) : '' }}</span>
          </div>

          <div class="group-label">Bank</div>
          <div class="shell">
            <div class="core banks">
              <button v-for="b in [...QUICK_BANKS, 'Lainnya']" :key="b" type="button" class="bk" :class="{ on: bank === b }" :data-bank="b" @click="bank = b">
                <span class="b" :style="{ background: b === 'Lainnya' ? '#ECEBE6' : bankLook(b).tint }">{{ b === 'Lainnya' ? '…' : bankLook(b).short }}</span>{{ b }}
              </button>
            </div>
          </div>

          <div class="group-label">Detail</div>
          <div class="shell">
            <div class="core fields">
              <label v-for="(f, i) in visibleFields" :key="f.key" class="f">
                <span class="lbl">{{ f.label }}</span>
                <ion-input
                  :ref="(c) => (inputEls[f.key] = c?.$el)"
                  v-model="model[f.key]"
                  class="input"
                  :data-test="f.test"
                  :aria-label="f.label"
                  :placeholder="f.placeholder"
                  :inputmode="f.numeric ? 'numeric' : 'text'"
                  :maxlength="f.max"
                  :autocapitalize="f.numeric ? 'off' : 'words'"
                  :enterkeyhint="i === visibleFields.length - 1 ? 'done' : 'next'"
                  @keydown.enter.prevent="onEnter(i)"
                />
              </label>
              <div class="f">
                <span class="lbl">⭐ Sering dipake</span>
                <button type="button" class="toggle" :class="{ on: favorite }" role="switch" :aria-checked="String(favorite)" aria-label="Sering dipake" data-test="fav"
                  @click="favorite = !favorite" />
              </div>
            </div>
          </div>
          <p class="hint">Nggak ada nomor kartu, CVV, atau PIN — sengaja nggak disimpen.</p>
          <p v-if="error" class="error" role="alert">{{ error }}</p>

          <button type="submit" class="pill save" :disabled="busy">
            Simpan <span class="ic"><span v-if="busy" class="spin" /><PhCheck v-else :size="16" weight="bold" /></span>
          </button>
          <button v-if="isEdit" type="button" class="pill ghost del" data-test="delete" :disabled="busy" @click="confirmDelete">
            Hapus <span class="ic"><PhTrash :size="17" weight="bold" /></span>
          </button>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { actionSheetController, IonContent, IonInput, IonPage, toastController, useIonRouter } from '@ionic/vue'
import { useRoute } from 'vue-router'
import { PhCheck, PhTrash } from '@phosphor-icons/vue'
import PageHeader from '@/components/PageHeader.vue'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { bankLook, formatExpiry, parseExpiry, QUICK_BANKS, rp, rpShort } from '@/lib/wallet.js'
import { useWalletStore } from '@/stores/wallet.js'

const route = useRoute()
const ionRouter = useIonRouter()
const wallet = useWalletStore()

// Id dibaca SEKALI pas halaman dibikin: Ionic nyimpen halaman ketumpuk tetep hidup, sementara route global bisa
// pindah ke halaman lain yang juga punya :id (mis. profil/device/4) — jangan sampai form ini ikut ganti isi.
const pageId = route.params.id
const isEdit = computed(() => Boolean(pageId))
const original = computed(() => (pageId ? wallet.byId(pageId) : null))
const ready = ref(wallet.loaded)

const kind = ref('debit')
const bank = ref('')
const favorite = ref(false)
const model = reactive({ otherBank: '', name: '', exp: '', limit: '', stmt: '', due: '' })
const error = ref('')
const shake = ref(false)
const busy = ref(false)

const name = computed(() => model.name.trim())
const exp = computed(() => model.exp)
const bankName = computed(() => (bank.value === 'Lainnya' ? model.otherBank.trim() : bank.value))
const digits = (v) => String(v ?? '').replace(/\D/g, '')
const limitNumber = computed(() => Number(digits(model.limit)) || 0)

const FIELDS = [
  { key: 'otherBank', test: 'other-bank', label: 'Nama bank', placeholder: 'mis. Seabank', max: 40, when: () => bank.value === 'Lainnya' },
  { key: 'name', test: 'name', label: 'Nama', placeholder: 'mis. Jago Utama', max: 40 },
  { key: 'exp', test: 'exp', label: 'Expired', placeholder: 'opsional · BB/TT', max: 5, numeric: true },
  { key: 'limit', test: 'limit', label: 'Limit', placeholder: 'Rp0', max: 20, numeric: true, cc: true },
  { key: 'stmt', test: 'stmt', label: 'Tgl cetak tagihan', placeholder: 'tiap tgl …', max: 2, numeric: true, cc: true },
  { key: 'due', test: 'due', label: 'Tgl jatuh tempo', placeholder: 'tiap tgl …', max: 2, numeric: true, cc: true },
]
const visibleFields = computed(() => FIELDS.filter((f) => (!f.cc || kind.value === 'cc') && (!f.when || f.when())))

// Format sambil ngetik: expired jadi BB/TT, limit jadi Rp20.000.000.
watch(
  () => model.exp,
  (v) => {
    let d = digits(v).slice(0, 4)
    if (d.length > 2) d = `${d.slice(0, 2)}/${d.slice(2)}`
    if (d !== v) model.exp = d
  },
)
watch(
  () => model.limit,
  (v) => {
    const n = Number(digits(v))
    const formatted = n ? rp(n) : ''
    if (formatted !== v) model.limit = formatted
  },
)

function fill(s) {
  if (!s) return
  kind.value = s.kind
  const quick = QUICK_BANKS.find((b) => b.toLowerCase() === (s.bank ?? '').toLowerCase())
  bank.value = quick ?? 'Lainnya'
  Object.assign(model, {
    otherBank: quick ? '' : (s.bank ?? ''),
    name: s.name,
    exp: formatExpiry(s.expMonth, s.expYear),
    limit: s.creditLimit ? rp(s.creditLimit) : '',
    stmt: s.statementDay ? String(s.statementDay) : '',
    due: s.dueDay ? String(s.dueDay) : '',
  })
  favorite.value = s.favorite
}
watch(original, fill, { immediate: true })

onMounted(async () => {
  if (!isEdit.value || wallet.loaded) return
  try {
    await wallet.load()
  } finally {
    ready.value = true
  }
})

/* Enter / "next" pindah ke kolom berikutnya; kolom terakhir = simpan (pola Ganti password). */
const inputEls = {}
function onEnter(i) {
  const next = visibleFields.value[i + 1]
  if (next) inputEls[next.key]?.setFocus?.()
  else save()
}

function dayOf(v, label) {
  if (!v) return { error: `${label} wajib diisi.` }
  const n = Number(v)
  return Number.isInteger(n) && n >= 1 && n <= 31 ? { value: n } : { error: `${label} 1–31.` }
}

/** Cek isian & bikin data buat dikirim. Balikin { error } atau { data }. */
function buildPayload() {
  if (!bank.value) return { error: 'Pilih bank dulu.' }
  if (!bankName.value) return { error: 'Nama bank wajib diisi.' }
  if (!name.value) return { error: 'Nama wajib diisi.' }
  const expiry = parseExpiry(model.exp)
  if (!expiry) return { error: 'Expired formatnya BB/TT, bulan 01–12.' }
  const data = { bank: bankName.value, name: name.value, ...expiry, favorite: favorite.value }
  if (kind.value === 'cc') {
    if (!limitNumber.value) return { error: 'Limit kartu kredit wajib diisi.' }
    const stmt = dayOf(model.stmt, 'Tanggal cetak tagihan')
    if (stmt.error) return stmt
    const due = dayOf(model.due, 'Tanggal jatuh tempo')
    if (due.error) return due
    Object.assign(data, { creditLimit: limitNumber.value, statementDay: stmt.value, dueDay: due.value })
  }
  return { data: isEdit.value ? data : { kind: kind.value, ...data } }
}

function doShake() {
  shake.value = false
  requestAnimationFrame(() => {
    shake.value = true
    setTimeout(() => (shake.value = false), 500)
  })
}
const showToast = async (message) => (await toastController.create({ message, duration: 2500, position: 'top', cssClass: 'aio-toast' })).present()
const goBack = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate('/tabs/menu/kartu', 'back', 'replace'))

async function save() {
  if (busy.value) return
  const { error: invalid, data } = buildPayload()
  if (invalid) {
    error.value = invalid
    doShake()
    return
  }
  error.value = ''
  busy.value = true
  try {
    if (isEdit.value) await wallet.update(original.value.id, data)
    else await wallet.create(data)
  } catch (err) {
    error.value = apiErrorMessage(err)
    doShake()
    return
  } finally {
    busy.value = false
  }
  goBack()
  await showToast(isEdit.value ? 'Disimpan.' : `${data.name} ditambah.`)
}

async function confirmDelete() {
  const label = original.value.name
  const sheet = await actionSheetController.create({
    header: `Hapus ${label}?`,
    subHeader: 'Pengeluaran lama yang pakai ini tetep nyimpen namanya.',
    buttons: [
      { text: 'Hapus', role: 'destructive', data: 'delete' },
      { text: 'Batal', role: 'cancel' },
    ],
  })
  await sheet.present()
  const { data } = await sheet.onDidDismiss()
  if (data !== 'delete') return
  busy.value = true
  try {
    await wallet.remove(original.value.id)
  } catch (err) {
    error.value = apiErrorMessage(err)
    busy.value = false
    return
  }
  busy.value = false
  goBack()
  await showToast(`${label} dihapus.`)
}
</script>

<style scoped>
.narrow { max-width: 620px; }
.name { color: var(--text); font-weight: 800; }
.seg { position: relative; display: flex; padding: 4px; border-radius: 18px; background: var(--soft); margin-bottom: 18px; }
.seg button { position: relative; z-index: 1; flex: 1; height: 42px; border: 0; border-radius: 14px; background: transparent; color: var(--muted);
  font: 700 14px var(--ion-font-family); cursor: pointer; transition: color .3s; }
.seg button.on { color: var(--text); }
.seg .ind { position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc(50% - 4px); border-radius: 14px; background: var(--card); box-shadow: 0 2px 8px rgba(0, 0, 0, .08);
  transition: transform .45s var(--spring); }
.seg.right .ind { transform: translateX(100%); }
.preview { position: relative; width: 260px; height: 160px; margin: 0 auto 6px; padding: 18px; border-radius: 20px; color: #fff; overflow: hidden;
  box-shadow: 0 24px 40px -22px rgba(0, 0, 0, .55); transition: background .4s; }
.preview::before { content: ''; position: absolute; right: -40px; top: -50px; width: 160px; height: 160px; border-radius: 99px; background: rgba(255, 255, 255, .16); }
.pv-bank { font-weight: 800; font-size: 15px; }
.pv-name { font-size: 13px; opacity: .85; margin-top: 2px; }
.pv-chip { position: absolute; left: 18px; top: 70px; width: 34px; height: 25px; border-radius: 6px; background: rgba(255, 233, 160, .9); }
.pv-exp { position: absolute; left: 18px; bottom: 16px; font-size: 12px; font-weight: 700; letter-spacing: .06em; opacity: .9; }
.pv-lim { position: absolute; right: 18px; bottom: 16px; font-size: 12px; font-weight: 700; opacity: .9; }
.group-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 22px 8px 10px; }
.banks { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 14px 14px; }
.bk { display: flex; align-items: center; gap: 7px; height: 40px; padding: 0 12px 0 5px; border: 0; border-radius: 99px; background: var(--soft); color: var(--text);
  font: 600 13.5px var(--ion-font-family); cursor: pointer; transition: background-color .3s var(--spring), color .3s; }
.bk .b { width: 30px; height: 30px; border-radius: 99px; display: grid; place-items: center; font-size: 10px; font-weight: 800; color: #141410; }
.bk.on { background: var(--ink); color: var(--on-ink); }
.fields { padding: 4px 0; }
.f { display: flex; align-items: center; gap: 12px; min-height: 58px; padding: 6px 16px; }
.f + .f { box-shadow: inset 0 1px 0 var(--hair); }
.lbl { width: 128px; flex-shrink: 0; font-size: 13.5px; color: var(--muted); font-weight: 500; }
.input { flex: 1; min-width: 0; min-height: 0; text-align: right; --background: transparent; --color: var(--text); --placeholder-color: var(--muted); --placeholder-opacity: 1;
  --padding-start: 0; --padding-end: 0; --padding-top: 0; --padding-bottom: 0; --highlight-height: 0; font: 600 16px var(--ion-font-family); }
.toggle { position: relative; width: 52px; height: 32px; margin-left: auto; flex-shrink: 0; border-radius: 99px; border: 0; background: var(--soft); cursor: pointer;
  transition: background-color .35s var(--spring); }
.toggle::after { content: ''; position: absolute; left: 3px; top: 3px; width: 26px; height: 26px; border-radius: 99px; background: #fff; box-shadow: 0 2px 6px rgba(0, 0, 0, .18);
  transition: transform .45s var(--spring); }
.toggle.on { background: var(--ink); }
.toggle.on::after { transform: translateX(20px); background: var(--app-bg); }
.hint { color: var(--muted); font-size: 12.5px; margin: 10px 6px 0; line-height: 1.45; }
.error { color: var(--red); font-size: 13px; font-weight: 600; margin: 8px 6px 0; }
.save, .del { width: 100%; justify-content: space-between; height: 58px; padding: 8px 8px 8px 22px; font-size: 16px; }
.save { margin-top: 18px; }
.del { margin-top: 12px; }
.save .ic, .del .ic { width: 42px; height: 42px; }
.del .ic { background: rgba(240, 83, 61, .14); color: var(--red); }
.save:disabled, .del:disabled { opacity: .6; }
.spin { width: 16px; height: 16px; border-radius: 99px; border: 2.5px solid rgba(28, 36, 0, .25); border-top-color: var(--lime-ink); animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.shake { animation: sh .45s; }
@keyframes sh { 20%, 60% { translate: -8px 0; } 40%, 80% { translate: 8px 0; } }
</style>
