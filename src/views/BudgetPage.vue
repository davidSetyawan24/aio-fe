<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page" :class="{ wide }">
        <PageHeader eyebrow="Atur budget" back-to="/tabs/menu">
          <b class="total">{{ rp(o?.total ?? 0) }}</b><br v-if="!wide" /><span :class="{ inline: wide }">budget {{ monthName(month) }}</span>
        </PageHeader>

        <p v-if="error" class="error">{{ error }}</p>

        <div class="grid">
          <div class="main">
            <div class="shell rise" style="--i: 2">
              <div class="hero" :class="{ roomy: wide }" data-test="hero">
                <template v-if="hasBudget">
                  <div class="hero-text">
                    <div class="k">Hari ini · {{ longDay(today) }}</div>
                    <div class="s" data-test="left-label">{{ over ? 'Jatah hari ini kelewat' : 'Sisa jatah hari ini' }}</div>
                    <div class="v" :class="{ over }" data-test="left">{{ over ? `−${rp(-o.todayLeft)}` : rp(o.todayLeft) }}</div>
                    <div class="facts">
                      <span class="fact">jatah <b>{{ rp(o.jatahToday) }}</b></span>
                      <span class="fact">udah keluar <b>{{ rp(o.spentToday) }}</b></span>
                    </div>
                  </div>
                  <div class="hero-side">
                    <div class="meter" :class="{ over }" data-test="meter"><i :style="{ width: `${meter}%` }" /></div>
                    <div class="facts">
                      <span v-if="o.monthLeft >= 0" class="fact">sisa budget bulan ini <b>{{ rpShort(o.monthLeft) }}</b></span>
                      <span v-else class="fact bad">budget bulan ini kelewat <b>{{ rpShort(-o.monthLeft) }}</b></span>
                      <span class="fact"><b>{{ o.daysLeft }}</b> hari lagi</span>
                      <span class="fact">kepake <b>{{ rpShort(o.spentBefore + o.spentToday) }}</b> dari {{ rpShort(o.total) }}</span>
                    </div>
                  </div>
                </template>
                <div v-else-if="o" class="hero-text" data-test="no-budget">
                  <div class="k">Hari ini · {{ longDay(today) }}</div>
                  <div class="v empty">Belum ada budget</div>
                  <div class="s">Pasang budget di kategori bawah — jatah harian dihitung otomatis dari sisa budget ÷ sisa hari.</div>
                </div>
              </div>
            </div>

            <div class="label rise" style="--i: 3">Budget per kategori <small data-test="cat-sum">{{ catSum }}</small></div>
            <div class="shell rise" style="--i: 3">
              <div class="core cats">
                <button v-for="c in cats" :key="c.id" class="cat" data-test="cat" :data-cat="c.id" @click="openSheet(c)">
                  <span class="row1">
                    <span class="av" :style="{ background: c.tint }">{{ c.emoji }}</span>
                    <template v-if="wide">
                      <span v-if="c.budget" class="edit"><PhPencilSimple :size="16" /></span>
                      <span v-else class="set"><PhPlus :size="13" weight="bold" /> Pasang budget</span>
                    </template>
                  </span>
                  <span class="grow">
                    <span class="cname">
                      <b>{{ c.name }}<span v-if="!c.budget" class="chip-out">di luar budget</span></b>
                      <span v-if="c.budget" class="fig"><strong>{{ rpShort(c.spent) }}</strong> / {{ rpShort(c.budget) }}</span>
                    </span>
                    <span v-if="c.budget" class="bar"><i :class="c.use.state" :style="{ width: `${Math.min(100, c.use.pct * 100)}%` }" /></span>
                    <span class="left" :class="{ over: c.use.state === 'over' }">{{ c.note }}</span>
                  </span>
                  <template v-if="!wide">
                    <span v-if="c.budget" class="edit"><PhPencilSimple :size="16" /></span>
                    <span v-else class="set"><PhPlus :size="13" weight="bold" /> Pasang</span>
                  </template>
                </button>
              </div>
            </div>
            <button class="newb rise" style="--i: 4" data-test="new-budget" @click="openSheet(null)">
              <span class="ic"><PhPlus :size="20" weight="bold" /></span>
              <span class="grow"><b>Budget baru</b><span>pilih kategori atau bikin kategori baru</span></span>
              <PhCaretRight :size="18" />
            </button>
            <p class="hint">Tap kategori buat ubah budget-nya. Kategori tanpa budget tetep ngurangin jatah harian.</p>
          </div>

          <aside class="aside-col" data-test="side">
            <template v-if="o?.lastMonth">
              <div class="label">Bulan lalu</div>
              <div class="shell">
                <div class="core last" data-test="last-month">
                  <span class="ic">💰</span>
                  <div>
                    <div class="t">
                      {{ monthName(o.lastMonth.month, month) }} ·
                      <template v-if="o.lastMonth.left >= 0">tersisa dana <b>{{ rp(o.lastMonth.left) }}</b></template>
                      <template v-else><span class="bad">kelewat <b>{{ rp(-o.lastMonth.left) }}</b></span></template>
                    </div>
                    <div class="d">budget {{ rp(o.lastMonth.budget) }} · keluar {{ rp(o.lastMonth.spent) }}</div>
                  </div>
                </div>
              </div>
            </template>

            <div class="label">Riwayat perubahan <small>{{ monthName(month) }}</small></div>
            <div class="shell">
              <div class="core hist" data-test="history">
                <div v-for="(h, i) in history" :key="`${h.date}-${h.category.id}-${i}`" class="h" data-test="hist">
                  <span class="date">{{ shortDate(h.date) }}</span>
                  <span class="e" :style="{ background: h.category.tint }">{{ h.category.emoji }}</span>
                  <div class="grow">
                    <div class="what">{{ h.category.name }}</div>
                    <div class="chg">{{ h.text.text }} <span v-if="h.text.trend" :class="h.text.trend">{{ h.text.trend === 'up' ? '▲ naik' : '▼ turun' }}</span></div>
                  </div>
                </div>
                <p v-if="o && !history.length" class="none">Belum ada perubahan bulan ini.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <BudgetSheet :open="sheetOpen" :category="sheetCategory" :wide="wide" @close="sheetOpen = false" />
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { IonContent, IonPage, onIonViewWillEnter } from '@ionic/vue'
import { PhCaretRight, PhPencilSimple, PhPlus } from '@phosphor-icons/vue'
import BudgetSheet from '@/components/BudgetSheet.vue'
import PageHeader from '@/components/PageHeader.vue'
import { historyText, shortDate, usage } from '@/lib/budget.js'
import { localToday, longDay, monthName } from '@/lib/duit.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { rp, rpShort } from '@/lib/wallet.js'
import { useBudgetsStore } from '@/stores/budgets.js'

const budgets = useBudgetsStore()
const error = ref('')
const sheetOpen = ref(false)
const sheetCategory = ref(null)

/* PC / iPad landscape: tampilan full — kolom kanan buat bulan lalu + riwayat, sheet jadi dialog. */
const query = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(min-width: 1100px)') : null
const wide = ref(Boolean(query?.matches))
const onMedia = (e) => (wide.value = e.matches)
query?.addEventListener?.('change', onMedia)
onBeforeUnmount(() => query?.removeEventListener?.('change', onMedia))

const o = computed(() => budgets.overview)
const today = computed(() => o.value?.today ?? localToday())
const month = computed(() => today.value.slice(0, 7))
const hasBudget = computed(() => Boolean(o.value?.total))
const over = computed(() => (o.value?.todayLeft ?? 0) < 0)
const meter = computed(() => {
  const { jatahToday = 0, spentToday = 0 } = o.value ?? {}
  if (!jatahToday) return spentToday ? 100 : 0
  return Math.min(100, (spentToday / jatahToday) * 100)
})

const cats = computed(() =>
  (o.value?.categories ?? []).map((c) => {
    const use = usage(c.spent, c.budget)
    let note
    if (!c.budget) note = c.spent ? `kepake ${rp(c.spent)} bulan ini` : 'belum ada pengeluaran'
    else if (use.state === 'over') note = `kelewat ${rp(c.spent - c.budget)}`
    else note = `sisa ${rp(c.budget - c.spent)}`
    return { ...c, use, note }
  }),
)
const catSum = computed(() => {
  const list = o.value?.categories ?? []
  return `${list.filter((c) => c.budget).length} dari ${list.length} pakai budget`
})
const history = computed(() => (o.value?.history ?? []).map((h) => ({ ...h, text: historyText(h) })))

async function refresh() {
  try {
    await budgets.load()
    error.value = ''
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}
onIonViewWillEnter(refresh)

// Balik dari background (mis. besok paginya) → angka hari ini diperbarui.
function onVisible() {
  if (document.visibilityState === 'visible') refresh()
}
document.addEventListener('visibilitychange', onVisible)
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))

function openSheet(category) {
  // Data asli dari server (tanpa tambahan tampilan), biar sheet baca angka yang sama.
  sheetCategory.value = category ? (o.value?.categories ?? []).find((c) => c.id === category.id) ?? null : null
  sheetOpen.value = true
}
</script>

<style scoped>
.page { max-width: 620px; padding-bottom: 110px; }
.page.wide { max-width: none; padding: 40px 48px 60px; }
.total { color: var(--text); font-weight: 800; }
.inline { margin-left: .25em; }
.error { color: var(--red); font-size: 13px; font-weight: 600; margin: 0 6px 12px; }
.bad { color: var(--red); }

.wide .grid { display: grid; grid-template-columns: minmax(0, 8fr) minmax(320px, 4fr); gap: 24px; align-items: start; }
.wide .aside-col { position: sticky; top: 24px; }
.wide .aside-col > .label:first-child { margin-top: 0; }

/* kartu hitam */
.hero { position: relative; overflow: hidden; padding: 20px 20px 18px; border-radius: 25px; background: #141410; color: #F3F2EE; }
.hero::before { content: ''; position: absolute; right: -60px; top: -80px; width: 220px; height: 220px; border-radius: 99px;
  background: radial-gradient(circle, rgba(200, 240, 74, .28), transparent 65%); }
.hero > * { position: relative; }
.k { font-size: 12px; font-weight: 600; color: rgba(243, 242, 238, .6); }
.s { font-size: 12.5px; color: rgba(243, 242, 238, .6); margin-top: 6px; line-height: 1.45; }
.v { font-size: 44px; font-weight: 800; letter-spacing: -0.045em; margin-top: 2px; color: var(--lime); font-variant-numeric: tabular-nums; }
.v.over { color: #FF8A73; }
.v.empty { font-size: 30px; color: #F3F2EE; margin-top: 8px; }
.meter { height: 8px; border-radius: 99px; background: rgba(243, 242, 238, .14); margin-top: 14px; overflow: hidden; }
.meter i { display: block; height: 100%; border-radius: 99px; background: var(--lime); transform-origin: left; animation: gx 1s var(--spring) both; }
.meter.over i { background: #FF8A73; }
@keyframes gx { from { transform: scaleX(0); } }
.facts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.fact { padding: 5px 10px; border-radius: 99px; background: rgba(243, 242, 238, .08); font-size: 11.5px; font-weight: 600; color: rgba(243, 242, 238, .7); font-variant-numeric: tabular-nums; }
.fact b { color: #F3F2EE; }
.fact.bad, .fact.bad b { color: #FF8A73; }
.hero.roomy { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; align-items: end; padding: 28px 30px 26px; }
.hero.roomy::before { right: -80px; top: -120px; width: 380px; height: 380px; background: radial-gradient(circle, rgba(200, 240, 74, .22), transparent 65%); }
.roomy .v { font-size: 64px; }
.roomy .v.empty { font-size: 40px; }
.roomy .hero-side { align-self: stretch; display: flex; flex-direction: column; justify-content: flex-end; }

.label { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em;
  color: var(--muted); margin: 26px 8px 10px; }
.label small { font-size: 12px; letter-spacing: .02em; text-transform: none; color: var(--text); font-weight: 700; }
.hint { color: var(--muted); font-size: 12.5px; margin: 10px 8px 0; line-height: 1.45; }

/* kategori */
.cats { padding: 6px; }
.cat { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 10px; border: 0; border-radius: 18px; background: transparent; color: var(--text); font: inherit;
  text-align: left; cursor: pointer; }
.cat + .cat { box-shadow: inset 0 1px 0 var(--hair); border-radius: 0; }
.cat:active { background: var(--soft); }
.row1 { display: contents; }
.av { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; font-size: 21px; flex-shrink: 0; color: #141410; }
.grow { flex: 1; min-width: 0; display: block; }
.cname { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.cname b { font-weight: 600; font-size: 15px; }
.fig { font-size: 12.5px; color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
.fig strong { color: var(--text); font-weight: 700; }
.bar { display: block; height: 6px; border-radius: 99px; background: var(--soft); margin-top: 8px; overflow: hidden; }
.bar i { display: block; height: 100%; border-radius: 99px; background: var(--ink); transform-origin: left; animation: gx 1s var(--spring) both; }
.bar i.warn { background: var(--amber); }
.bar i.over { background: var(--red); }
.left { display: block; font-size: 12px; color: var(--muted); margin-top: 6px; }
.left.over { color: var(--red); font-weight: 600; }
.edit { flex-shrink: 0; width: 36px; height: 36px; border-radius: 12px; display: grid; place-items: center; color: var(--muted); background: var(--soft); }
.chip-out { display: inline-flex; padding: 2px 8px; border-radius: 99px; background: rgba(245, 165, 36, .14); color: #C27C00; font-size: 11px; font-weight: 700; margin-left: 6px; vertical-align: 1px; }
.set { flex-shrink: 0; display: inline-flex; align-items: center; gap: 4px; height: 34px; padding: 0 12px; border-radius: 99px; background: var(--ink); color: var(--on-ink);
  font: 700 12.5px var(--ion-font-family); }

.wide .cats { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; padding: 12px; }
.wide .cat { flex-direction: column; align-items: stretch; gap: 12px; padding: 16px; border-radius: 20px; background: var(--soft); box-shadow: none;
  transition: transform .3s var(--spring); }
.wide .cat:hover { transform: translateY(-2px); }
.wide .row1 { display: flex; align-items: center; justify-content: space-between; }
.wide .edit, .wide .bar { background: var(--card); }

.newb { display: flex; align-items: center; gap: 12px; width: 100%; margin-top: 12px; padding: 12px 16px 12px 12px; border: 1.5px dashed var(--muted); border-radius: 22px;
  background: transparent; color: var(--text); font: inherit; text-align: left; cursor: pointer; opacity: .9; }
.newb .ic { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; background: var(--lime); color: var(--lime-ink); flex-shrink: 0; }
.newb b { display: block; font-size: 15px; }
.newb .grow span { display: block; font-size: 12.5px; color: var(--muted); margin-top: 2px; }

/* bulan lalu + riwayat */
.last { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
.last .ic { width: 42px; height: 42px; border-radius: 14px; display: grid; place-items: center; background: #E4F7C4; font-size: 20px; flex-shrink: 0; }
.last .t { font-weight: 700; font-size: 14.5px; }
.last .t b { font-variant-numeric: tabular-nums; }
.last .d { font-size: 12.5px; color: var(--muted); margin-top: 2px; }
.hist { padding: 6px 4px; }
.h { display: flex; align-items: center; gap: 12px; padding: 10px 12px; }
.h + .h { box-shadow: inset 0 1px 0 var(--hair); }
.h .date { width: 52px; flex-shrink: 0; font-size: 12px; font-weight: 700; color: var(--muted); }
.h .e { width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center; font-size: 16px; flex-shrink: 0; }
.h .what { font-size: 14px; font-weight: 600; }
.h .chg { font-size: 12.5px; color: var(--muted); margin-top: 2px; font-variant-numeric: tabular-nums; }
.up { color: var(--red); }
.down { color: var(--green); }
.none { margin: 0; padding: 12px; color: var(--muted); font-size: 13px; }
</style>
