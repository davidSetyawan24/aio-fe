<template>
  <div class="wizard" :class="{ shake }">
    <div class="steps">
      <div v-for="(label, i) in STEPS" :key="label" class="st" :class="{ on: step === i + 1, ok: step > i + 1 }"><i>{{ step > i + 1 ? '✓' : i + 1 }}</i>{{ label }}</div>
    </div>
    <button v-if="step > 1" class="back" data-test="prev" @click="step--"><PhCaretLeft :size="16" weight="bold" /> Balik</button>

    <!-- ① siapa aja -->
    <template v-if="step === 1">
      <div class="big-q">Siapa aja yang ikut? <span>Lo udah otomatis masuk.</span></div>
      <div class="people">
        <span v-for="(p, i) in people" :key="p.id" class="pp" data-test="chip">
          <span class="pa" :class="{ me: p.me }" :style="p.me ? null : { background: tintOf(i) }">{{ initial(p.name) }}</span><span data-test="chip-name">{{ p.name }}</span>
          <small v-if="p.me">lo</small>
          <button v-else type="button" class="x" data-test="remove-person" :aria-label="`Hapus ${p.name}`" @click="removePerson(i)"><PhX :size="13" weight="bold" /></button>
        </span>
      </div>
      <form class="field" data-test="add-person" novalidate @submit.prevent="addPerson">
        <PhUserPlus :size="20" />
        <input v-model="newName" data-test="person-name" aria-label="Nama temen" placeholder="Nama temen, mis. Andi" maxlength="20" autocomplete="off" autocapitalize="words" enterkeyhint="done" />
        <button type="submit" class="add">Tambah</button>
      </form>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p class="hint">Nama cuma buat split bill ini. Kirimnya nanti lewat WhatsApp, pilih orangnya di sana.</p>
      <button class="pill go" data-test="next" :disabled="people.length < 2" @click="goStep(2)">Lanjut {{ items.length ? 'cek struk' : 'foto struk' }} <span class="ic"><PhArrowRight :size="18" weight="bold" /></span></button>
    </template>

    <!-- ② struk -->
    <template v-else-if="step === 2">
      <template v-if="scanning">
        <div class="scan" aria-hidden="true">
          <div v-for="n in 12" :key="n" class="ln" :class="['s', 'm', '', 'r'][n % 4]" />
          <div class="beam" />
        </div>
        <div class="scan-t">Lagi baca struk… 🧐<span>Bentar ya, lagi melototin angka-angkanya</span></div>
      </template>
      <template v-else-if="!items.length && !manual">
        <div class="big-q">Fotoin struknya <span>biar gue yang ngetikin.</span></div>
        <label class="cam">
          <span class="ic"><PhCamera :size="34" weight="fill" /></span><b>Foto struk</b><span>Kamera kebuka. Struknya lurusin dikit ya, biar kebaca 😄</span>
          <input data-test="photo" type="file" accept="image/*" capture="environment" @change="onPhoto" />
        </label>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <button class="manual" data-test="manual" @click="startManual">atau ketik item sendiri</button>
      </template>
      <template v-else>
        <div class="field top">
          <PhStorefront :size="20" />
          <input v-model="place" data-test="place" aria-label="Nama tempat" placeholder="Makan di mana? mis. Sushi Tei" maxlength="60" autocomplete="off" enterkeyhint="done" @keydown.enter.prevent="$event.target.blur()" />
          <label class="datechip" :class="{ past: spentOn !== today }">
            <PhCalendarBlank :size="15" weight="bold" /><span>{{ spentOn === today ? 'Hari ini' : shortDate(spentOn) }}</span>
            <input type="date" data-test="date" aria-label="Tanggal" :value="spentOn" :max="today" min="2000-01-01" @change="onDate" />
          </label>
        </div>
        <span v-if="scanResult" class="match" :class="{ bad: !scanResult.matches }" data-test="match">
          <component :is="scanResult.matches ? PhCheck : PhWarning" :size="13" weight="bold" />
          {{ scanResult.matches ? `Kebaca ${scanResult.count} item · total cocok sama struk` : `Beda ${rp(Math.abs(scanResult.difference))} sama total struk, cek lagi ya` }}
        </span>

        <div class="label">Item <small>tap buat benerin</small></div>
        <div class="shell"><div class="core items">
          <button v-for="(it, i) in items" :key="it.id" class="it" data-test="item" @click="openItem(i)">
            <span class="q">{{ it.qty }}×</span>
            <span class="grow"><b>{{ it.name }}</b><span v-if="it.qty > 1" class="sub">@ {{ rp(it.price) }}</span></span>
            <span class="p">{{ rp(it.qty * it.price) }}</span>
          </button>
          <p v-if="!items.length" class="none">Belum ada item. Tambah di bawah ya.</p>
          <div v-if="items.length" class="it subtotal"><span class="grow"><b>Subtotal item</b></span><span class="p">{{ rp(subtotal) }}</span></div>
        </div></div>
        <button class="pill ghost" data-test="add-item" @click="openItem(-1)">Tambah item {{ items.length ? 'yang kelewat' : '' }} <span class="ic"><PhPlus :size="17" weight="bold" /></span></button>

        <div class="label">Diskon, service & pajak <small>dibagi sesuai pesanan</small></div>
        <div class="shell"><div class="core items">
          <button v-for="c in CHARGES" :key="c.key" class="it extra" :class="{ disc: c.key === 'discount' }" :data-test="`charge-${c.key}`" @click="openCharge(c.key)">
            <span class="q">{{ c.emoji }}</span><span class="grow"><b>{{ c.label }}</b></span>
            <span class="p">{{ c.key === 'discount' ? (charges.discount ? `−${rp(charges.discount)}` : rp(0)) : money(charges[c.key]) }}</span>
          </button>
        </div></div>
        <div class="grandbar" data-test="grand"><span>Total struk</span><b>{{ rp(grand) }}</b></div>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <button class="pill go" data-test="next" :disabled="!items.length" @click="goStep(3)">Lanjut bagi item <span class="ic"><PhArrowRight :size="18" weight="bold" /></span></button>
      </template>
    </template>

    <!-- ③ bagi item -->
    <template v-else>
      <div class="big-q">Siapa pesen apa? <span>Pilih orang, tap itemnya.</span></div>
      <div class="who">
        <button v-for="(p, i) in people" :key="p.id" class="wp" :class="{ on: active === i }" data-test="who" :data-index="i" @click="active = i">
          <span class="pa sm" :class="{ me: p.me }" :style="p.me ? null : { background: tintOf(i) }">{{ initial(p.name) }}</span>{{ p.name }} <span class="n">{{ rp(live.shares[i]?.total ?? 0) }}</span>
        </button>
      </div>
      <div class="tapme"><PhHandTap :size="18" /><span>Tap item punya <b>{{ people[active]?.name }}</b>. Item buat rame-rame? Tap juga pas milih orang lain, nanti dibagi rata.</span></div>
      <div class="shell"><div class="core items assign-list">
        <button v-for="(it, i) in items" :key="it.id" class="as" :class="{ mine: it.who.includes(people[active]?.id) }" data-test="assign" :data-index="i" @click="toggle(it)">
          <span class="ck"><PhCheck :size="14" weight="bold" /></span>
          <span class="grow">
            <b>{{ it.qty > 1 ? `${it.qty}× ` : '' }}{{ it.name }}</b>
            <span class="owners">
              <template v-if="it.who.length">
                <span v-for="id in it.who" :key="id" class="pa sm" :class="{ me: personOf(id)?.me }" :style="personOf(id)?.me ? null : { background: tintOf(indexOf(id)) }">{{ initial(personOf(id)?.name ?? '?') }}</span>
                <span v-if="it.who.length > 1" class="split">dibagi {{ it.who.length }}</span>
              </template>
              <span v-else class="nobody">belum ada yang punya</span>
            </span>
          </span>
          <span class="p">{{ rp(it.qty * it.price) }}</span>
        </button>
        <button class="as" data-test="rest" @click="rest">
          <span class="ck all"><PhUsersThree :size="15" weight="bold" /></span>
          <span class="grow"><b>Sisanya bagi rata ke semua</b><span class="owners muted">buat item yang belum ada yang punya</span></span>
        </button>
      </div></div>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div class="dock" data-test="dock"><div class="shell"><div class="core">
        <div class="grow t">
          <template v-if="unassigned"><b class="warn">{{ unassigned }} item belum ada yang punya</b>diisi dulu ya</template>
          <template v-else><b>Semua item udah ada yang punya 🎉</b>total {{ rp(grand) }}</template>
        </div>
        <button class="go-btn" data-test="save" :disabled="Boolean(unassigned) || busy" @click="save">
          {{ bill ? 'Simpan' : 'Liat hasil' }} <span class="ic"><span v-if="busy" class="spin" /><PhArrowRight v-else :size="16" weight="bold" /></span>
        </button>
      </div></div></div>
    </template>

    <!-- sheet benerin item / biaya -->
    <Teleport to="body">
      <div class="scrim" :class="{ show: sheet.open }" @click="sheet.open = false" />
      <div class="sheet" :class="{ show: sheet.open, dialog: wide }" role="dialog" :aria-label="sheetTitle">
        <div class="handle" />
        <h3>{{ sheetTitle }}</h3>
        <form novalidate @submit.prevent="saveSheet">
          <template v-if="sheet.kind === 'item'">
            <div class="field"><input v-model="sheet.name" data-test="sheet-name" aria-label="Nama item" placeholder="Nama item" maxlength="60" autocomplete="off" enterkeyhint="next" @keydown.enter.prevent /></div>
            <div class="grid2">
              <div class="field"><span class="pre">×</span><input :value="sheet.qty" data-test="sheet-qty" aria-label="Jumlah" inputmode="numeric" autocomplete="off" @input="onQty" @keydown.enter.prevent /></div>
              <div class="field"><span class="pre">Rp</span><input :value="sheet.price" data-test="sheet-price" aria-label="Harga satuan" inputmode="numeric" autocomplete="off" placeholder="harga satuan" @input="onPrice" /></div>
            </div>
          </template>
          <template v-else>
            <div class="field"><span class="pre">Rp</span><input :value="sheet.price" data-test="sheet-price" aria-label="Nominal" inputmode="numeric" autocomplete="off" placeholder="0" @input="onPrice" /></div>
            <label v-if="sheet.key === 'other'" class="minus"><input v-model="sheet.minus" type="checkbox" data-test="sheet-minus" /> Minus (mis. pembulatan ke bawah)</label>
          </template>
          <button type="submit" class="pill go" data-test="sheet-save" :disabled="sheet.kind === 'item' && !sheet.name.trim()">Simpan <span class="ic"><PhCheck :size="17" weight="bold" /></span></button>
          <button v-if="sheet.kind === 'item' && sheet.index >= 0" type="button" class="pill ghost" data-test="sheet-delete" @click="deleteItem">Hapus item ini <span class="ic"><PhTrash :size="17" weight="bold" /></span></button>
        </form>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { toastController } from '@ionic/vue'
import {
  PhArrowRight, PhCalendarBlank, PhCamera, PhCaretLeft, PhCheck, PhHandTap, PhPlus, PhStorefront, PhTrash, PhUserPlus, PhUsersThree, PhWarning, PhX,
} from '@phosphor-icons/vue'
import { shortDate } from '@/lib/budget.js'
import { formatAmount, localToday, parseAmount } from '@/lib/duit.js'
import { resizeForUpload } from '@/lib/imageResize.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { computeShares, initial, money, newId, tintOf } from '@/lib/splitBill.js'
import { rp } from '@/lib/wallet.js'
import { useSplitBillsStore } from '@/stores/splitBills.js'

const STEPS = ['Siapa aja', 'Struk', 'Bagi item']
const CHARGES = [
  { key: 'discount', label: 'Diskon', emoji: '🏷️' },
  { key: 'service', label: 'Service', emoji: '🛎️' },
  { key: 'tax', label: 'Pajak', emoji: '🧾' },
  { key: 'other', label: 'Biaya lain', emoji: '➕' },
]

const props = defineProps({
  /** Split bill yang diubah. Kosong = bikin baru. */
  bill: { type: Object, default: null },
  /** Layar lebar: sheet jadi dialog di tengah. */
  wide: { type: Boolean, default: false },
})
const emit = defineEmits(['saved'])

const store = useSplitBillsStore()
const today = localToday()

const b = props.bill
const step = ref(1)
const people = ref(b ? b.people.map((p) => ({ id: p.id, name: p.name, me: p.me })) : [{ id: 'me', name: 'Gue', me: true }])
const items = ref(b ? b.items.map((it) => ({ ...it, who: [...it.who] })) : [])
const place = ref(b?.place ?? '')
const spentOn = ref(b?.spentOn ?? today)
const emoji = b?.emoji ?? '🍽️'
const charges = reactive({ discount: b?.discount ?? 0, service: b?.service ?? 0, tax: b?.tax ?? 0, other: b?.other ?? 0 })
const newName = ref('')
const error = ref('')
const shake = ref(false)
const busy = ref(false)
const scanning = ref(false)
const manual = ref(false)
const scanResult = ref(null)
const active = ref(1)

const draft = () => ({ people: people.value, items: items.value, ...charges })
defineExpose({ draft })
const live = computed(() => computeShares(draft()))
const subtotal = computed(() => live.value.subtotal)
const grand = computed(() => live.value.total)
const unassigned = computed(() => items.value.filter((it) => !it.who.length).length)
const personOf = (id) => people.value.find((p) => p.id === id)
const indexOf = (id) => people.value.findIndex((p) => p.id === id)

function doShake() {
  shake.value = false
  requestAnimationFrame(() => {
    shake.value = true
    setTimeout(() => (shake.value = false), 500)
  })
}

/* ① orang */
function addPerson() {
  const name = newName.value.trim()
  error.value = ''
  if (!name) return
  const clash = people.value.find((p) => p.name.toLowerCase() === name.toLowerCase())
  if (clash) {
    error.value = `${clash.name} udah ada.`
    return
  }
  if (people.value.length >= 20) {
    error.value = 'Maksimal 20 orang.'
    return
  }
  people.value.push({ id: newId(), name, me: false })
  newName.value = ''
}
function removePerson(i) {
  const [gone] = people.value.splice(i, 1)
  for (const it of items.value) it.who = it.who.filter((id) => id !== gone.id)
}
function goStep(n) {
  error.value = ''
  if (n === 3 && active.value >= people.value.length) active.value = 1
  step.value = n
}

/* ② struk */
async function onPhoto(e) {
  const file = e.target.files?.[0]
  if (!file || scanning.value) return
  scanning.value = true
  error.value = ''
  try {
    const r = await store.scan(await resizeForUpload(file))
    if (r.place && !place.value.trim()) place.value = r.place
    if (r.spentOn) spentOn.value = r.spentOn
    items.value = r.items.map((it) => ({ id: newId(), ...it, who: [] }))
    Object.assign(charges, { discount: r.discount, service: r.service, tax: r.tax, other: r.other })
    scanResult.value = { matches: r.matches, difference: r.difference, count: r.items.length }
    if (!r.items.length) manual.value = true
    showToast('Struk kebaca ✨ cek lagi ya kalau ada yang meleset')
  } catch (err) {
    error.value = apiErrorMessage(err)
    doShake()
  } finally {
    scanning.value = false
    if (e.target) e.target.value = ''
  }
}
function startManual() {
  manual.value = true
  error.value = ''
}
function onDate(e) {
  const v = e.target.value
  spentOn.value = v && v <= today ? v : today
  e.target.value = spentOn.value
}

/* sheet benerin item / biaya */
const sheet = reactive({ open: false, kind: 'item', index: -1, key: '', name: '', qty: '1', price: '', minus: false })
const sheetTitle = computed(() => {
  if (sheet.kind === 'charge') return CHARGES.find((c) => c.key === sheet.key)?.label ?? ''
  return sheet.index >= 0 ? 'Benerin item' : 'Tambah item'
})
function openItem(i) {
  const it = items.value[i]
  Object.assign(sheet, { open: true, kind: 'item', index: i, name: it?.name ?? '', qty: String(it?.qty ?? 1), price: formatAmount(it?.price ?? 0) })
}
function openCharge(key) {
  const v = charges[key]
  Object.assign(sheet, { open: true, kind: 'charge', key, price: formatAmount(Math.abs(v)), minus: v < 0 })
}
function onQty(e) {
  const n = parseAmount(e.target.value)
  sheet.qty = n ? String(Math.min(999, n)) : ''
  e.target.value = sheet.qty
}
function onPrice(e) {
  sheet.price = formatAmount(Math.min(100_000_000, parseAmount(e.target.value)))
  e.target.value = sheet.price
}
function saveSheet() {
  const price = parseAmount(sheet.price)
  if (sheet.kind === 'charge') {
    charges[sheet.key] = sheet.key === 'other' && sheet.minus ? -price : price
  } else {
    const name = sheet.name.trim()
    if (!name) return
    const qty = Math.max(1, Number(sheet.qty) || 1)
    if (sheet.index >= 0) Object.assign(items.value[sheet.index], { name, qty, price })
    else if (items.value.length < 100) items.value.push({ id: newId(), name, qty, price, who: [] })
  }
  sheet.open = false
}
function deleteItem() {
  items.value.splice(sheet.index, 1)
  sheet.open = false
}

/* ③ bagi item */
function toggle(it) {
  const id = people.value[active.value]?.id
  if (!id) return
  it.who = it.who.includes(id) ? it.who.filter((w) => w !== id) : people.value.map((p) => p.id).filter((p) => p === id || it.who.includes(p))
}
function rest() {
  const all = people.value.map((p) => p.id)
  for (const it of items.value) if (!it.who.length) it.who = [...all]
}

const showToast = async (message) => (await toastController.create({ message, duration: 2200, position: 'top', cssClass: 'aio-toast' })).present()

async function save() {
  if (busy.value || unassigned.value) return
  busy.value = true
  error.value = ''
  const payload = {
    place: place.value.trim() || 'Split bill',
    emoji,
    spentOn: spentOn.value,
    ...charges,
    people: people.value.map(({ id, name, me }) => ({ id, name, me })),
    items: items.value.map(({ id, name, qty, price, who }) => ({ id, name, qty, price, who })),
  }
  try {
    const saved = props.bill ? await store.update(props.bill.id, payload) : await store.create(payload)
    showToast(props.bill ? 'Disimpen.' : 'Split bill kesimpen 🍕')
    emit('saved', saved)
  } catch (err) {
    error.value = apiErrorMessage(err)
    doShake()
    busy.value = false
  }
}
</script>

<style scoped>
.steps { display: flex; gap: 6px; margin: 4px 0 14px; }
.st { flex: 1; display: flex; align-items: center; gap: 7px; padding: 8px 10px; border-radius: 14px; background: var(--soft); color: var(--muted); font-size: 12.5px; font-weight: 700; white-space: nowrap; }
.st i { width: 22px; height: 22px; border-radius: 99px; display: grid; place-items: center; font-style: normal; font-size: 11px; background: var(--card); color: var(--muted); flex-shrink: 0; }
.st.on { background: var(--ink); color: var(--on-ink); }
.st.on i { background: var(--lime); color: var(--lime-ink); }
.st.ok i { background: var(--green); color: #fff; }
.back { display: inline-flex; align-items: center; gap: 4px; color: var(--muted); font: 600 14px var(--ion-font-family); margin: 0 0 6px; border: 0; background: none; padding: 4px 0; cursor: pointer; }
.big-q { font-size: 26px; font-weight: 800; letter-spacing: -0.035em; line-height: 1.15; margin: 4px 4px 4px; }
.big-q span { color: var(--muted); font-weight: 600; }

.people { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.pp { display: inline-flex; align-items: center; gap: 7px; height: 42px; padding: 0 8px 0 6px; border-radius: 99px; background: var(--card); box-shadow: 0 0 0 1px var(--hair); font-weight: 600; font-size: 14px; }
.pp small { color: var(--muted); font-weight: 600; margin-right: 6px; }
.x { width: 26px; height: 26px; border: 0; border-radius: 99px; background: var(--soft); color: var(--muted); display: grid; place-items: center; cursor: pointer; }
.pa { width: 30px; height: 30px; border-radius: 99px; display: inline-grid; place-items: center; font-size: 12px; font-weight: 800; color: #141410; flex-shrink: 0; }
.pa.sm { width: 22px; height: 22px; font-size: 10px; }
.pa.me { background: #141410; color: var(--lime); }
:global(.theme-dark) .pa.me { background: #F2F2EE; color: #141410; }

.field { display: flex; align-items: center; gap: 10px; min-height: 56px; padding: 0 8px 0 16px; border-radius: 18px; background: var(--soft); color: var(--muted); margin-top: 14px; }
.field input { flex: 1; min-width: 0; height: 52px; border: 0; outline: 0; background: transparent; color: var(--text); font: 600 16px var(--ion-font-family); }
.field input::placeholder { color: var(--muted); font-weight: 500; }
.field .pre { font-weight: 700; color: var(--muted); }
.field.top { margin-top: 4px; padding-right: 6px; }
.add { height: 40px; padding: 0 14px; border: 0; border-radius: 99px; background: var(--ink); color: var(--on-ink); font: 700 13.5px var(--ion-font-family); cursor: pointer; }
.datechip { position: relative; display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 12px; border-radius: 99px; background: var(--card); color: var(--text);
  font-weight: 700; font-size: 13px; overflow: hidden; flex-shrink: 0; }
.datechip input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; border: 0; font-size: 16px; }
.datechip.past { background: rgba(245, 165, 36, .14); color: #C27C00; }

.pill { width: 100%; justify-content: space-between; height: 54px; padding: 8px 8px 8px 22px; font-size: 15px; margin-top: 10px; }
.pill .ic { width: 38px; height: 38px; }
.pill.ghost .ic { background: var(--card); color: var(--text); }
.pill.go { height: 58px; font-size: 16px; margin-top: 20px; }
.pill.go .ic { width: 42px; height: 42px; }
.pill:disabled { opacity: .35; }

.cam { position: relative; display: grid; place-items: center; gap: 10px; width: 100%; padding: 34px 18px; margin-top: 16px; border: 1.5px dashed var(--muted); border-radius: 26px; color: var(--text); cursor: pointer; text-align: center; }
.cam .ic { width: 72px; height: 72px; border-radius: 24px; display: grid; place-items: center; background: var(--lime); color: var(--lime-ink); }
.cam b { font-size: 18px; }
.cam span { font-size: 13px; color: var(--muted); }
.cam input { position: absolute; inset: 0; opacity: 0; cursor: pointer; font-size: 16px; }
.manual { display: block; margin: 14px auto 0; border: 0; background: none; color: var(--muted); font: 600 13.5px var(--ion-font-family); text-decoration: underline; cursor: pointer; }

.scan { position: relative; margin: 18px auto 0; width: 210px; height: 270px; border-radius: 14px; background: #FFFDF6; box-shadow: 0 30px 60px -30px rgba(0, 0, 0, .4); overflow: hidden; padding: 20px 18px; transform: rotate(-2deg); }
.scan .ln { height: 7px; border-radius: 9px; background: #E7E3D6; margin-bottom: 11px; }
.scan .ln.s { width: 55%; }
.scan .ln.m { width: 75%; }
.scan .ln.r { margin-left: auto; width: 35%; }
.beam { position: absolute; left: 0; right: 0; height: 46px; background: linear-gradient(180deg, transparent, rgba(200, 240, 74, .55), transparent); animation: beam 1.4s var(--spring) infinite alternate; }
.beam::after { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: 2px; background: var(--lime); box-shadow: 0 0 14px var(--lime); }
@keyframes beam { from { top: -40px; } to { top: 260px; } }
.scan-t { text-align: center; margin-top: 22px; font-weight: 700; font-size: 16px; }
.scan-t span { display: block; font-size: 13px; color: var(--muted); font-weight: 500; margin-top: 4px; }

.match { display: inline-flex; align-items: center; gap: 5px; margin: 12px 4px 0; padding: 5px 10px; border-radius: 99px; background: rgba(43, 168, 100, .12); color: var(--green); font-size: 12px; font-weight: 700; }
.match.bad { background: rgba(245, 165, 36, .14); color: #C27C00; }
.label { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 22px 8px 10px; }
.label small { font-size: 12px; letter-spacing: .02em; text-transform: none; color: var(--text); font-weight: 700; }
.items { padding: 4px 6px; }
.it { display: flex; align-items: center; gap: 10px; width: 100%; padding: 11px 10px; border: 0; background: transparent; color: var(--text); font: inherit; text-align: left; cursor: pointer; }
.it + .it { box-shadow: inset 0 1px 0 var(--hair); }
.it .q { width: 30px; height: 30px; border-radius: 10px; display: grid; place-items: center; background: var(--soft); font-size: 12px; font-weight: 800; flex-shrink: 0; }
.it .grow { flex: 1; min-width: 0; }
.it b { display: block; font-weight: 600; font-size: 14.5px; }
.it .sub { display: block; font-size: 12px; color: var(--muted); }
.it .p { font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; }
.it.extra b { color: var(--muted); }
.it.extra.disc .p { color: var(--green); }
.it.subtotal { margin: 2px 0 4px; padding: 12px 10px; border-radius: 14px; background: var(--soft); box-shadow: none; cursor: default; }
.it.subtotal b { font-weight: 700; color: var(--text); }
.none { margin: 0; padding: 12px; color: var(--muted); font-size: 13px; }
.grandbar { display: flex; justify-content: space-between; align-items: baseline; margin-top: 12px; padding: 16px 20px; border-radius: 22px; background: #141410; color: #F3F2EE; }
.grandbar span { font-size: 13px; font-weight: 600; color: rgba(243, 242, 238, .65); }
.grandbar b { font-size: 24px; font-weight: 800; letter-spacing: -0.03em; color: var(--lime); font-variant-numeric: tabular-nums; }

.who { display: flex; gap: 8px; overflow-x: auto; padding: 12px 2px 10px; scrollbar-width: none; }
.who::-webkit-scrollbar { display: none; }
.wp { flex-shrink: 0; display: inline-flex; align-items: center; gap: 7px; height: 44px; padding: 0 14px 0 6px; border: 0; border-radius: 99px; background: var(--card); box-shadow: 0 0 0 1px var(--hair);
  color: var(--text); font: 600 14px var(--ion-font-family); cursor: pointer; transition: transform .2s var(--spring); }
.wp:active { transform: scale(.96); }
.wp.on { background: var(--ink); color: var(--on-ink); box-shadow: none; }
.wp .n { font-size: 11.5px; font-weight: 700; opacity: .6; font-variant-numeric: tabular-nums; }
.tapme { display: flex; align-items: flex-start; gap: 8px; margin: 2px 6px 10px; font-size: 12.5px; color: var(--muted); line-height: 1.4; }
.tapme svg { flex-shrink: 0; margin-top: 1px; }
.tapme b { color: var(--text); }
.assign-list { padding: 6px; }
.as { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px; border: 0; background: transparent; color: var(--text); font: inherit; text-align: left; cursor: pointer; border-radius: 16px; transition: background .2s; }
.as + .as { box-shadow: inset 0 1px 0 var(--hair); }
.as.mine { background: rgba(200, 240, 74, .16); }
.as .grow { flex: 1; min-width: 0; }
.as b { display: block; font-weight: 600; font-size: 14.5px; }
.as .p { font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; }
.owners { display: flex; margin-top: 5px; min-height: 22px; align-items: center; }
.owners .pa { margin-left: -5px; box-shadow: 0 0 0 2px var(--card); }
.owners .pa:first-child { margin-left: 0; }
.owners.muted { font-size: 12px; color: var(--muted); }
.nobody { font-size: 11.5px; font-weight: 700; color: #C27C00; background: rgba(245, 165, 36, .14); padding: 2px 8px; border-radius: 99px; }
.split { font-size: 11.5px; color: var(--muted); margin-left: 6px; }
.ck { width: 28px; height: 28px; border-radius: 99px; display: grid; place-items: center; box-shadow: inset 0 0 0 1.5px var(--hair); color: transparent; flex-shrink: 0; }
.ck.all { color: var(--muted); }
.as.mine .ck { background: var(--ink); color: var(--lime); box-shadow: none; }
.dock { position: sticky; bottom: calc(14px + env(safe-area-inset-bottom)); margin-top: 16px; z-index: 5; }
.dock .core { padding: 12px 12px 12px 16px; display: flex; align-items: center; gap: 12px; }
.dock .grow { flex: 1; min-width: 0; }
.dock .t { font-size: 12px; color: var(--muted); }
.dock .t b { display: block; font-size: 15px; color: var(--text); }
.dock .t b.warn { color: #C27C00; }
.go-btn { height: 46px; padding: 0 8px 0 18px; display: flex; align-items: center; gap: 10px; border: 0; border-radius: 99px; background: var(--ink); color: var(--on-ink); font: 700 14.5px var(--ion-font-family); cursor: pointer; flex-shrink: 0; }
.go-btn .ic { width: 32px; height: 32px; border-radius: 99px; display: grid; place-items: center; background: var(--lime); color: var(--lime-ink); }
.go-btn:disabled { opacity: .35; }
.spin { width: 14px; height: 14px; border-radius: 99px; border: 2.5px solid rgba(28, 36, 0, .25); border-top-color: var(--lime-ink); animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.error { color: var(--red); font-size: 13px; font-weight: 600; margin: 12px 6px 0; }
.hint { color: var(--muted); font-size: 12.5px; margin: 10px 8px 0; line-height: 1.45; }
.shake { animation: sh .45s; }
@keyframes sh { 20%, 60% { translate: -8px 0; } 40%, 80% { translate: 8px 0; } }

.scrim { position: fixed; inset: 0; z-index: 40; background: rgba(0, 0, 0, .35); opacity: 0; pointer-events: none; transition: opacity .4s var(--spring); }
.scrim.show { opacity: 1; pointer-events: auto; }
.sheet { font-family: var(--ion-font-family); color: var(--text); position: fixed; left: 0; right: 0; bottom: 0; z-index: 41; max-width: 560px; max-height: 88vh; margin: 0 auto; overflow-y: auto;
  padding: 10px 18px calc(24px + env(safe-area-inset-bottom)); border-radius: 30px 30px 0 0; background: var(--app-bg); transform: translateY(105%); visibility: hidden;
  transition: transform .5s var(--spring), visibility 0s .5s; }
.sheet.show { transform: none; visibility: visible; transition: transform .5s var(--spring), visibility 0s; }
.sheet.dialog { top: 50%; bottom: auto; left: 50%; right: auto; width: 440px; margin: 0; padding: 22px; border-radius: 30px; transform: translate(-50%, -46%) scale(.96); opacity: 0;
  transition: transform .45s var(--spring), opacity .3s var(--spring), visibility 0s .45s; }
.sheet.dialog.show { transform: translate(-50%, -50%); opacity: 1; transition: transform .45s var(--spring), opacity .3s var(--spring), visibility 0s; }
.sheet.dialog .handle { display: none; }
.handle { width: 40px; height: 5px; margin: 0 auto 14px; border-radius: 9px; background: var(--muted); opacity: .35; }
.sheet h3 { margin: 0 4px 4px; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
.grid2 { display: grid; grid-template-columns: 100px 1fr; gap: 10px; }
.minus { display: flex; align-items: center; gap: 8px; margin: 12px 6px 0; font-size: 13.5px; color: var(--muted); font-weight: 600; }
</style>
