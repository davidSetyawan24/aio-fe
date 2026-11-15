<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page br-page" :class="{ wide }">
        <div class="br-head">
          <PageHeader eyebrow="Bayar Rutin" back-to="/tabs/menu">{{ rp(summary.left) }}<br /><span>belum lunas {{ monthName }}</span></PageHeader>
          <button v-if="wide" class="pill br-add" data-test="pc-add" @click="openForm(null)">Tambah <span class="ic"><PhPlus :size="19" weight="bold" /></span></button>
        </div>

        <p v-if="error" class="br-error">{{ error }}</p>

        <template v-if="loaded">
          <div v-if="!store.bills.length" class="shell rise" style="--i: 2">
            <div class="core br-empty">
              <div class="big">🔁</div>
              <b>Belum ada bayar rutin.</b>
              <p>Catat yang nominalnya tetep tiap bulan/tahun — Netflix, cicilan, domain — biar ada pengingat & lo tau dana yang harus disiapin.</p>
              <button class="pill" @click="openForm(null)">Tambah <span class="ic"><PhPlus :size="17" weight="bold" /></span></button>
            </div>
          </div>

          <template v-else>
            <div v-if="!wide" class="br-seg rise" style="--i: 2">
              <button :class="{ on: tab === 'month' }" data-test="seg-month" @click="tab = 'month'">Per bulan</button>
              <button :class="{ on: tab === 'all' }" data-test="seg-all" @click="tab = 'all'">Semua</button>
            </div>

            <div class="br-grid">
              <!-- Kartu hitam: yang belum lunas bulan ini -->
              <section v-if="wide || tab === 'month'" class="a-hero">
                <div class="shell rise" style="--i: 2">
                  <div class="br-hero" data-test="hero">
                    <div class="mnav">
                      <button data-test="prev" aria-label="Bulan sebelumnya" :disabled="atFirst" @click="shift(-1)"><PhCaretLeft :size="15" weight="bold" /></button>
                      <b>{{ monthLabel(store.month) }}</b>
                      <button data-test="next" aria-label="Bulan berikutnya" @click="shift(1)"><PhCaretRight :size="15" weight="bold" /></button>
                    </div>
                    <template v-if="summary.left">
                      <div class="k">Belum lunas</div>
                      <div class="v">{{ rp(summary.left) }}</div>
                    </template>
                    <template v-else>
                      <div class="k">{{ summary.count ? 'Bulan ini' : 'Nggak ada jadwal' }}</div>
                      <div class="v ok">{{ summary.count ? 'Semua lunas 🎉' : 'Kosong 🌿' }}</div>
                    </template>
                    <div class="hbar"><i :style="{ width: `${summary.total ? (summary.paid / summary.total) * 100 : 0}%` }" /></div>
                    <div class="hchips">
                      <span class="hchip">Total {{ rp(summary.total) }}</span>
                      <span class="hchip">Lunas {{ summary.paidCount }}/{{ summary.count }}</span>
                      <span v-if="summary.lateCount" class="hchip red"><i />{{ summary.lateCount }} telat</span>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Daftar bulan itu: Telat → Belum lunas → Lunas -->
              <section v-if="wide || tab === 'month'" class="a-list">
                <div v-if="!store.rows.length" class="shell rise" style="--i: 3"><div class="core br-none">Nggak ada bayar rutin di bulan ini.</div></div>
                <template v-for="(sec, i) in sections" :key="sec.key">
                  <div v-if="sec.rows.length" :data-test="`sec-${sec.key}`">
                    <div class="br-label rise" :class="{ red: sec.key === 'late' }" :style="{ '--i': 3 + i }">{{ sec.label }} <small>{{ rp(sum(sec.rows)) }}</small></div>
                    <div class="shell rise" :style="{ '--i': 3 + i }">
                      <div class="core br-list">
                        <div class="br-thead"><span class="c1" /><span class="c2" /><span class="nm">Nama</span>
                          <span class="cols"><span>Jatuh tempo</span><span>Dibayar dari</span><span>Jadwal</span></span><span class="e">Nominal</span></div>
                        <BayarRutinRow v-for="r in sec.rows" :key="`${r.billId}:${r.period}`" :row="r" :source-name="sourceName(r.sourceId)" @tick="tick" @edit="openForm" />
                      </div>
                    </div>
                  </div>
                </template>
              </section>

              <!-- Siapin dana: yang belum lunas per rekening -->
              <section v-if="wide || tab === 'month'" class="a-prep" data-test="prep">
                <div class="br-label rise" style="--i: 6">Siapin dana <small v-if="store.bySource.length" class="muted">yang belum lunas</small></div>
                <div class="shell rise" style="--i: 6">
                  <div class="core br-list">
                    <div v-for="s in store.bySource" :key="s.sourceId" class="br-acc">
                      <span class="ic" :style="{ background: badge(s.sourceId).tint }">{{ badge(s.sourceId).text }}</span>
                      <span class="grow"><b>{{ sourceName(s.sourceId) }}</b><small>{{ s.count }} bayar rutin</small></span>
                      <span class="amt">{{ rp(s.total) }}</span>
                    </div>
                    <div v-if="!store.bySource.length" class="br-none">Nggak ada yang perlu disiapin. Aman 🎉</div>
                  </div>
                </div>
              </section>

              <!-- Semua: daftar master -->
              <section v-if="wide || tab === 'all'" class="a-all" data-test="all">
                <template v-for="(grp, i) in groups" :key="grp.key">
                  <div v-if="grp.items.length">
                    <div class="br-label rise" :style="{ '--i': 2 + i }">{{ grp.label }} <small>{{ grp.items.length }}</small></div>
                    <div class="shell rise" :style="{ '--i': 2 + i }">
                      <div class="core br-list">
                        <button v-for="b in grp.items" :key="b.id" class="br-master" data-test="master" @click="openForm(b.id)">
                          <span class="br-av" :style="{ background: b.tint }">{{ b.emoji }}</span>
                          <span class="grow">
                            <b>{{ b.name }}</b>
                            <small>{{ scheduleText(b) }} · {{ b.source.name }}</small>
                            <small v-if="b.reminders.length"><PhBell :size="12" /> {{ sortReminders(b.reminders).map(reminderLabel).join(', ') }}</small>
                          </span>
                          <span class="amt">{{ rp(b.amount) }}</span>
                          <PhCaretRight :size="16" class="go" />
                        </button>
                        <div class="br-sum"><span>{{ grp.sumLabel }}</span><b>{{ rp(sum(grp.items)) }}</b></div>
                      </div>
                    </div>
                  </div>
                </template>
              </section>
            </div>
          </template>
        </template>
      </div>

      <button v-if="!wide" slot="fixed" class="br-fab" data-test="add" @click="openForm(null)">
        Tambah <span class="ic"><PhPlus :size="19" weight="bold" /></span>
      </button>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { IonContent, IonPage, onIonViewWillEnter, toastController, useIonRouter } from '@ionic/vue'
import { PhBell, PhCaretLeft, PhCaretRight, PhPlus } from '@phosphor-icons/vue'
import BayarRutinRow from '@/components/BayarRutinRow.vue'
import PageHeader from '@/components/PageHeader.vue'
import { addMonth, monthLabel, reminderLabel, scheduleText, sortReminders } from '@/lib/bayarRutin.js'
import { useMedia } from '@/lib/media.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { bankLook, rp } from '@/lib/wallet.js'
import { useBayarRutinStore } from '@/stores/bayarRutin.js'

const ionRouter = useIonRouter()
const store = useBayarRutinStore()
const wide = useMedia('(min-width: 1100px)')
const tab = ref('month')
const error = ref('')
const loaded = computed(() => store.month !== null)
const EMPTY = { total: 0, paid: 0, left: 0, count: 0, paidCount: 0, lateCount: 0 }
const summary = computed(() => store.summary ?? EMPTY)
const monthName = computed(() => (store.month ? monthLabel(store.month).split(' ')[0] : 'bulan ini'))
const atFirst = computed(() => !store.month || store.month <= store.firstMonth)

const sum = (list) => list.reduce((s, x) => s + x.amount, 0)
const sections = computed(() => [
  { key: 'late', label: 'Telat', rows: store.rows.filter((r) => r.status === 'late') },
  { key: 'open', label: 'Belum lunas', rows: store.rows.filter((r) => r.status === 'open') },
  { key: 'paid', label: 'Lunas', rows: store.rows.filter((r) => r.status === 'paid') },
])
const groups = computed(() => [
  { key: 'monthly', label: 'Bulanan', sumLabel: 'Sebulan', items: store.bills.filter((b) => b.freq === 'monthly') },
  { key: 'yearly', label: 'Tahunan', sumLabel: 'Setahun', items: store.bills.filter((b) => b.freq === 'yearly') },
])

const sourceOf = (id) => store.bills.find((b) => b.source.id === id)?.source
const sourceName = (id) => sourceOf(id)?.name ?? 'Rekening'
const badge = (id) => {
  const s = sourceOf(id)
  return s?.kind === 'cash' ? { tint: '#E4F7C4', text: '💵' } : { tint: bankLook(s?.bank).tint, text: bankLook(s?.bank).short }
}

async function load(month) {
  try {
    await store.load(month)
    error.value = ''
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}
onIonViewWillEnter(() => load(store.month ?? undefined))
const shift = (n) => load(addMonth(store.month, n))

const toast = async (message) => (await toastController.create({ message, duration: 2000, position: 'top', cssClass: 'aio-toast' })).present()
async function tick(row) {
  const willPay = row.status !== 'paid'
  try {
    await store.togglePaid(row)
    await toast(willPay ? `${row.name} lunas ✓` : `${row.name} batal lunas`)
  } catch (err) {
    await toast(apiErrorMessage(err))
  }
}

function openForm(id) {
  ionRouter.push(id ? `/tabs/menu/bayar-rutin/${id}/ubah` : '/tabs/menu/bayar-rutin/baru')
}
</script>

<style scoped>
.br-page { padding-bottom: 96px; }
.br-page:not(.wide) { max-width: 620px; }
.br-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; }
.br-head :deep(.page-head) { flex: 1; min-width: 0; }
.br-head :deep(.h1) { font-variant-numeric: tabular-nums; }
.br-add { flex-shrink: 0; height: 52px; padding: 6px 6px 6px 20px; font-size: 15px; font-weight: 700; margin-bottom: 30px; }
.br-add .ic { width: 40px; height: 40px; }
.br-error { color: var(--red); font-size: 13px; font-weight: 600; margin: 0 6px 12px; }

.br-seg { display: flex; padding: 4px; border-radius: 99px; background: var(--soft); margin-bottom: 16px; }
.br-seg button { flex: 1; height: 38px; border: 0; border-radius: 99px; background: transparent; font: 700 13.5px var(--ion-font-family); color: var(--muted); cursor: pointer; }
.br-seg button.on { background: var(--card); color: var(--text); box-shadow: 0 1px 2px rgba(0, 0, 0, .06), 0 6px 14px -6px rgba(0, 0, 0, .18); }

.br-hero { position: relative; overflow: hidden; padding: 18px 20px; border-radius: 25px; background: #141410; color: #F3F2EE; }
.br-hero::before { content: ''; position: absolute; right: -60px; top: -80px; width: 220px; height: 220px; border-radius: 99px; background: radial-gradient(circle, rgba(200, 240, 74, .28), transparent 65%); }
.br-hero > * { position: relative; }
.mnav { display: flex; align-items: center; justify-content: space-between; }
.mnav b { font-size: 15px; font-weight: 800; }
.mnav button { width: 34px; height: 34px; border: 0; border-radius: 99px; background: rgba(255, 255, 255, .08); color: #F3F2EE; display: grid; place-items: center; cursor: pointer; }
.mnav button:disabled { opacity: .3; cursor: default; }
.br-hero .k { font-size: 12.5px; font-weight: 600; color: rgba(243, 242, 238, .6); margin-top: 14px; }
.br-hero .v { font-size: 44px; font-weight: 800; letter-spacing: -0.045em; margin-top: 2px; color: var(--lime); font-variant-numeric: tabular-nums; line-height: 1.05; }
.br-hero .v.ok { font-size: 30px; }
.hbar { height: 6px; border-radius: 99px; background: rgba(255, 255, 255, .12); margin-top: 14px; overflow: hidden; }
.hbar i { display: block; height: 100%; border-radius: 99px; background: #F3F2EE; transition: width .6s var(--spring); }
.hchips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.hchip { display: inline-flex; align-items: center; gap: 5px; height: 28px; padding: 0 11px; border-radius: 99px; background: rgba(255, 255, 255, .08); font-size: 12px; font-weight: 700;
  color: rgba(243, 242, 238, .85); font-variant-numeric: tabular-nums; }
.hchip.red { background: rgba(240, 83, 61, .2); color: #FF8A73; }
.hchip.red i { width: 6px; height: 6px; border-radius: 9px; background: currentColor; }

.br-label { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 24px 8px 10px; }
.br-label small { font-size: 12px; letter-spacing: .02em; text-transform: none; font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums; }
.br-label small.muted { color: var(--muted); }
.br-label.red, .br-label.red small { color: var(--red); }
.br-list { padding: 4px 6px; }
.br-thead { display: none; }
.br-none { padding: 18px 14px; color: var(--muted); font-size: 13.5px; text-align: center; }
.core.br-none { padding: 18px 14px; }

.br-acc { display: flex; align-items: center; gap: 12px; padding: 12px 10px; }
.br-acc + .br-acc { box-shadow: inset 0 1px 0 var(--hair); }
.br-acc .ic { width: 40px; height: 40px; border-radius: 14px; display: grid; place-items: center; font-size: 12px; font-weight: 800; flex-shrink: 0; color: #141410; }
.br-acc b, .br-master b { display: block; font-size: 14.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.br-acc small, .br-master small { display: block; font-size: 12px; color: var(--muted); font-weight: 600; margin-top: 2px; }
.br-acc .amt, .br-master .amt { font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums; flex-shrink: 0; }

.br-master { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 10px; border: 0; background: transparent; color: var(--text); font: inherit; text-align: left; cursor: pointer; }
.br-master + .br-master { box-shadow: inset 0 1px 0 var(--hair); }
.br-master:active { background: var(--soft); }
.br-master small svg { vertical-align: -1px; }
.br-master .go { color: var(--muted); flex-shrink: 0; }
.br-av { width: 40px; height: 40px; border-radius: 14px; display: grid; place-items: center; font-size: 19px; flex-shrink: 0; }
.br-sum { display: flex; justify-content: space-between; padding: 12px 14px; font-size: 13px; color: var(--muted); font-weight: 600; box-shadow: inset 0 1px 0 var(--hair); }
.br-sum b { color: var(--text); font-variant-numeric: tabular-nums; }

.br-empty { padding: 28px 22px; text-align: center; }
.br-empty .big { font-size: 40px; }
.br-empty b { display: block; font-size: 17px; margin-top: 8px; }
.br-empty p { color: var(--muted); font-size: 13.5px; line-height: 1.5; margin: 6px 0 16px; }

.br-fab { position: absolute; right: 18px; bottom: calc(92px + env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 10px; height: 52px; padding: 6px 6px 6px 20px;
  border: 0; border-radius: 99px; background: var(--ink); color: var(--on-ink); font: 700 15px var(--ion-font-family); box-shadow: 0 16px 34px -14px rgba(0, 0, 0, .5);
  cursor: pointer; transition: transform .45s var(--spring); }
.br-fab:active { transform: scale(.96); }
.br-fab .ic { width: 40px; height: 40px; border-radius: 99px; background: var(--lime); color: var(--lime-ink); display: grid; place-items: center; }
@media (min-width: 768px) { .br-fab { bottom: 28px; right: 36px; } }

/* HP / iPad: Kartu hitam → daftar → Siapin dana */
.a-list > div:first-child .br-label { margin-top: 20px; }

/* PC 1100–1599: kiri (kartu hitam, siapin dana, semua) | kanan daftar bulan itu */
@media (min-width: 1100px) {
  .br-grid { display: grid; grid-template-columns: 360px minmax(0, 1fr); grid-template-areas: 'hero list' 'prep list' 'all list'; grid-template-rows: auto auto 1fr; gap: 0 24px; align-items: start; }
  .a-hero { grid-area: hero; } .a-list { grid-area: list; } .a-prep { grid-area: prep; } .a-all { grid-area: all; }
  .a-list > div:first-child .br-label, .a-list > .shell:first-child { margin-top: 0; }
  .a-prep .br-label:first-child { margin-top: 24px; }
  .br-hero .v { font-size: 52px; }
}
/* ≥1600: 3 kolom — kiri (kartu hitam + siapin dana) | tengah daftar | kanan semua */
@media (min-width: 1600px) {
  .br-grid { grid-template-columns: 380px minmax(0, 1fr) minmax(360px, 440px); grid-template-areas: 'hero list all' 'prep list all'; grid-template-rows: auto 1fr; }
  .a-all > div:first-child .br-label { margin-top: 0; }
}
/* ≥2200 (monitor lebar): header tabel di atas tiap daftar */
@media (min-width: 2200px) {
  .br-thead { display: flex; gap: 16px; padding: 10px 14px 4px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .14em; color: var(--muted); }
  .br-thead .c1 { width: 26px; flex-shrink: 0; } .br-thead .c2 { width: 40px; flex-shrink: 0; }
  .br-thead .nm { flex: 1; min-width: 0; }
  .br-thead .cols { display: grid; grid-template-columns: minmax(90px, .6fr) minmax(170px, 1fr) minmax(90px, .6fr); gap: 16px; flex: 1.6; min-width: 0; }
  .br-thead .e { min-width: 230px; text-align: right; }
}
@media (hover: hover) { .br-master:hover b { text-decoration: underline; } }
</style>
