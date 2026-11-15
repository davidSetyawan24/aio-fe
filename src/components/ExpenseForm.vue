<template>
  <!-- novalidate: cek isian dari kita sendiri (bahasa Indonesia), bukan pesan bawaan browser. -->
  <form class="xform" :class="{ shake }" novalidate @submit.prevent="save(false)">
    <div class="topline">
      <span v-if="eyebrow" class="eyebrow"><span class="dot" />{{ eyebrow }}</span>
      <label class="datechip" :class="{ past: date !== today }" data-test="date-chip">
        <PhCalendarBlank :size="15" weight="bold" />
        <span>{{ date === today ? 'Hari ini' : dayLabel(date, today) }}</span>
        <input type="date" data-test="date" aria-label="Tanggal" :value="date" :max="today" min="2000-01-01" @change="onDate" />
      </label>
    </div>

    <div class="amount-wrap">
      <span class="blob" :style="{ background: blob }" />
      <label class="amount">
        <span class="rp">Rp</span>
        <span class="fit">
          <span class="mirror" aria-hidden="true">{{ amountText || '0' }}</span>
          <input
            ref="amountEl"
            data-test="amount"
            aria-label="Nominal"
            type="text"
            size="1"
            inputmode="numeric"
            autocomplete="off"
            placeholder="0"
            enterkeyhint="next"
            :value="amountText"
            @input="onAmount"
            @keydown.enter.prevent="noteEl?.focus()"
          />
        </span>
      </label>
      <div class="today-hint" data-test="today-hint">
        <template v-if="tooBig"><b class="bad">Nominal maksimal Rp1 miliar.</b></template>
        <template v-else-if="date !== today && budgetLeft === null">catatan tanggal lain · nggak masuk hitungan hari ini</template>
        <template v-else-if="date !== today">{{ pastHint }}</template>
        <template v-else-if="budgetLeft === null">hari ini udah keluar <b>{{ rp(todaySoFar) }}</b></template>
        <template v-else>
          <template v-if="budgetLeft >= 0">sisa jatah hari ini <b>{{ rp(budgetLeft) }}</b></template>
          <template v-else>jatah hari ini udah kelewat <b>{{ rp(-budgetLeft) }}</b></template>
          <span v-if="amount" class="after" :class="{ over: budgetAfter < 0 }" data-test="after">→ {{ budgetAfter < 0 ? `minus ${rp(-budgetAfter)}` : rp(budgetAfter) }}</span>
        </template>
      </div>
    </div>

    <div class="group-label">Buat apa</div>
    <div class="what">
      <PhPencilSimpleLine :size="20" />
      <input
        ref="noteEl"
        v-model="note"
        data-test="note"
        aria-label="Buat apa"
        placeholder="mis. Kopi Kenangan"
        autocomplete="off"
        autocapitalize="sentences"
        maxlength="60"
        enterkeyhint="done"
        @keydown.enter.prevent="noteEl?.blur()"
      />
    </div>
    <div class="suggest">
      <template v-if="shownSuggestions.length">
        <span class="sg-k">{{ note.trim() ? 'Pernah' : 'Terakhir' }}</span>
        <button v-for="s in shownSuggestions" :key="s.note" type="button" class="sg" data-test="suggestion" @mousedown.prevent @click="useSuggestion(s)">
          <span v-if="categoryOf(s.categoryId)" class="e" :style="{ background: categoryOf(s.categoryId).tint }">{{ categoryOf(s.categoryId).emoji }}</span>{{ s.note }}
        </button>
      </template>
    </div>

    <div class="group-label">Kategori</div>
    <div class="chips">
      <button v-for="c in categoryChips" :key="c.id" type="button" class="cp" :class="{ on: c.id === categoryId }" :data-cat="c.id" @click="categoryId = c.id">
        <span class="e" :style="{ background: c.tint }">{{ c.emoji }}</span>{{ c.name }}
      </button>
      <button type="button" class="cp add" data-test="new-cat" @click="newCategory"><PhPlus :size="15" weight="bold" />Baru</button>
    </div>

    <div class="group-label">Bayar pakai</div>
    <div class="chips">
      <button v-for="s in sourceChips" :key="s.id" type="button" class="cp" :class="{ on: s.id === sourceId }" :data-src="s.id" @click="sourceId = s.id">
        <span class="e" :class="{ txt: s.kind !== 'cash' }" :style="{ background: badge(s).tint }">{{ badge(s).text }}</span>{{ s.name }}
      </button>
      <button type="button" class="cp add" data-test="more-src" @click="sheetOpen = true">Lainnya<PhCaretDown :size="14" weight="bold" /></button>
    </div>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <button type="submit" class="pill save" data-test="save" :disabled="!canSave || busy">
      {{ isEdit ? 'Simpan perubahan' : 'Simpan' }} <span class="ic"><span v-if="busy === 'save'" class="spin" /><PhCheck v-else :size="16" weight="bold" /></span>
    </button>
    <button v-if="!isEdit" type="button" class="pill ghost again" data-test="again" :disabled="!canSave || busy" @click="save(true)">
      Simpan & catat lagi <span class="ic"><span v-if="busy === 'again'" class="spin dark" /><PhArrowCounterClockwise v-else :size="17" weight="bold" /></span>
    </button>
    <button v-if="isEdit" type="button" class="pill ghost del" data-test="delete" :disabled="Boolean(busy)" @click="confirmDelete">
      Hapus catatan <span class="ic"><PhTrash :size="17" weight="bold" /></span>
    </button>

    <!-- Ke body: elemen fixed di dalam ion-content nempel ke dasar konten, bukan dasar layar. -->
    <Teleport to="body">
    <div class="scrim" :class="{ show: sheetOpen }" @click="sheetOpen = false" />
    <div class="sheet" :class="{ show: sheetOpen }" role="dialog" aria-label="Bayar pakai apa?">
      <div class="handle" />
      <h3>Bayar pakai apa?</h3>
      <div v-for="g in sourceGroups" :key="g.label">
        <div class="group-label">{{ g.label }}</div>
        <div class="shell">
          <div class="core srcs">
            <button v-for="s in g.items" :key="s.id" type="button" class="src" :class="{ on: s.id === sourceId }" :data-pick="s.id" @click="pickSource(s.id)">
              <span class="b" :style="{ background: badge(s).tint }">{{ badge(s).text }}</span>
              <span class="grow">{{ s.name }}{{ s.favorite ? ' ⭐' : '' }}</span>
              <span class="ck"><PhCheck :size="14" weight="bold" /></span>
            </button>
          </div>
        </div>
      </div>
    </div>
    </Teleport>
  </form>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { actionSheetController, toastController, useIonRouter } from '@ionic/vue'
import { PhArrowCounterClockwise, PhCalendarBlank, PhCaretDown, PhCheck, PhPencilSimpleLine, PhPlus, PhTrash } from '@phosphor-icons/vue'
import { dayLabel, filterSuggestions, formatAmount, localToday, parseAmount } from '@/lib/duit.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { bankLook, rp } from '@/lib/wallet.js'
import { useCategoriesStore } from '@/stores/categories.js'
import { useExpensesStore } from '@/stores/expenses.js'
import { useWalletStore } from '@/stores/wallet.js'

const MAX_AMOUNT = 1_000_000_000

const props = defineProps({
  /** Catatan yang diubah. Kosong = catat baru. */
  expense: { type: Object, default: null },
  /** Fokus ke nominal begitu kebuka (keyboard angka langsung muncul). */
  autofocus: { type: Boolean, default: false },
  /** Label kecil di sebelah chip tanggal. */
  eyebrow: { type: String, default: '' },
  /** PC: "+ Baru" kategori minta halaman buka panel (emit `new-category`), bukan pindah ke halaman form kategori. */
  newCategoryInline: { type: Boolean, default: false },
})
const emit = defineEmits(['saved', 'deleted', 'new-category'])

const ionRouter = useIonRouter()
const categories = useCategoriesStore()
const wallet = useWalletStore()
const expenses = useExpensesStore()

const isEdit = computed(() => Boolean(props.expense))
const today = computed(() => expenses.summary?.today ?? localToday())

const dateValue = ref('')
const amountText = ref('')
const note = ref('')
const categoryId = ref(null)
const sourceId = ref(null)
const error = ref('')
const shake = ref(false)
const busy = ref(null)
const sheetOpen = ref(false)
/** Udah kesimpen (bukan "catat lagi") → tombol mati sampai layar ditutup / form dikosongin. */
const done = ref(false)
/** Lagi nunggu kategori baru dari tombol "Baru" di layar ini. */
let waitingForNew = false
const amountEl = ref(null)
const noteEl = ref(null)

const date = computed(() => dateValue.value || today.value)
const amount = computed(() => parseAmount(amountText.value))
const tooBig = computed(() => amount.value > MAX_AMOUNT)
const canSave = computed(() => !done.value && amount.value > 0 && !tooBig.value && Boolean(categoryId.value) && Boolean(sourceId.value))

function fill(e) {
  dateValue.value = e?.spentOn ?? ''
  amountText.value = e ? formatAmount(e.amount) : ''
  note.value = e?.note ?? ''
  categoryId.value = e?.category.id ?? null
  sourceId.value = e?.source.id ?? expenses.summary?.lastSourceId ?? null
  error.value = ''
  done.value = false
}
watch(() => props.expense, fill, { immediate: true })
// Sumber dana default (yang terakhir dipakai) baru ketauan setelah ringkasan dateng.
watch(
  () => expenses.summary?.lastSourceId,
  (id) => {
    if (!isEdit.value && !sourceId.value && id) sourceId.value = id
  },
)

/* ---- nominal ---- */
function onAmount(e) {
  const digits = String(e.target.value).replace(/\D/g, '').replace(/^0+/, '').slice(0, 10)
  amountText.value = formatAmount(Number(digits))
  e.target.value = amountText.value
}
const todaySoFar = computed(() => {
  const total = expenses.summary?.todayTotal ?? 0
  // Lagi ngubah catatan hari ini: nominal lamanya jangan diitung dua kali.
  return props.expense?.spentOn === today.value ? total - props.expense.amount : total
})
/** Sisa jatah hari ini sebelum catatan ini (null = belum pasang budget). Lagi ngubah catatan hari ini → nominal lamanya dibalikin dulu. */
const budgetLeft = computed(() => {
  const b = expenses.summary?.budget
  if (!b) return null
  return props.expense?.spentOn === today.value ? b.todayLeft + props.expense.amount : b.todayLeft
})
const budgetAfter = computed(() => (budgetLeft.value ?? 0) - amount.value)
/**
 * Catatan tanggal lain. Bulan ini (sebelum hari ini) tetep ngurangin jatah hari ini: jatah = (budget − keluar s.d. kemarin) ÷ sisa hari.
 * `monthLeft + todayTotal` = budget − keluar s.d. kemarin; nominal lama dibalikin kalau catatan ini udah ada di sebelum hari ini.
 */
const pastHint = computed(() => {
  const b = expenses.summary?.budget
  if (date.value.slice(0, 7) !== today.value.slice(0, 7)) return 'catatan bulan lain · nggak ngaruh ke jatah hari ini'
  if (!amount.value) return 'catatan tanggal lain · tetep ngurangin jatah hari ini'
  const old = props.expense
  const back = old && old.spentOn < today.value && old.spentOn.slice(0, 7) === today.value.slice(0, 7) ? old.amount : 0
  const left = b.monthLeft + (expenses.summary?.todayTotal ?? 0) - amount.value + back
  const jatah = left > 0 ? Math.floor(left / b.daysLeft / 100) * 100 : 0
  return `catatan tanggal lain · jatah hari ini ${jatah === b.jatahToday ? 'tetep' : 'jadi'} ${rp(jatah)}`
})

/* ---- tanggal ---- */
function onDate(e) {
  const v = e.target.value
  dateValue.value = v && v <= today.value ? v : ''
  e.target.value = date.value
}

/* ---- kategori ---- */
const categoryOf = (id) => (id ? categories.byId(id) : null)
const categoryChips = computed(() => {
  const list = [...categories.items]
  const cur = props.expense?.category
  // Kategori catatan ini udah disembunyiin → tetep tampil biar bisa dipertahanin.
  if (cur && !list.some((c) => c.id === cur.id)) list.unshift(cur)
  return list
})
const selectedCategory = computed(() => categoryChips.value.find((c) => c.id === categoryId.value))
const blob = computed(() => (selectedCategory.value ? `radial-gradient(closest-side, ${selectedCategory.value.tint}, transparent)` : 'transparent'))
function newCategory() {
  waitingForNew = true
  if (props.newCategoryInline) emit('new-category')
  else ionRouter.push('/tabs/menu/kategori/tambah?from=catat')
}

/** Dipanggil pas balik dari form kategori baru: pilih kategori yang barusan dibikin, isian lain tetep. */
async function pickJustCreated() {
  // Kategori yang dibikin dari tempat lain (menu Kategori) jangan nyelonong ke catatan ini.
  if (!waitingForNew) return
  waitingForNew = false
  const id = categories.takeJustCreated()
  if (!id) return
  if (!categories.byId(id)) await categories.load().catch(() => {})
  categoryId.value = id
}

/* ---- saran ---- */
const shownSuggestions = computed(() => filterSuggestions(expenses.suggestions, note.value))
function useSuggestion(s) {
  note.value = s.note
  if (s.categoryId && categories.byId(s.categoryId)) categoryId.value = s.categoryId
  noteEl.value?.blur()
}

/* ---- sumber dana ---- */
const usableSources = computed(() => {
  const list = [...wallet.items]
  const cur = props.expense?.source
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

/* ---- simpan / hapus ---- */
function doShake() {
  shake.value = false
  requestAnimationFrame(() => {
    shake.value = true
    setTimeout(() => (shake.value = false), 500)
  })
}
const showToast = async (message) => (await toastController.create({ message, duration: 2200, position: 'top', cssClass: 'aio-toast' })).present()

function payload() {
  // Tanggal nggak diubah → nggak dikirim, biar "hari ini"-nya diputusin server (WIB), bukan angka lama di layar.
  const data = { ...(dateValue.value ? { spentOn: dateValue.value } : {}), amount: amount.value, note: note.value.trim() || null, categoryId: categoryId.value, sourceId: sourceId.value }
  if (!isEdit.value) return data
  const e = props.expense
  const before = { spentOn: e.spentOn, amount: e.amount, note: e.note ?? null, categoryId: e.category.id, sourceId: e.source.id }
  data.spentOn = date.value
  return Object.fromEntries(Object.entries(data).filter(([k, v]) => v !== before[k]))
}

function reset() {
  amountText.value = ''
  note.value = ''
  categoryId.value = null
  error.value = ''
  done.value = false
}

async function save(again) {
  if (busy.value || !canSave.value) return
  const data = payload()
  const cat = selectedCategory.value
  const savedAmount = amount.value
  busy.value = again ? 'again' : 'save'
  error.value = ''
  let saved = props.expense
  try {
    if (!isEdit.value) saved = await expenses.create(data)
    else if (Object.keys(data).length) saved = await expenses.update(props.expense.id, data)
  } catch (err) {
    error.value = apiErrorMessage(err)
    doShake()
    return
  } finally {
    busy.value = null
  }
  if (!again) done.value = true
  showToast(isEdit.value ? 'Disimpen.' : `Kecatet · ${rp(savedAmount)}${cat ? ` ${cat.emoji} ${cat.name}` : ''}`)
  emit('saved', saved, again)
  if (again) {
    reset()
    await nextTick()
    amountEl.value?.focus()
  }
}

async function confirmDelete() {
  if (busy.value) return
  const sheet = await actionSheetController.create({
    header: 'Hapus catatan ini?',
    subHeader: 'Nggak bisa dibalikin.',
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
    await expenses.remove(props.expense.id)
  } catch (err) {
    error.value = apiErrorMessage(err)
    return
  } finally {
    busy.value = null
  }
  showToast('Catatan dihapus.')
  emit('deleted')
}

/* ---- muat data ---- */
async function load() {
  try {
    await Promise.all([
      categories.loaded ? null : categories.load(),
      wallet.loaded ? null : wallet.load(),
      expenses.loadSummary(),
      expenses.loadSuggestions(),
    ])
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}

const focusAmount = () => amountEl.value?.focus()

// Balik dari background (mis. iPad dibiarin semaleman) → "hari ini" & angkanya diperbarui.
function onVisible() {
  if (document.visibilityState === 'visible') expenses.loadSummary().catch(() => {})
}

onMounted(() => {
  if (props.autofocus) focusAmount()
  load()
  document.addEventListener('visibilitychange', onVisible)
})
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))

defineExpose({ pickJustCreated, focusAmount, reset, load })
</script>

<style scoped>
.topline { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.topline .eyebrow { height: 36px; }
.datechip { position: relative; display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px 0 11px; border-radius: 99px; background: var(--card);
  box-shadow: 0 0 0 1px var(--hair); font-weight: 700; font-size: 13.5px; color: var(--text); overflow: hidden; }
.datechip input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; border: 0; font-size: 16px; }
.datechip.past { background: rgba(245, 165, 36, .14); color: #C27C00; box-shadow: none; }

.amount-wrap { position: relative; text-align: center; padding: 26px 0 8px; }
.blob { position: absolute; left: 50%; top: 50%; width: 260px; height: 150px; transform: translate(-50%, -50%); border-radius: 99px; filter: blur(40px); opacity: .9;
  pointer-events: none; transition: background .6s var(--spring); }
.amount { position: relative; display: flex; justify-content: center; align-items: baseline; gap: 4px; }
.rp { font-size: 26px; font-weight: 700; color: var(--muted); }
.fit { display: inline-grid; max-width: calc(100% - 50px); }
.fit > * { grid-area: 1 / 1; font: 800 54px var(--ion-font-family); letter-spacing: -0.045em; font-variant-numeric: tabular-nums; padding: 0 2px; }
.mirror { visibility: hidden; white-space: pre; }
.fit input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--text); text-align: center; caret-color: var(--green); }
.fit input::placeholder { color: var(--muted); opacity: .45; }
.today-hint { position: relative; font-size: 12.5px; color: var(--muted); margin-top: 4px; font-variant-numeric: tabular-nums; }
.today-hint b { color: var(--text); }
.today-hint .bad { color: var(--red); }
.today-hint .after { display: inline-flex; align-items: center; gap: 4px; margin-left: 6px; padding: 2px 9px; border-radius: 99px; font-weight: 700;
  background: rgba(43, 168, 100, .12); color: var(--green); }
.today-hint .after.over { background: rgba(240, 83, 61, .12); color: var(--red); }

.group-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 22px 8px 10px; }
.what { display: flex; align-items: center; gap: 10px; height: 56px; padding: 0 16px; border-radius: 18px; background: var(--soft); color: var(--muted); }
.what input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--text); font: 600 16px var(--ion-font-family); }
.what input::placeholder { color: var(--muted); font-weight: 500; }
.suggest { display: flex; gap: 8px; overflow-x: auto; padding: 10px 2px 2px; min-height: 50px; scrollbar-width: none; }
.suggest::-webkit-scrollbar { display: none; }
.sg-k { flex-shrink: 0; align-self: center; padding-left: 4px; font-size: 11.5px; font-weight: 600; color: var(--muted); }
.sg { flex-shrink: 0; display: inline-flex; align-items: center; gap: 7px; height: 38px; padding: 0 13px 0 6px; border: 0; border-radius: 99px; background: var(--card);
  box-shadow: 0 0 0 1px var(--hair); color: var(--text); font: 600 13.5px var(--ion-font-family); cursor: pointer; }
.sg .e { width: 28px; height: 28px; border-radius: 99px; display: grid; place-items: center; font-size: 14px; }
.sg:not(:has(.e)) { padding-left: 13px; }

.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.cp { display: inline-flex; align-items: center; gap: 7px; height: 42px; padding: 0 14px 0 6px; border: 0; border-radius: 99px; background: var(--card); box-shadow: 0 0 0 1px var(--hair);
  color: var(--text); font: 600 14px var(--ion-font-family); cursor: pointer; transition: transform .2s var(--spring), background-color .25s; }
.cp:active { transform: scale(.96); }
.cp .e { width: 32px; height: 32px; border-radius: 99px; display: grid; place-items: center; font-size: 16px; color: #141410; }
.cp .e.txt { font-size: 10.5px; font-weight: 800; }
.cp.on { background: var(--ink); color: var(--on-ink); box-shadow: none; }
.cp.add { gap: 5px; padding: 0 14px; background: transparent; box-shadow: inset 0 0 0 1.5px var(--hair); color: var(--muted); }

.error { color: var(--red); font-size: 13px; font-weight: 600; margin: 14px 6px 0; }
.save, .again, .del { width: 100%; justify-content: space-between; height: 58px; padding: 8px 8px 8px 22px; font-size: 16px; }
.save { margin-top: 22px; }
.again, .del { margin-top: 10px; }
.save .ic, .again .ic, .del .ic { width: 42px; height: 42px; }
.again .ic { background: var(--card); color: var(--text); }
.del .ic { background: rgba(240, 83, 61, .14); color: var(--red); }
.save:disabled, .again:disabled, .del:disabled { opacity: .35; }
.spin { width: 16px; height: 16px; border-radius: 99px; border: 2.5px solid rgba(28, 36, 0, .25); border-top-color: var(--lime-ink); animation: spin .7s linear infinite; }
.spin.dark { border-color: var(--hair); border-top-color: var(--text); }
@keyframes spin { to { transform: rotate(360deg); } }
.shake { animation: sh .45s; }
@keyframes sh { 20%, 60% { translate: -8px 0; } 40%, 80% { translate: 8px 0; } }

.scrim { position: fixed; inset: 0; z-index: 40; background: rgba(0, 0, 0, .32); opacity: 0; pointer-events: none; transition: opacity .4s var(--spring); }
.scrim.show { opacity: 1; pointer-events: auto; }
.sheet { font-family: var(--ion-font-family); color: var(--text); position: fixed; left: 0; right: 0; bottom: 0; z-index: 41; max-width: 560px; max-height: 78vh; margin: 0 auto; overflow-y: auto; padding: 10px 14px calc(24px + env(safe-area-inset-bottom));
  border-radius: 30px 30px 0 0; background: var(--app-bg); transform: translateY(105%); transition: transform .5s var(--spring); }
.sheet.show { transform: none; }
.handle { width: 40px; height: 5px; margin: 0 auto 12px; border-radius: 9px; background: var(--muted); opacity: .35; }
.sheet h3 { margin: 0 8px 4px; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
.sheet .group-label { margin: 16px 8px 8px; }
.srcs { padding: 4px 0; }
.src { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 14px; border: 0; background: transparent; color: var(--text); font: 600 15px var(--ion-font-family); text-align: left; cursor: pointer; }
.src + .src { box-shadow: inset 0 1px 0 var(--hair); }
.src .b { width: 36px; height: 36px; border-radius: 12px; display: grid; place-items: center; flex-shrink: 0; font-size: 11px; font-weight: 800; color: #141410; }
.src .ck { margin-left: auto; width: 26px; height: 26px; border-radius: 99px; display: none; place-items: center; background: var(--lime); color: var(--lime-ink); }
.src.on .ck { display: grid; }
</style>
