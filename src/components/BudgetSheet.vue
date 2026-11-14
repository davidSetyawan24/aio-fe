<template>
  <!-- Ke body: elemen fixed di dalam ion-content nempel ke dasar konten, bukan dasar layar. -->
  <Teleport to="body">
    <div class="scrim" :class="{ show: open }" @click="close" />
    <div class="sheet" :class="{ show: open, dialog: wide }" role="dialog" :aria-label="isNew ? 'Budget baru' : `Budget ${shown?.name ?? ''}`">
      <div class="handle" />
      <!-- novalidate: cek isian dari kita sendiri (bahasa Indonesia), bukan pesan bawaan browser. -->
      <form :class="{ shake }" novalidate @submit.prevent="save">
        <div class="sh-top">
          <template v-if="isNew">
            <span class="av plus"><PhPlus :size="20" weight="bold" /></span>
            <div class="who"><b>Budget baru</b><span>kategori + nominal bulanan</span></div>
          </template>
          <template v-else-if="shown">
            <span class="av" :style="{ background: shown.tint }">{{ shown.emoji }}</span>
            <div class="who"><b>{{ shown.name }}</b><span>{{ shown.budget ? `budget sekarang ${rp(shown.budget)} sebulan` : 'belum ada budget' }}</span></div>
          </template>
        </div>

        <template v-if="isNew">
          <div class="step">1 · Kategori</div>
          <div class="chips">
            <button v-for="c in free" :key="c.id" type="button" class="cp" :class="{ on: !creating && picked === c.id }" :data-pick="c.id" @click="pick(c.id)">
              <span class="e" :style="{ background: c.tint }">{{ c.emoji }}</span>{{ c.name }}
            </button>
            <button type="button" class="cp add" :class="{ on: creating }" data-test="new-cat" @click="startCreating"><PhPlus :size="15" weight="bold" />Kategori baru</button>
          </div>
          <div v-if="creating" class="newcat">
            <input
              ref="nameEl"
              v-model="name"
              data-test="cat-name"
              aria-label="Nama kategori"
              placeholder="Nama kategori, mis. Skincare"
              maxlength="30"
              autocomplete="off"
              autocapitalize="sentences"
              enterkeyhint="next"
              @keydown.enter.prevent="amountEl?.focus()"
            />
            <div class="ems">
              <button v-for="e in emojis" :key="e" type="button" :class="{ on: e === emoji }" :data-emoji="e" @click="emoji = e">{{ e }}</button>
            </div>
            <div class="tns">
              <button v-for="t in CATEGORY_TINTS" :key="t" type="button" :aria-label="`Warna ${t}`" :data-tint="t" :style="{ background: t }" @click="tint = t">
                <PhCheck v-if="t === tint" :size="15" weight="bold" />
              </button>
            </div>
          </div>
          <div class="step">2 · Budget sebulan</div>
        </template>

        <label class="amount" :class="{ sm: isNew }">
          <span class="rp">Rp</span>
          <span class="fit">
            <span class="mirror" aria-hidden="true">{{ amountText || '0' }}</span>
            <input
              ref="amountEl"
              data-test="amount"
              aria-label="Budget sebulan"
              type="text"
              size="1"
              inputmode="numeric"
              autocomplete="off"
              placeholder="0"
              enterkeyhint="done"
              :value="amountText"
              @input="onAmount"
            />
          </span>
        </label>
        <div class="per" data-test="per">
          <template v-if="tooBig"><b class="bad">Budget maksimal Rp1 miliar.</b></template>
          <template v-else-if="amount">≈ <b>{{ rp(perDay(amount, month)) }}</b> sehari</template>
          <template v-else>&nbsp;</template>
        </div>

        <div v-if="!isNew" class="note">
          <PhInfo :size="17" />
          <span>Berlaku mulai <b>hari ini ({{ todayShort }})</b>. Hari-hari sebelumnya tetep pakai angka lama, dan perubahannya masuk riwayat.</span>
        </div>

        <p v-if="error" class="error" role="alert">{{ error }}</p>

        <button type="button" class="pill save" data-test="save" :disabled="!canSave || Boolean(busy)" @click="save">
          Simpan budget <span class="ic"><span v-if="busy === 'save'" class="spin" /><PhCheck v-else :size="16" weight="bold" /></span>
        </button>
        <button v-if="!isNew && shown?.budget" type="button" class="pill ghost release" data-test="release" :disabled="Boolean(busy)" @click="release">
          Lepas budget kategori ini <span class="ic"><span v-if="busy === 'release'" class="spin dark" /><PhX v-else :size="16" weight="bold" /></span>
        </button>
      </form>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { toastController } from '@ionic/vue'
import { PhCheck, PhInfo, PhPlus, PhX } from '@phosphor-icons/vue'
import { perDay, shortDate } from '@/lib/budget.js'
import { CATEGORY_EMOJIS, CATEGORY_TINTS } from '@/lib/categories.js'
import { formatAmount, localToday, parseAmount } from '@/lib/duit.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { rp } from '@/lib/wallet.js'
import { useBudgetsStore } from '@/stores/budgets.js'
import { useCategoriesStore } from '@/stores/categories.js'

const MAX_AMOUNT = 1_000_000_000

const props = defineProps({
  open: { type: Boolean, default: false },
  /** Kategori (dari ringkasan budget) yang diubah. Kosong = "Budget baru". */
  category: { type: Object, default: null },
  /** Layar lebar: dialog di tengah, bukan sheet dari bawah. */
  wide: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])

const budgets = useBudgetsStore()
const categories = useCategoriesStore()

/** Isi yang lagi ditampilin — dipegang sampai sheet ketutup biar nggak kosong pas animasi turun. */
const shown = ref(null)
const isNew = ref(false)
const amountText = ref('')
const picked = ref(null)
const creating = ref(false)
const name = ref('')
const emojis = CATEGORY_EMOJIS.slice(4)
const emoji = ref(emojis[0])
const tint = ref(CATEGORY_TINTS[0])
const error = ref('')
const busy = ref(null)
const shake = ref(false)
const amountEl = ref(null)
const nameEl = ref(null)
/** Kategori baru yang udah kebikin tapi budget-nya gagal disimpen → jangan dibikin lagi pas Simpan diulang. */
let createdId = null

const today = computed(() => budgets.overview?.today ?? localToday())
const month = computed(() => today.value.slice(0, 7))
const todayShort = computed(() => shortDate(today.value))
const free = computed(() => (budgets.overview?.categories ?? []).filter((c) => !c.budget))
const amount = computed(() => parseAmount(amountText.value))
const tooBig = computed(() => amount.value > MAX_AMOUNT)
const target = computed(() => (isNew.value ? (creating.value ? (name.value.trim() ? 'new' : null) : picked.value) : shown.value?.id))
const canSave = computed(() => amount.value > 0 && !tooBig.value && Boolean(target.value))

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    shown.value = props.category
    isNew.value = !props.category
    amountText.value = props.category?.budget ? formatAmount(props.category.budget) : ''
    picked.value = null
    creating.value = false
    name.value = ''
    emoji.value = emojis[0]
    tint.value = CATEGORY_TINTS[0]
    error.value = ''
    busy.value = null
    createdId = null
    if (!isNew.value) {
      await nextTick()
      amountEl.value?.focus()
    }
  },
  { immediate: true },
)

function onAmount(e) {
  const digits = String(e.target.value).replace(/\D/g, '').replace(/^0+/, '').slice(0, 10)
  amountText.value = formatAmount(Number(digits))
  e.target.value = amountText.value
}

function pick(id) {
  picked.value = id
  creating.value = false
}

async function startCreating() {
  creating.value = true
  picked.value = null
  await nextTick()
  nameEl.value?.focus()
}

function close() {
  if (!busy.value) emit('close')
}
// Esc nutup sheet/dialog (keyboard Mac / iPad).
function onKey(e) {
  if (e.key === 'Escape' && props.open) close()
}
document.addEventListener('keydown', onKey)
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))

function doShake() {
  shake.value = false
  requestAnimationFrame(() => {
    shake.value = true
    setTimeout(() => (shake.value = false), 500)
  })
}
const showToast = async (message) => (await toastController.create({ message, duration: 2200, position: 'top', cssClass: 'aio-toast' })).present()

async function run(kind, job, message) {
  if (busy.value) return
  busy.value = kind
  error.value = ''
  try {
    await job()
  } catch (err) {
    error.value = apiErrorMessage(err)
    doShake()
    return
  } finally {
    busy.value = null
  }
  showToast(message)
  emit('close')
}

function save() {
  if (busy.value || !canSave.value) return
  const value = amount.value
  return run(
    'save',
    async () => {
      let id = target.value
      if (id === 'new') {
        if (!createdId) createdId = (await categories.create({ name: name.value.trim(), emoji: emoji.value, tint: tint.value })).id
        id = createdId
      }
      await budgets.set(id, value)
    },
    'Budget disimpen.',
  )
}

function release() {
  return run('release', () => budgets.release(shown.value.id), 'Budget dilepas.')
}
</script>

<style scoped>
.scrim { position: fixed; inset: 0; z-index: 40; background: rgba(0, 0, 0, .35); opacity: 0; pointer-events: none; transition: opacity .4s var(--spring); }
.scrim.show { opacity: 1; pointer-events: auto; }
.sheet { font-family: var(--ion-font-family); color: var(--text); position: fixed; left: 0; right: 0; bottom: 0; z-index: 41; max-width: 560px; max-height: 88vh; margin: 0 auto;
  overflow-y: auto; padding: 10px 18px calc(24px + env(safe-area-inset-bottom)); border-radius: 30px 30px 0 0; background: var(--app-bg);
  transform: translateY(105%); visibility: hidden; transition: transform .5s var(--spring), visibility 0s .5s; }
.sheet.show { transform: none; visibility: visible; transition: transform .5s var(--spring), visibility 0s; }
.handle { width: 40px; height: 5px; margin: 0 auto 14px; border-radius: 9px; background: var(--muted); opacity: .35; }

/* Layar lebar: dialog di tengah layar. */
.sheet.dialog { top: 50%; bottom: auto; left: 50%; right: auto; width: 460px; max-height: 86vh; margin: 0; padding: 22px 22px 22px; border-radius: 30px;
  box-shadow: 0 0 0 1px var(--hair), 0 40px 80px -30px rgba(0, 0, 0, .45); transform: translate(-50%, -46%) scale(.96); opacity: 0;
  transition: transform .45s var(--spring), opacity .3s var(--spring), visibility 0s .45s; }
.sheet.dialog.show { transform: translate(-50%, -50%); opacity: 1; transition: transform .45s var(--spring), opacity .3s var(--spring), visibility 0s; }
.sheet.dialog .handle { display: none; }

.sh-top { display: flex; align-items: center; gap: 12px; }
.av { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; font-size: 21px; flex-shrink: 0; color: #141410; }
.av.plus { background: var(--lime); color: var(--lime-ink); }
.who b { display: block; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
.who span { display: block; font-size: 12.5px; color: var(--muted); margin-top: 1px; }

.step { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 20px 4px 10px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.cp { display: inline-flex; align-items: center; gap: 7px; height: 42px; padding: 0 14px 0 6px; border: 0; border-radius: 99px; background: var(--card); box-shadow: 0 0 0 1px var(--hair);
  color: var(--text); font: 600 14px var(--ion-font-family); cursor: pointer; transition: transform .2s var(--spring), background-color .25s; }
.cp:active { transform: scale(.96); }
.cp .e { width: 32px; height: 32px; border-radius: 99px; display: grid; place-items: center; font-size: 16px; }
.cp.on { background: var(--ink); color: var(--on-ink); box-shadow: none; }
.cp.add { gap: 5px; padding: 0 14px; background: transparent; box-shadow: inset 0 0 0 1.5px var(--hair); color: var(--muted); }
.cp.add.on { background: var(--ink); color: var(--on-ink); box-shadow: none; }

.newcat { margin-top: 12px; padding: 12px; border-radius: 20px; background: var(--card); box-shadow: 0 0 0 1px var(--hair); }
.newcat input { width: 100%; height: 48px; padding: 0 14px; border: 0; outline: 0; border-radius: 14px; background: var(--soft); color: var(--text); font: 600 16px var(--ion-font-family); }
.newcat input::placeholder { color: var(--muted); font-weight: 500; }
.ems { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 10px; }
.ems button { width: 38px; height: 38px; border: 0; border-radius: 12px; background: transparent; font-size: 20px; cursor: pointer; }
.ems button.on { background: var(--soft); box-shadow: inset 0 0 0 2px var(--ink); }
.tns { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.tns button { width: 32px; height: 32px; border: 0; border-radius: 99px; display: grid; place-items: center; color: #141410; cursor: pointer; box-shadow: inset 0 0 0 1px rgba(20, 20, 15, .06); }

.amount { display: flex; justify-content: center; align-items: baseline; gap: 6px; padding: 26px 0 6px; }
.amount.sm { padding-top: 4px; }
.rp { font-size: 26px; font-weight: 700; color: var(--muted); }
.fit { display: inline-grid; max-width: calc(100% - 50px); }
.fit > * { grid-area: 1 / 1; font: 800 54px var(--ion-font-family); letter-spacing: -0.045em; font-variant-numeric: tabular-nums; padding: 0 2px; }
.amount.sm .fit > * { font-size: 46px; }
.mirror { visibility: hidden; white-space: pre; }
.fit input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--text); text-align: center; caret-color: var(--green); }
.fit input::placeholder { color: var(--muted); opacity: .45; }
.per { text-align: center; font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; }
.per b { color: var(--text); }
.per .bad { color: var(--red); }

.note { display: flex; gap: 8px; align-items: flex-start; margin-top: 16px; padding: 12px 14px; border-radius: 16px; background: var(--soft); font-size: 12.5px; color: var(--muted); line-height: 1.45; }
.note b { color: var(--text); }
.note svg { color: var(--text); flex-shrink: 0; margin-top: 1px; }

.error { color: var(--red); font-size: 13px; font-weight: 600; margin: 14px 6px 0; }
.save, .release { width: 100%; justify-content: space-between; height: 58px; padding: 8px 8px 8px 22px; font-size: 16px; }
.save { margin-top: 16px; }
.release { margin-top: 10px; height: 54px; font-size: 15px; }
.save .ic { width: 42px; height: 42px; }
.release .ic { width: 38px; height: 38px; background: var(--card); color: var(--text); }
.save:disabled, .release:disabled { opacity: .35; }
.spin { width: 16px; height: 16px; border-radius: 99px; border: 2.5px solid rgba(28, 36, 0, .25); border-top-color: var(--lime-ink); animation: spin .7s linear infinite; }
.spin.dark { border-color: var(--hair); border-top-color: var(--text); }
@keyframes spin { to { transform: rotate(360deg); } }
.shake { animation: sh .45s; }
@keyframes sh { 20%, 60% { translate: -8px 0; } 40%, 80% { translate: 8px 0; } }
</style>
