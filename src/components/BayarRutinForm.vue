<template>
  <!-- novalidate: cek isian dari kita sendiri (bahasa Indonesia), bukan pesan bawaan browser. -->
  <form class="bform" :class="{ shake }" novalidate @submit.prevent="save">
    <p v-if="isEdit && ready && !bill" class="hint">Bayar rutinnya nggak ketemu. Mungkin udah dihapus.</p>

    <template v-if="!isEdit || bill">
      <div class="preview" data-test="preview">
        <div class="big" :style="{ background: tint }">{{ emoji }}</div>
        <div class="grow">
          <b>{{ name.trim() || 'Nama bayar rutin' }}</b>
          <span>{{ amount ? rp(amount) : 'Rp0' }} · {{ scheduleLine }}</span>
        </div>
      </div>

      <label class="amount">
        <small>Nominal</small>
        <span class="num">
          <span class="rp">Rp</span>
          <input ref="amountEl" data-test="amount" aria-label="Nominal" type="text" inputmode="numeric" autocomplete="off" placeholder="0" enterkeyhint="next"
            :value="amountText" @input="onAmount" @keydown.enter.prevent="nameEl?.focus()" />
        </span>
      </label>

      <div class="group-label">Nama</div>
      <input ref="nameEl" v-model="name" class="text" data-test="name" aria-label="Nama bayar rutin" placeholder="mis. Netflix" maxlength="40" autocapitalize="words"
        enterkeyhint="done" @keydown.enter.prevent="$event.target.blur()" />

      <div class="group-label">Emoji</div>
      <div class="shell"><div class="core emojis">
        <button v-for="e in BILL_EMOJIS" :key="e" type="button" class="em" :class="{ on: emoji === e }" :aria-label="`Emoji ${e}`" @click="emoji = e">{{ e }}</button>
      </div></div>

      <div class="group-label">Warna</div>
      <div class="shell"><div class="core tints">
        <button v-for="t in CATEGORY_TINTS" :key="t" type="button" class="tn" :class="{ on: tint === t }" :style="{ background: t }" :aria-label="`Warna ${t}`"
          :aria-pressed="String(tint === t)" @click="tint = t"><PhCheck v-if="tint === t" :size="15" weight="bold" /></button>
      </div></div>

      <div class="group-label">Jadwal</div>
      <div class="seg">
        <button type="button" data-freq="monthly" :class="{ on: freq === 'monthly' }" @click="freq = 'monthly'">Tiap bulan</button>
        <button type="button" data-freq="yearly" :class="{ on: freq === 'yearly' }" @click="freq = 'yearly'">Tiap tahun</button>
      </div>
      <div class="shell sched"><div class="core">
        <div v-if="freq === 'yearly'" class="months">
          <button v-for="(b, i) in BLN" :key="b" type="button" class="dy" :class="{ on: month === i + 1 }" :data-month="i + 1" @click="month = i + 1">{{ b }}</button>
        </div>
        <div class="days">
          <button v-for="d in 31" :key="d" type="button" class="dy" :class="{ on: day === d }" :data-day="d" @click="day = d">{{ d }}</button>
        </div>
      </div></div>
      <p v-if="day >= 29" class="hint">Bulan yang nggak sampai tgl {{ day }} → jatuh tempo di tanggal terakhir bulan itu.</p>

      <div v-if="ask" class="ask" data-test="ask">
        <b>Yang {{ askDate }} udah lunas?</b>
        <span>Tanggalnya udah lewat. Kalau belum lunas, langsung muncul "Telat".</span>
        <div class="chips">
          <button type="button" class="cp" :class="{ on: paidAnswer === true }" data-paid="yes" @click="paidAnswer = true">Udah lunas</button>
          <button type="button" class="cp" :class="{ on: paidAnswer === false }" data-paid="no" @click="paidAnswer = false">Belum</button>
        </div>
      </div>

      <div class="group-label">Dibayar dari</div>
      <div class="chips">
        <button v-for="s in sourceChips" :key="s.id" type="button" class="cp src" :class="{ on: s.id === sourceId }" :data-src="s.id" @click="sourceId = s.id">
          <span class="e" :class="{ txt: s.kind !== 'cash' }" :style="{ background: badge(s).tint }">{{ badge(s).text }}</span>{{ s.name }}
        </button>
        <button type="button" class="cp ghost" data-test="more-src" @click="sheetOpen = true">Lainnya<PhCaretDown :size="14" weight="bold" /></button>
      </div>

      <div class="group-label">Pengingat <small>{{ reminders.length }}/3</small></div>
      <BillReminderPicker v-model="reminders" />
      <p class="hint">Notif masuk lonceng di app. Kalau udah ditandain Lunas, pengingat bulan itu nggak bunyi lagi.</p>

      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <button type="submit" class="pill save" data-test="save" :disabled="Boolean(busy)">
        Simpan <span class="ic"><span v-if="busy === 'save'" class="spin" /><PhCheck v-else :size="16" weight="bold" /></span>
      </button>
      <template v-if="isEdit">
        <button type="button" class="pill ghost del" data-test="delete" :disabled="Boolean(busy)" @click="confirmDelete">
          Hapus bayar rutin <span class="ic"><PhTrash :size="17" weight="bold" /></span>
        </button>
        <p class="hint center">Hapus = ilang dari daftar & Agenda (mis. cicilan udah lunas semua).</p>
      </template>
    </template>

    <!-- Ke ion-app: form ini juga dipakai di panel PC (z-index 41) — sheet harus di atasnya & sejajar sama popup Ionic. -->
    <Teleport to="ion-app">
      <div class="br-src-scrim" :class="{ show: sheetOpen }" @click="sheetOpen = false" />
      <div class="br-src-sheet" :class="{ show: sheetOpen }" role="dialog" aria-label="Dibayar dari mana?">
        <div class="handle" />
        <h3>Dibayar dari mana?</h3>
        <div v-for="g in sourceGroups" :key="g.label">
          <div class="group-label">{{ g.label }}</div>
          <div class="shell"><div class="core srcs">
            <button v-for="s in g.items" :key="s.id" type="button" class="src" :class="{ on: s.id === sourceId }" :data-pick="s.id" @click="pickSource(s.id)">
              <span class="b" :style="{ background: badge(s).tint }">{{ badge(s).text }}</span>
              <span class="grow">{{ s.name }}{{ s.favorite ? ' ⭐' : '' }}</span>
              <span class="ck"><PhCheck :size="14" weight="bold" /></span>
            </button>
          </div></div>
        </div>
      </div>
    </Teleport>
  </form>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { actionSheetController } from '@ionic/vue'
import { PhCaretDown, PhCheck, PhTrash } from '@phosphor-icons/vue'
import BillReminderPicker from '@/components/BillReminderPicker.vue'
import { BLN } from '@/lib/agenda.js'
import { BILL_EMOJIS, DEFAULT_REMINDERS, dueDate, firstPeriod, needsPaidAnswer, shortDue, sortReminders } from '@/lib/bayarRutin.js'
import { CATEGORY_TINTS } from '@/lib/categories.js'
import { formatAmount, localToday, parseAmount } from '@/lib/duit.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { bankLook, rp } from '@/lib/wallet.js'
import { useBayarRutinStore } from '@/stores/bayarRutin.js'
import { useWalletStore } from '@/stores/wallet.js'

/**
 * Isi form Bayar Rutin (baru / ubah) — dipakai halaman form (HP) & panel geser (PC).
 * Nggak pindah halaman sendiri: sukses simpan/hapus → emit `done(pesan)`, yang make yang nutup & nampilin toast.
 */
const props = defineProps({
  /** null = Bayar Rutin baru. */
  billId: { type: [Number, String], default: null },
})
const emit = defineEmits(['done'])

const MAX_AMOUNT = 2_000_000_000
const store = useBayarRutinStore()
const wallet = useWalletStore()
const isEdit = computed(() => props.billId != null && props.billId !== '')
const bill = computed(() => (isEdit.value ? store.billById(props.billId) : null))
const ready = ref(!isEdit.value || Boolean(bill.value))
const today = computed(() => store.today ?? localToday())

const busy = ref(false)
// Panel ngecek ini: selama lagi nyimpen / hapus, panel nggak boleh ditutup.
defineExpose({ busy })

const amountEl = ref(null)
const nameEl = ref(null)
const amountText = ref('')
const amount = computed(() => parseAmount(amountText.value))
const name = ref('')
const emoji = ref(BILL_EMOJIS[0])
const tint = ref(CATEGORY_TINTS[4])
const freq = ref('monthly')
const day = ref(null)
const month = ref(null)
const sourceId = ref(null)
const reminders = ref(DEFAULT_REMINDERS.map((r) => ({ ...r })))
const paidAnswer = ref(null)
const error = ref('')
const shake = ref(false)
const sheetOpen = ref(false)

// Diisi SEKALI dari data yang ada. Daftar dimuat ulang di belakang (abis centang / simpen) → isian yang lagi diketik jangan ketimpa.
let filled = false
watch(
  bill,
  (b) => {
    if (!b || filled) return
    filled = true
    amountText.value = formatAmount(b.amount)
    name.value = b.name
    emoji.value = b.emoji
    tint.value = b.tint
    freq.value = b.freq
    day.value = b.day
    month.value = b.month
    sourceId.value = b.source.id
    reminders.value = b.reminders.map((r) => ({ ...r }))
    ready.value = true
  },
  { immediate: true },
)
// Jadwal berubah → jawaban "udah lunas?" yang lama nggak berlaku.
watch([freq, day, month], () => (paidAnswer.value = null))

function onAmount(e) {
  const digits = String(e.target.value).replace(/\D/g, '').replace(/^0+/, '').slice(0, 10)
  amountText.value = formatAmount(Number(digits))
  e.target.value = amountText.value
}

/* ---- jadwal & kotak kuning ---- */
const monthValue = computed(() => (freq.value === 'yearly' ? month.value : null))
const scheduleLine = computed(() => {
  if (!day.value) return 'jadwal belum dipilih'
  if (freq.value === 'monthly') return `tiap bulan tgl ${day.value}`
  return month.value ? `tiap tahun ${day.value} ${BLN[month.value - 1]}` : 'pilih bulannya'
})
const scheduleChanged = computed(() => !bill.value || freq.value !== bill.value.freq || day.value !== bill.value.day || monthValue.value !== bill.value.month)
const startMonth = computed(() => {
  const b = bill.value
  if (b && freq.value === b.freq && monthValue.value === b.month) return b.startMonth
  return firstPeriod(freq.value, monthValue.value, today.value)
})
const ask = computed(() => {
  if (!day.value || (freq.value === 'yearly' && !month.value)) return false
  if (isEdit.value && (!scheduleChanged.value || bill.value?.currentPaid)) return false
  return needsPaidAnswer({ freq: freq.value, day: day.value, month: monthValue.value, startMonth: startMonth.value }, today.value)
})
const askDate = computed(() => shortDue(dueDate(day.value ?? 1, today.value.slice(0, 7))))

/* ---- rekening ---- */
const usableSources = computed(() => {
  const list = [...wallet.items]
  const cur = bill.value?.source
  if (cur && !list.some((s) => s.id === cur.id)) list.push({ ...cur, favorite: false })
  return list
})
const sourceChips = computed(() => {
  const favs = usableSources.value.filter((s) => s.favorite)
  const picked = usableSources.value.find((s) => s.id === sourceId.value)
  return picked && !favs.includes(picked) ? [...favs, picked] : favs
})
const sourceGroups = computed(() =>
  [
    { label: 'Cash', items: usableSources.value.filter((s) => s.kind === 'cash') },
    { label: 'Tabungan', items: usableSources.value.filter((s) => s.kind === 'debit') },
    { label: 'Kartu kredit', items: usableSources.value.filter((s) => s.kind === 'cc') },
  ].filter((g) => g.items.length),
)
const badge = (s) => (s.kind === 'cash' ? { tint: '#E4F7C4', text: '💵' } : { tint: bankLook(s.bank).tint, text: bankLook(s.bank).short })
function pickSource(id) {
  sourceId.value = id
  sheetOpen.value = false
}
watch(
  () => wallet.items,
  (items) => {
    if (sourceId.value || isEdit.value || !items.length) return
    sourceId.value = (items.find((s) => s.favorite) ?? items[0]).id
  },
  { immediate: true },
)

// Esc pas daftar rekening kebuka: tutup daftarnya aja (panel PC nggak ikut ketutup).
const onKey = (e) => {
  if (e.key === 'Escape' && sheetOpen.value) sheetOpen.value = false
}
document.addEventListener('keydown', onKey)
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))

onMounted(async () => {
  if (!wallet.loaded) wallet.load().catch(() => {})
  if (isEdit.value && !bill.value) {
    try {
      await store.load()
    } catch {
      /* pesan "nggak ketemu" di bawah */
    } finally {
      ready.value = true
    }
  }
})

/* ---- simpan / hapus ---- */
function doShake() {
  shake.value = false
  requestAnimationFrame(() => {
    shake.value = true
    setTimeout(() => (shake.value = false), 500)
  })
}
function problem() {
  if (amount.value <= 0) return 'Isi nominalnya dulu.'
  if (amount.value > MAX_AMOUNT) return 'Maksimal Rp2 miliar.'
  if (!name.value.trim()) return 'Isi namanya dulu.'
  if (!day.value) return 'Pilih tanggal jatuh temponya dulu.'
  if (freq.value === 'yearly' && !month.value) return 'Pilih bulannya dulu.'
  if (!sourceId.value) return 'Pilih dibayar dari mana dulu.'
  if (ask.value && paidAnswer.value === null) return 'Jawab dulu: udah lunas atau belum?'
  return ''
}

async function save() {
  if (busy.value) return
  error.value = problem()
  if (error.value) return doShake()
  const body = {
    name: name.value.trim(),
    emoji: emoji.value,
    tint: tint.value,
    amount: amount.value,
    freq: freq.value,
    day: day.value,
    month: monthValue.value,
    sourceId: sourceId.value,
    reminders: sortReminders(reminders.value),
    ...(ask.value ? { paidCurrent: paidAnswer.value } : {}),
  }
  busy.value = 'save'
  try {
    if (isEdit.value) await store.update(bill.value.id, body)
    else await store.create(body)
  } catch (err) {
    error.value = apiErrorMessage(err)
    doShake()
    // Server bilang tanggalnya udah lewat padahal di sini belum (halaman kebuka lewat tengah malem) → muat ulang "hari ini" biar kotak kuningnya muncul.
    if (err?.fields?.paidCurrent) await store.load(store.month ?? undefined).catch(() => {})
    return
  } finally {
    busy.value = false
  }
  emit('done', isEdit.value ? 'Disimpen.' : `${body.name} ditambahin 🔁`)
}

async function confirmDelete() {
  if (busy.value) return
  const label = bill.value.name
  const sheet = await actionSheetController.create({
    header: `Hapus ${label}?`,
    subHeader: 'Catatan lunasnya ikut kehapus, ilang dari Agenda juga.',
    buttons: [
      { text: 'Hapus', role: 'destructive', data: 'delete' },
      { text: 'Batal', role: 'cancel' },
    ],
  })
  await sheet.present()
  const { data } = await sheet.onDidDismiss()
  if (data !== 'delete') return
  busy.value = 'delete'
  try {
    await store.remove(bill.value.id)
  } catch (err) {
    error.value = apiErrorMessage(err)
    busy.value = false
    return
  }
  busy.value = false
  emit('done', `${label} dihapus.`)
}
</script>

<style scoped>
.preview { display: flex; align-items: center; gap: 14px; padding: 14px; border-radius: 24px; background: var(--card); box-shadow: 0 0 0 1px var(--hair); }
.preview .big { width: 56px; height: 56px; border-radius: 18px; display: grid; place-items: center; font-size: 28px; flex-shrink: 0; transition: background-color .3s var(--spring); }
.preview b { display: block; font-size: 17px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.preview span { display: block; font-size: 12.5px; color: var(--muted); font-weight: 600; margin-top: 3px; }

.amount { display: block; text-align: center; padding: 20px 0 6px; }
.amount small { display: block; font-size: 12px; font-weight: 700; color: var(--muted); }
.amount .num { display: flex; align-items: baseline; justify-content: center; gap: 6px; margin-top: 4px; }
.amount .rp { font-size: 22px; font-weight: 800; color: var(--muted); }
.amount input { width: 240px; max-width: 70vw; border: 0; outline: 0; background: transparent; color: var(--text); caret-color: var(--green);
  font: 800 48px var(--ion-font-family); letter-spacing: -0.045em; font-variant-numeric: tabular-nums; }
.amount input::placeholder { color: var(--muted); opacity: .45; }

.group-label { display: flex; justify-content: space-between; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 20px 8px 8px; }
.group-label small { text-transform: none; letter-spacing: 0; font-size: 12px; }
.text { width: 100%; height: 52px; padding: 0 16px; border: 0; outline: 0; border-radius: 18px; background: var(--soft); color: var(--text); font: 600 16px var(--ion-font-family); }
.text::placeholder { color: var(--muted); font-weight: 500; }
.core { padding: 0; }
.emojis { display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px; padding: 10px; }
.em { aspect-ratio: 1; border: 0; border-radius: 12px; background: transparent; font-size: 20px; cursor: pointer; }
.em.on { background: var(--soft); box-shadow: inset 0 0 0 2px var(--ink); }
.tints { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px; }
.tn { width: 32px; height: 32px; border: 0; border-radius: 99px; cursor: pointer; display: grid; place-items: center; color: #141410; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .06); }
.tn.on { box-shadow: 0 0 0 2px var(--app-bg), 0 0 0 4px var(--ink); }

.seg { display: flex; padding: 4px; border-radius: 99px; background: var(--soft); }
.seg button { flex: 1; height: 38px; border: 0; border-radius: 99px; background: transparent; font: 700 13.5px var(--ion-font-family); color: var(--muted); cursor: pointer; }
.seg button.on { background: var(--card); color: var(--text); box-shadow: 0 1px 2px rgba(0, 0, 0, .06), 0 6px 14px -6px rgba(0, 0, 0, .18); }
.sched { margin-top: 8px; }
.days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; padding: 10px; }
.months { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; padding: 10px 10px 0; }
.dy { height: 38px; border: 0; border-radius: 12px; background: transparent; color: var(--text); font: 700 14px var(--ion-font-family); cursor: pointer; font-variant-numeric: tabular-nums; }
.dy.on { background: var(--ink); color: var(--lime); }
:root.theme-dark .dy.on { color: #141410; }
.hint { font-size: 12px; color: var(--muted); margin: 8px 8px 0; line-height: 1.5; }
.hint.center { text-align: center; }

.ask { margin-top: 18px; padding: 14px 16px; border-radius: 20px; background: rgba(245, 165, 36, .12); box-shadow: inset 0 0 0 1px rgba(245, 165, 36, .3); }
.ask b { display: block; font-size: 14.5px; }
.ask > span { display: block; font-size: 12.5px; color: var(--muted); margin: 3px 0 10px; font-weight: 600; }

.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.cp { display: inline-flex; align-items: center; gap: 7px; height: 40px; padding: 0 14px; border: 0; border-radius: 99px; background: var(--card); box-shadow: 0 0 0 1px var(--hair);
  color: var(--text); font: 700 13.5px var(--ion-font-family); cursor: pointer; }
.cp.src { padding-left: 5px; }
.cp .e { width: 30px; height: 30px; border-radius: 99px; display: grid; place-items: center; font-size: 15px; color: #141410; }
.cp .e.txt { font-size: 10px; font-weight: 800; }
.cp.on { background: var(--ink); color: var(--on-ink); box-shadow: none; }
.cp.ghost { gap: 5px; background: transparent; box-shadow: inset 0 0 0 1.5px var(--hair); color: var(--muted); }

.error { color: var(--red); font-size: 13px; font-weight: 600; margin: 14px 6px 0; }
.save, .del { width: 100%; justify-content: space-between; height: 58px; padding: 8px 8px 8px 22px; font-size: 16px; }
.save { margin-top: 22px; }
.del { margin-top: 10px; }
.save .ic, .del .ic { width: 42px; height: 42px; }
.del .ic { background: rgba(240, 83, 61, .14); color: var(--red); }
.save:disabled, .del:disabled { opacity: .5; }
.spin { width: 16px; height: 16px; border-radius: 99px; border: 2.5px solid rgba(28, 36, 0, .25); border-top-color: var(--lime-ink); animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.shake { animation: sh .45s; }
@keyframes sh { 20%, 60% { translate: -8px 0; } 40%, 80% { translate: 8px 0; } }
</style>

<!-- Sheet rekening di-teleport ke ion-app → style global (diawali br-src-). Di atas panel PC (z-index 41). -->
<style>
.br-src-scrim { position: fixed; inset: 0; z-index: 50; background: rgba(0, 0, 0, .32); opacity: 0; pointer-events: none; transition: opacity .4s var(--spring); }
.br-src-scrim.show { opacity: 1; pointer-events: auto; }
.br-src-sheet { font-family: var(--ion-font-family); color: var(--text); position: fixed; left: 0; right: 0; bottom: 0; z-index: 51; max-width: 560px; max-height: 78vh; margin: 0 auto;
  overflow-y: auto; padding: 10px 14px calc(24px + env(safe-area-inset-bottom)); border-radius: 30px 30px 0 0; background: var(--app-bg); transform: translateY(105%);
  transition: transform .5s var(--spring); }
.br-src-sheet.show { transform: none; }
.br-src-sheet .handle { width: 40px; height: 5px; margin: 0 auto 12px; border-radius: 9px; background: var(--muted); opacity: .35; }
.br-src-sheet h3 { margin: 0 8px 4px; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
.br-src-sheet .group-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 16px 8px 8px; }
.br-src-sheet .srcs { padding: 4px 0; }
.br-src-sheet .src { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 14px; border: 0; background: transparent; color: var(--text); font: 600 15px var(--ion-font-family);
  text-align: left; cursor: pointer; }
.br-src-sheet .src + .src { box-shadow: inset 0 1px 0 var(--hair); }
.br-src-sheet .src .b { width: 36px; height: 36px; border-radius: 12px; display: grid; place-items: center; flex-shrink: 0; font-size: 11px; font-weight: 800; color: #141410; }
.br-src-sheet .src .ck { margin-left: auto; width: 26px; height: 26px; border-radius: 99px; display: none; place-items: center; background: var(--lime); color: var(--lime-ink); }
.br-src-sheet .src.on .ck { display: grid; }
</style>
