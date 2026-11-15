<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page" :class="wide ? 'canvas' : 'narrow'">
        <PageHeader eyebrow="Split bill" back-to="/tabs/menu"><b class="total">{{ rp(s?.outstanding ?? 0) }}</b><br v-if="!wide" /><span :class="{ inline: wide }">masih di temen-temen</span></PageHeader>

        <p v-if="error" class="error">{{ error }}</p>

        <div :class="{ cols: wide }">
          <div class="list-col">
            <div class="shell rise" style="--i: 2">
              <div class="hero" data-test="hero">
                <div class="k">{{ s?.outstanding ? 'Belum balik ke lo' : 'Semua udah lunas' }}</div>
                <div class="v" data-test="owed">{{ s?.outstanding ? rp(s.outstanding) : 'Aman 🎉' }}</div>
                <div class="facts">
                  <span class="fact"><b>{{ s?.unpaidPeople.length ?? 0 }}</b> orang belum bayar</span>
                  <span class="fact">dari <b>{{ s?.waitingCount ?? 0 }}</b> split bill</span>
                </div>
                <div v-if="s?.unpaidPeople.length" class="faces">
                  <span v-for="(name, i) in s.unpaidPeople.slice(0, 8)" :key="name" class="pa" :style="{ background: tintOf(i + 1) }">{{ initial(name) }}</span>
                </div>
              </div>
            </div>

            <button v-if="wide" class="new-pc rise" style="--i: 3" data-test="new-pc" @click="startNew">
              <span class="ic"><PhPlus :size="20" weight="bold" /></span>
              <span class="grow"><b>Split bill baru</b><span>masukin orang → foto struk → bagi item</span></span>
              <PhCaretRight :size="18" />
            </button>

            <template v-if="s?.bills.length">
              <div class="label rise" style="--i: 3">Split bill <small>{{ s.bills.length }} kali</small></div>
              <div class="shell rise" style="--i: 3">
                <div class="core bills">
                  <button v-for="b in s.bills" :key="b.id" class="bill" :class="{ picked: wide && selected === b.id }" data-test="bill" @click="open(b)">
                    <span class="ic">{{ b.emoji }}</span>
                    <span class="grow">
                      <b>{{ b.place }}</b>
                      <span class="sub">{{ shortDate(b.spentOn) }} · {{ b.peopleCount }} orang · total {{ rp(b.total) }}</span>
                      <span v-if="b.outstanding" class="chip wait">{{ b.unpaidCount }} dari {{ b.othersCount }} belum bayar</span>
                      <span v-else class="chip done"><PhCheck :size="12" weight="bold" /> lunas semua</span>
                    </span>
                    <span class="amt">{{ b.outstanding ? rp(b.outstanding) : '' }}</span>
                  </button>
                </div>
              </div>
            </template>
            <div v-else-if="s" class="shell rise empty-wrap" style="--i: 3">
              <div class="core empty" data-test="empty">Belum ada split bill. Abis makan bareng, {{ wide ? 'tap "Split bill baru"' : 'tap "Split baru"' }} terus foto struknya 🍕</div>
            </div>
            <p class="hint">Struk cuma dibaca, nggak disimpen. Split bill ini nggak otomatis masuk Duit — catet sendiri bagian lo ya.</p>
          </div>

          <aside v-if="wide" class="panel" data-test="panel">
            <div class="shell">
              <div class="core panel-core">
                <SplitBillWizard v-if="panel === 'new' || panel === 'edit'" :key="`${panel}-${selected ?? ''}`" :bill="panel === 'edit' ? store.byId(selected) : null" wide @saved="onPanelSaved" />
                <SplitBillDetail v-else-if="selected && store.byId(selected)" :bill-id="selected" wide @edit="panel = 'edit'" @deleted="selected = null" />
                <div v-else class="empty-panel">
                  <div><div class="em">🍕</div><b>Abis makan bareng?</b>Bikin split bill baru, atau pilih yang di kiri buat liat siapa yang belum bayar.</div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <button v-if="!wide" slot="fixed" class="fab" data-test="add" @click="startNew">Split baru <span class="ic"><PhPlus :size="19" weight="bold" /></span></button>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { IonContent, IonPage, onIonViewWillEnter, useIonRouter } from '@ionic/vue'
import { PhCaretRight, PhCheck, PhPlus } from '@phosphor-icons/vue'
import PageHeader from '@/components/PageHeader.vue'
import SplitBillDetail from '@/components/SplitBillDetail.vue'
import SplitBillWizard from '@/components/SplitBillWizard.vue'
import { shortDate } from '@/lib/budget.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { initial, tintOf } from '@/lib/splitBill.js'
import { rp } from '@/lib/wallet.js'
import { useSplitBillsStore } from '@/stores/splitBills.js'

const ionRouter = useIonRouter()
const store = useSplitBillsStore()
const error = ref('')
const selected = ref(null)
/** Panel kanan (layar lebar): 'detail' | 'new' | 'edit'. */
const panel = ref('detail')

/* iPad landscape / Mac: tampilan full — daftar kiri, detail di panel kanan. */
const query = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(min-width: 1100px)') : null
const wide = ref(Boolean(query?.matches))
const onMedia = (e) => (wide.value = e.matches)
query?.addEventListener?.('change', onMedia)
onBeforeUnmount(() => query?.removeEventListener?.('change', onMedia))

const s = computed(() => store.summary)

async function refresh() {
  try {
    await store.load()
    error.value = ''
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}
onIonViewWillEnter(() => {
  refresh()
  if (selected.value) store.loadOne(selected.value).catch(() => {})
})
function onVisible() {
  if (document.visibilityState === 'visible') refresh()
}
document.addEventListener('visibilitychange', onVisible)
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))

async function open(b) {
  if (!wide.value) return ionRouter.push(`/tabs/menu/split-bill/${b.id}`)
  try {
    await store.loadOne(b.id)
    selected.value = b.id
    panel.value = 'detail'
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}

function startNew() {
  if (!wide.value) return ionRouter.push('/tabs/menu/split-bill/baru')
  panel.value = 'new'
}

function onPanelSaved(bill) {
  if (!store.byId(bill.id)) store.keep(bill)
  selected.value = bill.id
  panel.value = 'detail'
}
</script>

<style scoped>
.narrow { max-width: 620px; padding-bottom: 110px; }
.canvas { max-width: none; padding: 40px 48px 60px; }
.total { color: var(--text); font-weight: 800; }
.inline { margin-left: .25em; }
.error { color: var(--red); font-size: 13px; font-weight: 600; margin: 0 6px 12px; }
.cols { display: grid; grid-template-columns: minmax(340px, 4fr) minmax(0, 7fr); gap: 28px; align-items: start; }
.panel { position: sticky; top: 24px; }
.panel-core { padding: 26px 28px 28px; min-height: 520px; }
.empty-panel { display: grid; place-items: center; text-align: center; min-height: 460px; color: var(--muted); font-size: 14px; line-height: 1.5; }
.empty-panel .em { font-size: 54px; }
.empty-panel b { display: block; color: var(--text); font-size: 20px; margin: 10px 0 4px; }

.hero { position: relative; overflow: hidden; padding: 20px 20px 18px; border-radius: 25px; background: #141410; color: #F3F2EE; }
.hero::before { content: ''; position: absolute; right: -60px; top: -80px; width: 220px; height: 220px; border-radius: 99px; background: radial-gradient(circle, rgba(200, 240, 74, .28), transparent 65%); }
.hero > * { position: relative; }
.k { font-size: 12.5px; font-weight: 600; color: rgba(243, 242, 238, .6); }
.v { font-size: 44px; font-weight: 800; letter-spacing: -0.045em; margin-top: 2px; color: var(--lime); font-variant-numeric: tabular-nums; }
.facts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.fact { padding: 5px 10px; border-radius: 99px; background: rgba(243, 242, 238, .08); font-size: 11.5px; font-weight: 600; color: rgba(243, 242, 238, .7); }
.fact b { color: #F3F2EE; }
.faces { display: flex; margin-top: 14px; }
.pa { width: 30px; height: 30px; border-radius: 99px; display: inline-grid; place-items: center; font-size: 12px; font-weight: 800; color: #141410; margin-left: -8px; box-shadow: 0 0 0 3px #141410; }
.pa:first-child { margin-left: 0; }

.label { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 26px 8px 10px; }
.label small { font-size: 12px; letter-spacing: .02em; text-transform: none; color: var(--text); font-weight: 700; }
.bills { padding: 6px; }
.bill { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 10px; border: 0; border-radius: 18px; background: transparent; color: var(--text); font: inherit; text-align: left; cursor: pointer; }
.bill + .bill { box-shadow: inset 0 1px 0 var(--hair); border-radius: 0; }
.bill:active, .bill.picked { background: var(--soft); border-radius: 18px; }
.bill .ic { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; font-size: 21px; flex-shrink: 0; background: #FFE9D6; }
.bill .grow { flex: 1; min-width: 0; }
.bill b { display: block; font-size: 15px; font-weight: 600; }
.bill .sub { display: block; font-size: 12.5px; color: var(--muted); margin-top: 2px; }
.bill .amt { text-align: right; font-weight: 800; font-size: 15px; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 700; margin-top: 4px; }
.chip.wait { background: rgba(245, 165, 36, .14); color: #C27C00; }
.chip.done { background: rgba(43, 168, 100, .12); color: var(--green); }
.empty-wrap { margin-top: 24px; }
.empty { padding: 18px; color: var(--muted); font-size: 13.5px; line-height: 1.5; }
.hint { color: var(--muted); font-size: 12.5px; margin: 10px 8px 0; line-height: 1.45; }

.new-pc { display: flex; width: 100%; align-items: center; gap: 12px; margin-top: 12px; padding: 12px 16px 12px 12px; border: 1.5px dashed var(--muted); border-radius: 22px; background: transparent;
  color: var(--text); font: inherit; text-align: left; cursor: pointer; }
.new-pc .ic { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; background: var(--lime); color: var(--lime-ink); flex-shrink: 0; }
.new-pc .grow { flex: 1; }
.new-pc b { display: block; font-size: 15px; }
.new-pc .grow span { display: block; font-size: 12.5px; color: var(--muted); }

.fab { position: absolute; right: 18px; bottom: calc(92px + env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 10px; height: 52px; padding: 6px 6px 6px 20px;
  border: 0; border-radius: 99px; background: var(--ink); color: var(--on-ink); font: 700 15px var(--ion-font-family); box-shadow: 0 16px 34px -14px rgba(0, 0, 0, .5); cursor: pointer;
  transition: transform .45s var(--spring); }
.fab:active { transform: scale(.96); }
.fab .ic { width: 40px; height: 40px; border-radius: 99px; background: var(--lime); color: var(--lime-ink); display: grid; place-items: center; }
@media (min-width: 768px) { .fab { bottom: 28px; right: 36px; } }
</style>
