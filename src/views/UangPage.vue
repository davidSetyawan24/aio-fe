<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page u-page" :class="{ wide }">
        <!-- Lonceng di baris label (pojok kanan halaman); judul + tombol bulan di baris sendiri (pola Agenda). -->
        <PageHeader eyebrow="Uang" bell />
        <div class="u-head">
          <h1 class="h1 rise" style="--i: 1">{{ rp(data?.total ?? 0) }}<br /><span>keluar {{ name }}{{ data?.isCurrent !== false ? ' · s.d. hari ini' : '' }}</span></h1>
          <div class="u-head-r">
            <div class="mnav rise" style="--i: 1" data-test="month">
              <button data-test="prev" aria-label="Bulan sebelumnya" :disabled="atFirst" @click="shift(-1)"><PhCaretLeft :size="16" weight="bold" /></button>
              <b>{{ data ? monthLabel(data.month) : '' }}</b>
              <button data-test="next" aria-label="Bulan berikutnya" :disabled="atLast" @click="shift(1)"><PhCaretRight :size="16" weight="bold" /></button>
            </div>
            <button v-if="wide" class="u-add" data-test="pc-add" @click="catat">Catat <span class="ic"><PhPlus :size="19" weight="bold" /></span></button>
          </div>
        </div>

        <p v-if="error" class="u-error">{{ error }}</p>

        <div v-if="data" class="u-grid" :class="{ past: !data.isCurrent }">
          <section class="a-hero"><UangHero :data="data" /></section>
          <section v-if="data.isCurrent" class="a-todo"><UangAttention :items="data.attention" :days-left="data.todayBudget?.daysLeft ?? daysLeft" /></section>
          <section class="a-cat"><UangCategories :categories="data.categories" :total="data.total" :month="data.month" /></section>
          <section class="a-chart"><UangDaily :daily="data.daily" :avg-per-day="data.avgPerDay" :today="data.today" :is-current="data.isCurrent" :month="data.month" /></section>
          <section class="a-tiles">
            <div class="u-label rise" style="--i: 6">Lainnya</div>
            <div class="u-tiles rise" style="--i: 6">
              <button class="u-tile" data-test="tile-bills" @click="go('/tabs/menu/bayar-rutin')">
                <span class="ic" style="background: #E4F7C4">🔁</span>
                <span>
                  <span class="k">Bayar Rutin</span>
                  <template v-if="data.isCurrent">
                    <b>{{ rpShort(data.bills.left) }}</b>
                    <small>{{ data.bills.count ? `belum lunas ${name}` : 'belum ada bayar rutin' }}</small>
                    <small v-if="data.bills.lateCount" class="red">{{ data.bills.lateCount }} telat</small>
                  </template>
                  <template v-else>
                    <b>{{ data.bills.count ? `${data.bills.paidCount}/${data.bills.count}` : '–' }}</b>
                    <small>{{ data.bills.count ? `lunas di ${name}` : `nggak ada jadwal di ${name}` }}</small>
                  </template>
                </span>
              </button>
              <button v-if="data.split" class="u-tile" data-test="tile-split" @click="go('/tabs/menu/split-bill')">
                <span class="ic" style="background: #FFE0E6">🍕</span>
                <span>
                  <span class="k">Split bill</span>
                  <b>{{ rpShort(data.split.outstanding) }}</b>
                  <small>{{ data.split.people ? `masih di ${data.split.people} temen` : 'semua temen udah bayar' }}</small>
                </span>
              </button>
            </div>
          </section>
        </div>
      </div>

      <button v-if="!wide" slot="fixed" class="u-fab" data-test="fab" @click="catat">
        Catat <span class="ic"><PhPlus :size="19" weight="bold" /></span>
      </button>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { IonContent, IonPage, onIonViewWillEnter, useIonRouter } from '@ionic/vue'
import { PhCaretLeft, PhCaretRight, PhPlus } from '@phosphor-icons/vue'
import PageHeader from '@/components/PageHeader.vue'
import UangAttention from '@/components/UangAttention.vue'
import UangCategories from '@/components/UangCategories.vue'
import UangDaily from '@/components/UangDaily.vue'
import UangHero from '@/components/UangHero.vue'
import { addMonth, monthLabel } from '@/lib/bayarRutin.js'
import { monthName } from '@/lib/duit.js'
import { useMedia } from '@/lib/media.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { rp, rpShort } from '@/lib/wallet.js'
import { useOverviewStore } from '@/stores/overview.js'

const ionRouter = useIonRouter()
const store = useOverviewStore()
const wide = useMedia('(min-width: 1100px)')
const error = ref('')

const data = computed(() => store.data)
const name = computed(() => (data.value ? monthName(data.value.month, data.value.today) : 'bulan ini'))
const atFirst = computed(() => !data.value || data.value.month <= data.value.firstMonth)
const atLast = computed(() => !data.value || data.value.isCurrent)
const daysLeft = computed(() => data.value?.daily.filter((d) => d.date >= data.value.today).length ?? 0)

async function load(month) {
  try {
    await store.load(month)
    error.value = ''
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}
// Balik ke tab (mis. abis Catat) → muat ulang bulan yang dipilih; "bulan ini" tetep ikut tanggal server.
onIonViewWillEnter(() => load(store.wanted ?? undefined))
function shift(n) {
  const target = addMonth(data.value.month, n)
  load(target === data.value.today.slice(0, 7) ? undefined : target)
}

const go = (path) => ionRouter.push(path)
// HP: layar Catat. PC: Duit (form Catat udah di kanan layar Duit).
const catat = () => go(wide.value ? '/tabs/menu/duit' : '/tabs/menu/duit/catat')
</script>

<style scoped>
.u-page { padding-bottom: 110px; }
.u-page:not(.wide) { max-width: 620px; }
.u-head .h1 { font-variant-numeric: tabular-nums; margin-bottom: 14px; }
.u-head .h1 span { font-size: .62em; letter-spacing: -0.02em; }
.u-error { color: var(--red); font-size: 13px; font-weight: 600; margin: 0 6px 12px; }

.mnav { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 4px; border-radius: 99px; background: var(--card); box-shadow: 0 0 0 1px var(--hair); margin-bottom: 16px; }
.mnav b { font-size: 14px; font-weight: 800; }
.mnav button { width: 38px; height: 38px; border: 0; border-radius: 99px; background: var(--soft); color: var(--text); display: grid; place-items: center; cursor: pointer; }
.mnav button:disabled { opacity: .3; cursor: default; }

.u-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 24px 8px 10px; }
.u-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.u-tile { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; min-height: 128px; padding: 14px; border: 0; border-radius: 22px; background: var(--card);
  box-shadow: 0 0 0 1px var(--hair), var(--lift); color: var(--text); font: inherit; text-align: left; cursor: pointer; }
.u-tile:active { transform: scale(.98); }
.u-tile .ic { width: 36px; height: 36px; border-radius: 12px; display: grid; place-items: center; font-size: 18px; }
.u-tile .k { display: block; font-size: 12px; color: var(--muted); font-weight: 700; }
.u-tile b { display: block; font-size: 20px; font-weight: 800; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.u-tile small { display: block; font-size: 11.5px; color: var(--muted); font-weight: 600; margin-top: 2px; }
.u-tile small.red { color: var(--red); }

.u-fab { position: absolute; right: 18px; bottom: calc(92px + env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 10px; height: 52px; padding: 6px 6px 6px 20px;
  border: 0; border-radius: 99px; background: var(--ink); color: var(--on-ink); font: 700 15px var(--ion-font-family); box-shadow: 0 16px 34px -12px rgba(0, 0, 0, .45); cursor: pointer; }
.u-fab:active { transform: scale(.96); }
.u-fab .ic, .u-add .ic { width: 40px; height: 40px; border-radius: 99px; background: var(--lime); color: var(--lime-ink); display: grid; place-items: center; }
@media (min-width: 768px) { .u-fab { bottom: 28px; right: 36px; } }

@media (min-width: 1100px) {
  .u-page { padding-bottom: 64px; }
  .u-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; }
  .u-head .h1 { flex: 1; min-width: 0; margin-bottom: 26px; }
  .u-head-r { display: flex; align-items: center; gap: 12px; margin-bottom: 26px; flex-shrink: 0; }
  .mnav { padding: 0; background: transparent; box-shadow: none; margin: 0; }
  .mnav b { display: none; }
  .mnav button { background: var(--card); box-shadow: 0 0 0 1px var(--hair); }
  .u-add { display: inline-flex; align-items: center; gap: 10px; height: 52px; padding: 0 6px 0 20px; border: 0; border-radius: 99px; background: var(--ink); color: var(--on-ink);
    font: 700 15px var(--ion-font-family); cursor: pointer; }
  /* Kolom kanan (Perlu diurus) dilebarin biar judul & tombol nggak kejepit di 1440. */
  .u-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr) minmax(0, 1.2fr); grid-template-areas: 'hero hero todo' 'cat chart chart' 'tiles tiles tiles';
    gap: 0 24px; align-items: start; }
  .u-grid.past { grid-template-areas: 'hero hero hero' 'cat chart chart' 'tiles tiles tiles'; }
  .a-hero { grid-area: hero; align-self: stretch; }
  .a-hero > :deep(.shell) { height: 100%; }
  .a-todo { grid-area: todo; }
  .a-cat { grid-area: cat; }
  .a-chart { grid-area: chart; }
  .a-tiles { grid-area: tiles; }
  .u-tiles { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
}
@media (hover: hover) {
  .u-tile:hover { opacity: .85; }
  .mnav button:not(:disabled):hover { background: var(--soft); }
}
</style>
