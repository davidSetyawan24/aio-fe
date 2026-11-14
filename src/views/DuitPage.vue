<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="layout" :class="{ wide }">
        <div class="page narrow">
          <PageHeader eyebrow="Duit" back-to="/tabs/menu"><b class="total">{{ rp(summary?.monthTotal ?? 0) }}</b><br /><span>keluar bulan ini</span></PageHeader>

          <p v-if="error" class="error">{{ error }}</p>

          <div class="shell rise" style="--i: 2">
            <div class="hero">
              <div class="k">Hari ini · {{ longDay(today) }}</div>
              <div class="s">Keluar hari ini</div>
              <div class="v" data-test="today-total">{{ rp(summary?.todayTotal ?? 0) }}</div>
              <div class="s" data-test="today-count">{{ summary?.todayCount ? `${summary.todayCount} catatan hari ini` : 'Belum ada catatan hari ini' }}</div>
              <div class="bars">
                <div v-for="(d, i) in bars" :key="d.date" class="bar" :class="{ today: d.date === today }" :style="{ '--i': i }" data-test="bar">
                  <i :style="{ height: `${d.height}px` }" /><span>{{ weekdayShort(d.date) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-for="(g, gi) in days" :key="g.date" class="rise" :style="{ '--i': 3 + Math.min(gi, 6) }" data-test="day">
            <div class="group-label" data-test="day-head">{{ g.label }} <small>{{ rp(g.total) }}</small></div>
            <div class="shell">
              <div class="core list">
                <button v-for="e in g.items" :key="e.id" class="item" :class="{ picked: wide && selected?.id === e.id }" data-test="expense" @click="open(e)">
                  <span class="av" :style="{ background: e.category.tint }">{{ e.category.emoji }}</span>
                  <span class="grow">
                    <span class="title">{{ e.note || e.category.name }}</span>
                    <span class="sub">{{ e.category.name }} · {{ e.source.name }}</span>
                  </span>
                  <span class="amt">{{ rp(e.amount) }}</span>
                </button>
              </div>
            </div>
          </div>

          <div v-if="loaded && !days.length" class="shell rise" style="--i: 3">
            <div class="core empty">Belum ada catatan bulan ini. Tap <b>Catat</b> buat mulai.</div>
          </div>

          <button v-if="loaded" class="older" data-test="older" :disabled="loadingOlder" @click="loadOlder">
            Lihat bulan {{ monthName(olderMonth, currentMonth) }} <PhCaretDown :size="14" weight="bold" />
          </button>
        </div>

        <aside v-if="wide" class="side-form">
          <div class="side-head">
            <button v-if="selected" class="cancel" @click="selected = null">Batal ubah</button>
          </div>
          <ExpenseForm ref="sideForm" :expense="selected" :eyebrow="selected ? 'Ubah catatan' : 'Catat duit keluar'" @saved="onSideSaved" @deleted="selected = null" />
        </aside>
      </div>

      <input ref="trap" class="focus-trap" aria-hidden="true" tabindex="-1" inputmode="numeric" />
      <button v-if="!wide" slot="fixed" class="fab" data-test="add" @click="add">
        Catat <span class="ic"><PhPlus :size="19" weight="bold" /></span>
      </button>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { IonContent, IonPage, onIonViewWillEnter, useIonRouter } from '@ionic/vue'
import { PhCaretDown, PhPlus } from '@phosphor-icons/vue'
import ExpenseForm from '@/components/ExpenseForm.vue'
import PageHeader from '@/components/PageHeader.vue'
import { groupByDay, localToday, longDay, monthName, prevMonth, weekdayShort } from '@/lib/duit.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { rp } from '@/lib/wallet.js'
import { useExpensesStore } from '@/stores/expenses.js'

const ionRouter = useIonRouter()
const expenses = useExpensesStore()

const error = ref('')
const loaded = ref(false)
const loadingOlder = ref(false)
const selected = ref(null)
const sideForm = ref(null)
const trap = ref(null)

/* iPad landscape / Mac: daftar kiri, form catat selalu kebuka di kanan. */
const query = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(min-width: 1100px)') : null
const wide = ref(Boolean(query?.matches))
const onMedia = (e) => (wide.value = e.matches)
query?.addEventListener?.('change', onMedia)
onBeforeUnmount(() => query?.removeEventListener?.('change', onMedia))

const summary = computed(() => expenses.summary)
const today = computed(() => summary.value?.today ?? localToday())
const currentMonth = computed(() => today.value.slice(0, 7))
/** Bulan yang lagi ditampilin (bulan ini + yang dibuka lewat "Lihat bulan …"). */
const extraMonths = ref([])
const shownMonths = computed(() => [currentMonth.value, ...extraMonths.value])
const olderMonth = computed(() => prevMonth(shownMonths.value.at(-1)))
const days = computed(() => groupByDay(shownMonths.value.flatMap((m) => expenses.months[m] ?? []), today.value))

const bars = computed(() => {
  const list = summary.value?.last7Days ?? []
  const max = Math.max(1, ...list.map((d) => d.total))
  return list.map((d) => ({ ...d, height: Math.max(6, Math.round((d.total / max) * 52)) }))
})

async function refresh() {
  try {
    await expenses.loadSummary()
    await Promise.all(shownMonths.value.map((m) => expenses.loadMonth(m)))
    error.value = ''
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loaded.value = true
  }
}

onIonViewWillEnter(() => {
  refresh()
  sideForm.value?.pickJustCreated()
})

// Balik dari background (mis. besok paginya) → angka hari ini & daftar diperbarui.
function onVisible() {
  if (document.visibilityState === 'visible' && loaded.value) refresh()
}
document.addEventListener('visibilitychange', onVisible)
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))

async function loadOlder() {
  if (loadingOlder.value) return
  const month = olderMonth.value
  loadingOlder.value = true
  try {
    await expenses.loadMonth(month)
    extraMonths.value = [...extraMonths.value, month]
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loadingOlder.value = false
  }
}

function open(e) {
  if (wide.value) selected.value = e
  else ionRouter.push(`/tabs/menu/duit/${e.id}`)
}

function add() {
  // iOS cuma mau buka keyboard kalau fokusnya kejadian di tap yang sama → fokusin kolom bayangan dulu,
  // nanti layar Catat mindahin fokus ke nominal (keyboard tetep kebuka).
  trap.value?.focus()
  ionRouter.push('/tabs/menu/duit/catat')
}

function onSideSaved(_expense, again) {
  if (again) return
  if (selected.value) selected.value = null
  else sideForm.value?.reset()
}
</script>

<style scoped>
.layout.wide { display: grid; grid-template-columns: minmax(0, 1fr) 440px; align-items: start; min-height: 100%; }
.narrow { max-width: 620px; padding-bottom: 110px; }
.wide .narrow { padding-bottom: 60px; }
.total { color: var(--text); font-weight: 800; }
.error { color: var(--red); font-size: 13px; font-weight: 600; margin: 0 6px 12px; }

.hero { position: relative; overflow: hidden; padding: 20px 20px 18px; border-radius: 25px; background: #141410; color: #F3F2EE; }
.hero::before { content: ''; position: absolute; right: -60px; top: -80px; width: 220px; height: 220px; border-radius: 99px;
  background: radial-gradient(circle, rgba(200, 240, 74, .28), transparent 65%); }
.k { font-size: 12px; font-weight: 600; color: rgba(243, 242, 238, .6); }
.s { font-size: 12.5px; color: rgba(243, 242, 238, .6); margin-top: 6px; }
.v { margin-top: 2px; font-size: 40px; font-weight: 800; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
.bars { display: flex; align-items: flex-end; gap: 8px; height: 74px; margin-top: 16px; }
.bar { flex: 1; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 6px; }
.bar i { display: block; width: 100%; max-width: 28px; border-radius: 8px; background: rgba(243, 242, 238, .16); transform-origin: bottom;
  animation: grow .9s var(--spring) both; animation-delay: calc(var(--i) * 60ms); }
.bar.today i { background: var(--lime); }
.bar span { font-size: 10.5px; font-weight: 600; color: rgba(243, 242, 238, .5); }
.bar.today span { color: var(--lime); }
@keyframes grow { from { transform: scaleY(0); } }

.group-label { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em;
  color: var(--muted); margin: 24px 8px 10px; }
.group-label small { font-size: 12px; font-weight: 700; letter-spacing: .02em; text-transform: none; color: var(--text); font-variant-numeric: tabular-nums; }
.list { padding: 4px 0; }
.item { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 14px; border: 0; background: transparent; color: var(--text); font: inherit; text-align: left; cursor: pointer; }
.item + .item { box-shadow: inset 0 1px 0 var(--hair); }
.item:active, .item.picked { background: var(--soft); }
.av { width: 42px; height: 42px; border-radius: 14px; display: grid; place-items: center; font-size: 20px; flex-shrink: 0; }
.title, .sub { display: block; }
.sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.amt { font-weight: 800; font-size: 15px; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.empty { padding: 18px; color: var(--muted); font-size: 13.5px; line-height: 1.5; }
.older { display: flex; align-items: center; gap: 6px; margin: 18px auto 0; height: 40px; padding: 0 16px; border: 0; border-radius: 99px; background: var(--soft); color: var(--text);
  font: 600 13.5px var(--ion-font-family); cursor: pointer; }
.older:disabled { opacity: .5; }

.side-form { position: sticky; top: 0; height: 100vh; overflow-y: auto; padding: 40px 30px 40px; background: var(--card); box-shadow: -1px 0 0 var(--hair); }
.side-head { display: flex; justify-content: flex-end; min-height: 24px; margin-bottom: 8px; }
.cancel { border: 0; background: transparent; color: var(--muted); font: 600 14px var(--ion-font-family); cursor: pointer; }

.focus-trap { position: fixed; left: 0; top: 0; width: 1px; height: 1px; opacity: 0; border: 0; padding: 0; font-size: 16px; pointer-events: none; }
.fab { position: absolute; right: 18px; bottom: calc(92px + env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 10px; height: 52px; padding: 6px 6px 6px 20px;
  border: 0; border-radius: 99px; background: var(--ink); color: var(--on-ink); font: 700 15px var(--ion-font-family); box-shadow: 0 16px 34px -14px rgba(0, 0, 0, .5);
  cursor: pointer; transition: transform .45s var(--spring); }
.fab:active { transform: scale(.96); }
.fab .ic { width: 40px; height: 40px; border-radius: 99px; background: var(--lime); color: var(--lime-ink); display: grid; place-items: center; }
@media (min-width: 768px) { .fab { bottom: 28px; right: 36px; } }
</style>
