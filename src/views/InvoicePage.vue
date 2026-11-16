<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page inv-page" :class="{ wide }">
        <div class="inv-head">
          <PageHeader eyebrow="Invoice" back-to="/tabs/menu">{{ rp(summary.unpaid) }}<br /><span>belum dibayar</span></PageHeader>
          <div v-if="wide" class="inv-hbtns">
            <button class="inv-ghost" data-test="pc-settings" @click="goSettings"><PhGearSix :size="17" />Atur invoice</button>
            <button class="pill inv-add" data-test="pc-add" @click="goNew">Bikin invoice <span class="ic"><PhPlus :size="19" weight="bold" /></span></button>
          </div>
          <button v-else class="inv-gear" data-test="settings" aria-label="Atur invoice" @click="goSettings"><PhGearSix :size="20" /></button>
        </div>

        <p v-if="error" class="inv-error">{{ error }}</p>

        <template v-if="store.list">
          <div v-if="!store.list.length" class="shell rise" style="--i: 2">
            <div class="core inv-empty">
              <div class="big">📄</div>
              <b>Belum ada invoice. Bikin yang pertama yuk.</b>
              <p>Nomor, total, dan terbilangnya jalan sendiri. Lo cuma isi yang beda tiap invoice.</p>
              <button class="pill" @click="goNew">Bikin invoice <span class="ic"><PhPlus :size="17" weight="bold" /></span></button>
            </div>
          </div>

          <!-- HP / iPad -->
          <template v-else-if="!wide">
            <div class="inv-minis" data-test="minis">
              <span class="mini">{{ summary.unpaidCount }} belum dibayar</span>
              <span v-if="summary.lateCount" class="mini red">{{ summary.lateCount }} telat</span>
            </div>
            <LaptopNote />
            <div v-if="open.length" data-test="sec-open">
              <div class="inv-label rise" style="--i: 1">Belum dibayar <small>{{ rp(summary.unpaid) }}</small></div>
              <div class="shell rise" style="--i: 1"><div class="core inv-list"><InvoiceRow v-for="i in open" :key="i.id" :invoice="i" @open="openOne" /></div></div>
            </div>
            <div v-if="paid.length" data-test="sec-paid">
              <div class="inv-label rise" style="--i: 2">Lunas <small>{{ paid.length }}</small></div>
              <div class="shell rise" style="--i: 2"><div class="core inv-list"><InvoiceRow v-for="i in paid" :key="i.id" :invoice="i" @open="openOne" /></div></div>
            </div>
          </template>

          <!-- PC -->
          <div v-else class="inv-grid">
            <section class="c-side">
              <div class="shell rise"><div class="inv-hero" data-test="hero">
                <div class="k">Belum dibayar</div>
                <div class="v">{{ rp(summary.unpaid) }}</div>
                <div class="hchips">
                  <span class="hchip">{{ summary.unpaidCount }} invoice</span>
                  <span v-if="summary.lateCount" class="hchip red">{{ summary.lateCount }} telat</span>
                  <span v-if="summary.nearestDue" class="hchip">Terdekat {{ fmtDM(summary.nearestDue) }}</span>
                </div>
              </div></div>
              <div class="inv-label rise" style="--i: 1">Udah masuk</div>
              <div class="shell rise" style="--i: 1"><div class="core inv-list" data-test="received">
                <div v-for="r in summary.received" :key="r.month" class="kvrow"><span>{{ monthName(r.month) }}</span><b>{{ rp(r.total) }}</b></div>
                <div class="kvrow sum"><span>Tahun {{ year }}</span><b>{{ rp(summary.receivedYear) }}</b></div>
              </div></div>
            </section>
            <section>
              <div class="inv-seg rise">
                <button v-for="[k, l] in FILTERS" :key="k" :class="{ on: filter === k }" :data-test="`seg-${k}`" @click="filter = k">{{ l }}</button>
              </div>
              <div class="shell rise" style="--i: 1"><div class="core inv-list">
                <div class="inv-thead"><span class="c0" /><span class="c1">Klien</span><span class="cols"><span>Perihal</span><span>Tanggal</span><span>Jatuh tempo</span></span><span class="e">Total</span></div>
                <InvoiceRow v-for="i in shown" :key="i.id" :invoice="i" @open="openOne" />
                <div v-if="!shown.length" class="inv-none">Kosong.</div>
              </div></div>
            </section>
          </div>
        </template>
      </div>

      <button v-if="!wide" slot="fixed" class="inv-fab" data-test="add" @click="goNew">
        Bikin <span class="ic"><PhPlus :size="19" weight="bold" /></span>
      </button>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { IonContent, IonPage, onIonViewWillEnter, useIonRouter } from '@ionic/vue'
import { PhGearSix, PhPlus } from '@phosphor-icons/vue'
import InvoiceRow from '@/components/InvoiceRow.vue'
import LaptopNote from '@/components/LaptopNote.vue'
import PageHeader from '@/components/PageHeader.vue'
import { fmtDM, monthName, rp } from '@/lib/invoice.js'
import { useMedia } from '@/lib/media.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { useInvoicesStore } from '@/stores/invoices.js'

const FILTERS = [['all', 'Semua'], ['open', 'Belum dibayar'], ['paid', 'Lunas']]
const BASE = '/tabs/menu/invoice'

const ionRouter = useIonRouter()
const store = useInvoicesStore()
const wide = useMedia('(min-width: 1100px)')
const filter = ref('all')
const error = ref('')

const EMPTY = { unpaid: 0, unpaidCount: 0, lateCount: 0, nearestDue: null, received: [], receivedYear: 0 }
const summary = computed(() => store.summary ?? EMPTY)
const year = computed(() => (store.today ?? '').slice(0, 4))

// Belum dibayar: jatuh tempo paling dekat dulu. Lunas: yang terbaru diterima dulu.
const open = computed(() => (store.list ?? []).filter((i) => !i.paidOn).sort((a, b) => a.dueOn.localeCompare(b.dueOn)))
const paid = computed(() => (store.list ?? []).filter((i) => i.paidOn).sort((a, b) => b.paidOn.localeCompare(a.paidOn)))
const shown = computed(() => (filter.value === 'open' ? open.value : filter.value === 'paid' ? paid.value : [...open.value, ...paid.value]))

async function load() {
  try {
    await store.load()
    error.value = ''
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}
onIonViewWillEnter(load)

const openOne = (inv) => ionRouter.push(`${BASE}/${inv.id}`)
const goNew = () => ionRouter.push(`${BASE}/baru`)
const goSettings = () => ionRouter.push(`${BASE}/atur`)
</script>

<style scoped>
.inv-page { padding-bottom: 96px; }
.inv-page:not(.wide) { max-width: 620px; }
.inv-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
.inv-head :deep(.page-head) { flex: 1; min-width: 0; }
.inv-head :deep(.h1) { font-variant-numeric: tabular-nums; }
.inv-gear { flex: none; width: 40px; height: 40px; margin-top: 2px; border: 0; border-radius: 99px; background: var(--soft); color: var(--text); display: grid; place-items: center; cursor: pointer; }
.inv-hbtns { display: flex; align-items: center; gap: 10px; flex-shrink: 0; align-self: flex-end; margin-bottom: 30px; }
.inv-ghost { height: 46px; padding: 0 16px; border: 0; border-radius: 99px; background: var(--soft); font: 700 14px var(--ion-font-family); color: var(--text); display: inline-flex; align-items: center; gap: 7px; cursor: pointer; white-space: nowrap; }
.inv-add { height: 46px; padding: 5px 5px 5px 18px; font-size: 14.5px; font-weight: 700; white-space: nowrap; }
.inv-add .ic { width: 36px; height: 36px; }
.inv-error { color: var(--red); font-size: 13px; font-weight: 600; margin: 0 6px 12px; }

.inv-minis { display: flex; gap: 6px; margin: -4px 0 12px; flex-wrap: wrap; }
.mini { height: 28px; padding: 0 11px; border-radius: 99px; background: var(--card); box-shadow: 0 0 0 1px var(--hair); font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; }
.mini.red { color: var(--red); background: rgba(240, 83, 61, .1); box-shadow: none; }

.inv-label { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 22px 8px 10px; }
.inv-label small { font-size: 12px; letter-spacing: .02em; text-transform: none; font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums; }
.inv-list { padding: 4px 6px; }
.inv-none { padding: 22px 14px; color: var(--muted); font-size: 13.5px; text-align: center; }
.inv-thead { display: none; }

.inv-empty { padding: 28px 22px; text-align: center; }
.inv-empty .big { font-size: 40px; }
.inv-empty b { display: block; font-size: 17px; margin-top: 8px; }
.inv-empty p { color: var(--muted); font-size: 13.5px; line-height: 1.5; margin: 6px 0 16px; }

.inv-fab { position: absolute; right: 18px; bottom: calc(92px + env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 10px; height: 52px; padding: 6px 6px 6px 20px;
  border: 0; border-radius: 99px; background: var(--ink); color: var(--on-ink); font: 700 15px var(--ion-font-family); box-shadow: 0 16px 34px -14px rgba(0, 0, 0, .5);
  cursor: pointer; transition: transform .45s var(--spring); }
.inv-fab:active { transform: scale(.96); }
.inv-fab .ic { width: 40px; height: 40px; border-radius: 99px; background: var(--lime); color: var(--lime-ink); display: grid; place-items: center; }
@media (min-width: 768px) { .inv-fab { bottom: 28px; right: 36px; } }

.inv-hero { position: relative; overflow: hidden; padding: 18px 20px; border-radius: 25px; background: #141410; color: #F3F2EE; }
.inv-hero::before { content: ''; position: absolute; right: -60px; top: -80px; width: 220px; height: 220px; border-radius: 99px; background: radial-gradient(circle, rgba(200, 240, 74, .28), transparent 65%); }
.inv-hero > * { position: relative; }
.inv-hero .k { font-size: 12.5px; font-weight: 600; color: rgba(243, 242, 238, .6); }
.inv-hero .v { font-size: 40px; font-weight: 800; letter-spacing: -0.045em; margin-top: 2px; color: var(--lime); font-variant-numeric: tabular-nums; line-height: 1.05; }
.hchips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
.hchip { display: inline-flex; align-items: center; height: 28px; padding: 0 11px; border-radius: 99px; background: rgba(255, 255, 255, .08); font-size: 12px; font-weight: 700; color: rgba(243, 242, 238, .85); }
.hchip.red { background: rgba(240, 83, 61, .2); color: #FF8A73; }
.kvrow { display: flex; justify-content: space-between; gap: 16px; padding: 12px 10px; font-size: 13.5px; font-variant-numeric: tabular-nums; }
.kvrow + .kvrow { box-shadow: inset 0 1px 0 var(--hair); }
.kvrow span { color: var(--muted); font-weight: 600; flex: none; }
.kvrow b { text-align: right; font-weight: 700; }
.kvrow.sum b { font-weight: 800; }

.inv-seg { display: flex; padding: 4px; border-radius: 99px; background: var(--soft); margin-bottom: 12px; max-width: 420px; }
.inv-seg button { flex: 1; height: 38px; padding: 0 14px; border: 0; border-radius: 99px; background: transparent; font: 700 13.5px var(--ion-font-family); color: var(--muted); cursor: pointer; }
.inv-seg button.on { background: var(--card); color: var(--text); box-shadow: 0 1px 2px rgba(0, 0, 0, .06), 0 6px 14px -6px rgba(0, 0, 0, .18); }

@media (min-width: 1100px) {
  .inv-grid { display: grid; grid-template-columns: 360px minmax(0, 1fr); gap: 24px; align-items: start; margin-top: 4px; }
  .inv-grid .c-side { position: sticky; top: 24px; }
  .inv-grid .inv-label:first-of-type { margin-top: 22px; }
}
@media (min-width: 1600px) {
  .inv-grid { grid-template-columns: 400px minmax(0, 1fr); }
  .inv-thead { display: flex; align-items: center; gap: 12px; padding: 10px 10px 4px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .14em; color: var(--muted); }
  .inv-thead .c0 { width: 40px; flex: none; }
  .inv-thead .c1 { flex: 1.1; min-width: 0; }
  .inv-thead .cols { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(90px, .6fr) minmax(130px, .8fr); gap: 16px; flex: 2; min-width: 0; }
  .inv-thead .e { min-width: 110px; text-align: right; flex: none; }
}
</style>
