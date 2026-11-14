<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page narrow" :class="{ canvas: wide }">
        <PageHeader eyebrow="Duit" back-to="/tabs/menu"><b class="total">{{ rp(summary?.monthTotal ?? 0) }}</b><br v-if="!wide" /><span :class="{ inline: wide }">keluar bulan ini</span></PageHeader>

        <p v-if="error" class="error">{{ error }}</p>

        <div class="shell rise" style="--i: 2">
          <div class="hero" :class="{ roomy: wide }">
            <div class="hero-text">
              <div class="k">Hari ini · {{ longDay(today) }}</div>
              <div class="s">Keluar hari ini</div>
              <div class="v" data-test="today-total">{{ rp(summary?.todayTotal ?? 0) }}</div>
              <div class="facts">
                <span class="s" :class="{ fact: wide }" data-test="today-count">{{ summary?.todayCount ? `${summary.todayCount} catatan hari ini` : 'Belum ada catatan hari ini' }}</span>
                <span v-if="wide" class="fact" data-test="month-fact">bulan ini <b>{{ rp(summary?.monthTotal ?? 0) }}</b></span>
              </div>
            </div>
            <div class="bars">
              <div v-for="(d, i) in bars" :key="d.date" class="bar" :class="{ today: d.date === today }" :style="{ '--i': i }" data-test="bar">
                <em v-if="wide">{{ barLabel(d.total) }}</em><i :style="{ height: `${d.height}px` }" /><span>{{ weekdayShort(d.date) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="cols" :class="{ wide }">
          <div class="list-col">
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

            <div v-if="loaded && !days.length" class="shell rise empty-wrap" style="--i: 3">
              <div class="core empty">Belum ada catatan bulan ini. {{ wide ? 'Catat di sebelah kanan buat mulai.' : 'Tap Catat buat mulai.' }}</div>
            </div>

            <button v-if="loaded" class="older" data-test="older" :disabled="loadingOlder" @click="loadOlder">
              Lihat bulan {{ monthName(olderMonth, currentMonth) }} <PhCaretDown :size="14" weight="bold" />
            </button>
          </div>

          <aside v-if="wide" class="side-form rise" style="--i: 3" data-test="side-form">
            <div class="shell">
              <div class="core form-card">
                <button v-if="selected" class="cancel" @click="selected = null">Batal ubah</button>
                <ExpenseForm ref="sideForm" :expense="selected" :eyebrow="selected ? 'Ubah catatan' : 'Catat duit keluar'" @saved="onSideSaved" @deleted="selected = null" />
              </div>
            </div>
          </aside>
        </div>
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
import { barLabel, groupByDay, localToday, longDay, monthName, prevMonth, weekdayShort } from '@/lib/duit.js'
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

/* iPad landscape / Mac: satu kanvas di tengah — daftar kiri, form catat sebagai kartu di kanan. */
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
  const tall = wide.value ? 100 : 52
  return list.map((d) => ({ ...d, height: Math.max(6, Math.round((d.total / max) * tall)) }))
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
.narrow { max-width: 620px; padding-bottom: 110px; }
.canvas { max-width: 1320px; padding-bottom: 60px; }
.total { color: var(--text); font-weight: 800; }
.inline { margin-left: .25em; }
.error { color: var(--red); font-size: 13px; font-weight: 600; margin: 0 6px 12px; }

.hero { position: relative; overflow: hidden; padding: 20px 20px 18px; border-radius: 25px; background: #141410; color: #F3F2EE; }
.hero::before { content: ''; position: absolute; right: -60px; top: -80px; width: 220px; height: 220px; border-radius: 99px;
  background: radial-gradient(circle, rgba(200, 240, 74, .28), transparent 65%); }
.hero-text { position: relative; }
.k { font-size: 12px; font-weight: 600; color: rgba(243, 242, 238, .6); }
.s { display: block; font-size: 12.5px; color: rgba(243, 242, 238, .6); margin-top: 6px; }
.v { margin-top: 2px; font-size: 40px; font-weight: 800; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
.bars { position: relative; display: flex; align-items: flex-end; gap: 8px; height: 74px; margin-top: 16px; }
.bar { flex: 1; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 6px; }
.bar i { display: block; width: 100%; max-width: 28px; border-radius: 8px; background: rgba(243, 242, 238, .16); transform-origin: bottom;
  animation: grow .9s var(--spring) both; animation-delay: calc(var(--i) * 60ms); }
.bar.today i { background: var(--lime); }
.bar span { font-size: 10.5px; font-weight: 600; color: rgba(243, 242, 238, .5); }
.bar.today span, .bar.today em { color: var(--lime); }
.bar em { min-height: 14px; font-style: normal; font-size: 11px; font-weight: 700; color: rgba(243, 242, 238, .55); font-variant-numeric: tabular-nums; }
@keyframes grow { from { transform: scaleY(0); } }

/* Kartu hitam versi lebar: angka kiri, grafik tinggi di kanan. */
.hero.roomy { display: grid; grid-template-columns: 1fr 1.25fr; gap: 28px; align-items: end; padding: 28px 30px 26px; }
.hero.roomy::before { right: -80px; top: -120px; width: 380px; height: 380px; background: radial-gradient(circle, rgba(200, 240, 74, .22), transparent 65%); }
.roomy .k, .roomy .s { font-size: 13px; }
.roomy .v { font-size: 60px; letter-spacing: -0.045em; line-height: 1.05; margin-top: 4px; }
.roomy .facts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.fact { margin: 0; padding: 6px 11px; border-radius: 99px; background: rgba(243, 242, 238, .08); font-size: 12px; font-weight: 600; color: rgba(243, 242, 238, .7);
  font-variant-numeric: tabular-nums; }
.fact b { color: #F3F2EE; }
.roomy .bars { height: 150px; gap: 12px; margin-top: 0; }
.roomy .bar { gap: 8px; }
.roomy .bar i { max-width: 44px; border-radius: 10px; }
.roomy .bar span { font-size: 11.5px; }

.cols.wide { display: grid; grid-template-columns: minmax(0, 1fr) clamp(380px, 34%, 460px); gap: 28px; align-items: start; }
.side-form { position: sticky; top: 24px; margin-top: 24px; }
.form-card { padding: 22px 24px 24px; }
.cancel { float: right; border: 0; background: transparent; color: var(--muted); font: 600 14px var(--ion-font-family); cursor: pointer; padding: 8px 0; }
.empty-wrap { margin-top: 24px; }
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


.focus-trap { position: fixed; left: 0; top: 0; width: 1px; height: 1px; opacity: 0; border: 0; padding: 0; font-size: 16px; pointer-events: none; }
.fab { position: absolute; right: 18px; bottom: calc(92px + env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 10px; height: 52px; padding: 6px 6px 6px 20px;
  border: 0; border-radius: 99px; background: var(--ink); color: var(--on-ink); font: 700 15px var(--ion-font-family); box-shadow: 0 16px 34px -14px rgba(0, 0, 0, .5);
  cursor: pointer; transition: transform .45s var(--spring); }
.fab:active { transform: scale(.96); }
.fab .ic { width: 40px; height: 40px; border-radius: 99px; background: var(--lime); color: var(--lime-ink); display: grid; place-items: center; }
@media (min-width: 768px) { .fab { bottom: 28px; right: 36px; } }
</style>
