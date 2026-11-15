<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div v-if="!wide" class="page narrow" data-test="phone">
        <PageHeader eyebrow="Kartu & Rekening" back-to="/tabs/menu">Dompet lo.<br /><span>{{ subtitle }}</span></PageHeader>

        <p v-if="error" class="error">{{ error }}</p>

        <template v-if="wallet.loaded">
          <div class="stats rise" style="--i: 2">
            <div class="stat"><b>{{ totals.debit }}</b><span>Tabungan</span></div>
            <div class="stat"><b>{{ totals.cc }}</b><span>Kartu kredit</span></div>
            <div class="stat"><b>{{ rpShort(totals.totalLimit) }}</b><span>Total limit CC</span></div>
          </div>

          <div class="group-label rise" style="--i: 3">⭐ Sering dipake <small>muncul duluan pas nyatet</small></div>
          <div class="favs rise" style="--i: 3">
            <span v-for="s in favorites" :key="s.id" class="fav" data-test="fav">
              <span class="b" :style="{ background: s.kind === 'cash' ? '#E4F7C4' : bankLook(s.bank).tint }">{{ s.kind === 'cash' ? '💵' : bankLook(s.bank).short }}</span>{{ s.name }}
            </span>
            <span v-if="!favorites.length" class="fav empty">Belum ada. Tap ☆ buat nandain.</span>
          </div>

          <template v-if="groups.cash">
            <div class="group-label rise" style="--i: 4">Cash</div>
            <div class="shell rise" style="--i: 4">
              <div class="core list">
                <div class="item" data-test="cash">
                  <span class="ico" style="background: #E4F7C4">💵</span>
                  <span class="grow"><span class="title">Cash</span><span class="sub">Duit tunai · udah ada dari awal</span></span>
                  <StarButton :source="groups.cash" @toggle="star" />
                </div>
              </div>
            </div>
          </template>

          <div class="group-label rise" style="--i: 5">Per bank <small>{{ groups.banks.length }} bank</small></div>
          <div v-if="!groups.banks.length" class="shell rise" style="--i: 5">
            <div class="core empty">Belum ada tabungan atau kartu kredit. Tap <b>Tambah</b> di kanan bawah.</div>
          </div>
          <div v-for="(g, gi) in groups.banks" :key="g.bank" class="shell bank rise" :style="{ '--i': 5 + gi }" data-test="bank">
            <div class="core">
              <div class="bank-head">
                <span class="bank-logo" :style="{ background: bankLook(g.bank).tint }">{{ bankLook(g.bank).short }}</span>
                <span class="bank-name">{{ g.bank }}</span>
                <span class="bank-count">{{ countLabel(g) }}</span>
              </div>
              <button v-for="s in g.debit" :key="s.id" class="item" data-test="source" @click="edit(s)">
                <span class="ico"><PhBank :size="19" /></span>
                <span class="grow">
                  <span class="title">{{ s.name }}</span>
                  <span class="sub">Tabungan<template v-if="s.expMonth"> · kartu exp {{ formatExpiry(s.expMonth, s.expYear) }}</template></span>
                </span>
                <StarButton :source="s" @toggle="star" />
              </button>
              <div v-if="g.debit.length && g.cc.length" class="sep" />
              <button v-for="s in g.cc" :key="s.id" class="item" data-test="source" @click="edit(s)">
                <span class="cc" :style="{ background: bankLook(s.bank).grad }"><i /><small>{{ formatExpiry(s.expMonth, s.expYear) }}</small></span>
                <span class="grow">
                  <span class="title">{{ s.name }}</span>
                  <span class="sub">Limit {{ rpShort(s.creditLimit ?? 0) }}</span>
                  <span class="chips">
                    <span class="chip">cetak tgl {{ s.statementDay }}</span>
                    <span class="chip" :class="{ amber: dueIn(s) <= 3 }">jatuh tempo tgl {{ s.dueDay }}<template v-if="dueIn(s) <= 3"> · {{ dueIn(s) ? `${dueIn(s)} hari lagi` : 'hari ini' }}</template></span>
                  </span>
                </span>
                <StarButton :source="s" @toggle="star" />
              </button>
            </div>
          </div>
        </template>
      </div>

      <!-- PC / iPad landscape: full selebar layar, CC jadi kartu gede, form muncul sebagai panel kanan (HP di atas nggak berubah). -->
      <div v-if="wide" class="page pc" data-test="pc">
        <div class="pc-head">
          <PageHeader eyebrow="Kartu & Rekening" back-to="/tabs/menu">Dompet lo. <span>{{ subtitle }}</span></PageHeader>
          <button class="pill pc-add" data-test="pc-add" @click="openPanel(null)">Tambah <span class="ic"><PhPlus :size="19" weight="bold" /></span></button>
        </div>
        <p v-if="error" class="error">{{ error }}</p>

        <template v-if="wallet.loaded">
          <div class="shell rise" style="--i: 2">
            <div class="sum" data-test="sum">
              <div><div class="k">Total limit kartu kredit</div><div class="v lime">{{ rpShort(totals.totalLimit) }}</div><div class="f">dari {{ totals.cc }} kartu kredit</div></div>
              <div><div class="k">Tabungan</div><div class="v">{{ totals.debit }}</div><div class="f">+ Cash</div></div>
              <div><div class="k">Kartu kredit</div><div class="v">{{ totals.cc }}</div><div class="f">{{ ccBankCount }} bank</div></div>
              <div><div class="k">Jatuh tempo ≤ 3 hari</div><div class="v">{{ dueSoon.length }}</div><div class="f">{{ dueSoon.map((c) => c.name).join(', ') || 'aman semua' }}</div></div>
            </div>
          </div>

          <div class="pc-label rise" style="--i: 3">⭐ Sering dipake <small>muncul duluan pas nyatet</small></div>
          <div class="pc-favs rise" style="--i: 3">
            <span v-for="s in favorites" :key="s.id" class="fav">
              <span class="b" :style="{ background: s.kind === 'cash' ? '#E4F7C4' : bankLook(s.bank).tint }">{{ s.kind === 'cash' ? '💵' : bankLook(s.bank).short }}</span>{{ s.name }}
            </span>
            <span v-if="!favorites.length" class="fav empty">Belum ada. Klik ☆ buat nandain.</span>
          </div>

          <div class="pc-cols">
            <section class="rise" style="--i: 4">
              <div class="pc-label">Cash & tabungan <small>{{ savingsCount }}</small></div>
              <div class="shell">
                <div class="core pc-list">
                  <div v-if="groups.cash" class="item" data-test="saving">
                    <span class="ico" style="background: #E4F7C4">💵</span>
                    <span class="grow"><span class="title">Cash</span><span class="sub">Duit tunai · udah ada dari awal</span></span>
                    <StarButton :source="groups.cash" @toggle="star" />
                  </div>
                  <template v-for="g in groups.banks" :key="g.bank">
                    <template v-if="g.debit.length">
                      <div class="pc-group"><span class="bank-logo sm" :style="{ background: bankLook(g.bank).tint }">{{ bankLook(g.bank).short }}</span>{{ g.bank }}</div>
                      <button v-for="s in g.debit" :key="s.id" class="item" data-test="saving" @click="openPanel(s.id)">
                        <span class="ico"><PhBank :size="19" /></span>
                        <span class="grow">
                          <span class="title">{{ s.name }}</span>
                          <span class="sub">Tabungan<template v-if="s.expMonth"> · kartu exp {{ formatExpiry(s.expMonth, s.expYear) }}</template></span>
                        </span>
                        <StarButton :source="s" @toggle="star" />
                      </button>
                    </template>
                  </template>
                </div>
              </div>
            </section>

            <section class="rise" style="--i: 5">
              <div class="pc-label">Kartu kredit <small>{{ totals.cc }} kartu · limit {{ rpShort(totals.totalLimit) }}</small></div>
              <div class="shell">
                <div class="core cards">
                  <div v-for="c in creditCards" :key="c.id" class="bigcc" :style="{ background: bankLook(c.bank).grad }" role="button" tabindex="0" data-test="bigcc"
                    @click="openPanel(c.id)" @keydown.enter="openPanel(c.id)">
                    <div class="bn">{{ c.bank }}</div>
                    <div class="nm">{{ c.name }}</div>
                    <span class="chipx" />
                    <StarButton :source="c" class="cc-star" @toggle="star" />
                    <div class="lim"><small>Limit</small>{{ rpShort(c.creditLimit ?? 0) }}</div>
                    <span v-if="c.expMonth" class="exp">EXP {{ formatExpiry(c.expMonth, c.expYear) }}</span>
                    <div class="meta">
                      <span class="m">cetak tgl {{ c.statementDay }}</span>
                      <span class="m" :class="{ warn: dueIn(c) <= 3 }">jatuh tempo tgl {{ c.dueDay }}<template v-if="dueIn(c) <= 3"> · {{ dueIn(c) ? `${dueIn(c)} hari lagi` : 'hari ini' }}</template></span>
                    </div>
                  </div>
                  <p v-if="!creditCards.length" class="empty">Belum ada kartu kredit. Klik <b>Tambah</b> di kanan atas.</p>
                </div>
              </div>
            </section>
          </div>
        </template>
      </div>

      <!-- Ke dalem ion-app (bukan body): ion-app bikin tumpukan z-index sendiri, popup Ionic (konfirmasi Hapus) dipasang di situ.
           Kalau panel di body, konfirmasinya ketutup scrim panel & nggak bisa dipencet. -->
      <Teleport to="ion-app">
        <div v-if="wide" class="wallet-scrim" :class="{ show: panelOpen }" @click="closePanel" />
        <aside v-if="wide" class="wallet-panel" :class="{ show: panelOpen }" data-test="panel" role="dialog" aria-modal="true" :aria-hidden="String(!panelOpen)">
          <div class="panel-head">
            <span class="eyebrow"><span class="dot" />Kartu & Rekening</span>
            <button class="x" aria-label="Tutup" @click="closePanel"><PhX :size="18" weight="bold" /></button>
          </div>
          <h2 class="panel-h1">
            <template v-if="panelId"><b>{{ panelSource?.name ?? 'Kartu/rekening' }}</b>.<br /><span>Ubah detail</span></template>
            <template v-else>Tambah baru.<br /><span>Tabungan atau kartu kredit</span></template>
          </h2>
          <WalletForm v-if="panelOpen" :key="panelKey" :source-id="panelId" @done="onPanelDone" />
        </aside>
      </Teleport>

      <button v-if="!wide" slot="fixed" class="fab" data-test="add" @click="ionRouter.push('/tabs/menu/kartu/tambah')">
        Tambah <span class="ic"><PhPlus :size="19" weight="bold" /></span>
      </button>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, h, onBeforeUnmount, ref } from 'vue'
import { IonContent, IonPage, onIonViewWillEnter, toastController, useIonRouter } from '@ionic/vue'
import { PhBank, PhPlus, PhStar, PhX } from '@phosphor-icons/vue'
import PageHeader from '@/components/PageHeader.vue'
import WalletForm from '@/components/WalletForm.vue'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { bankLook, daysUntilDay, formatExpiry, groupSources, rpShort, summary } from '@/lib/wallet.js'
import { useWalletStore } from '@/stores/wallet.js'

const ionRouter = useIonRouter()
const wallet = useWalletStore()
const error = ref('')

const groups = computed(() => groupSources(wallet.items))
const totals = computed(() => summary(wallet.items))
const favorites = computed(() => wallet.items.filter((s) => s.favorite))
const subtitle = computed(() => (wallet.loaded ? `${totals.value.debit + totals.value.cc} kartu & rekening` : 'Bentar ya…'))
const countLabel = (g) => [g.debit.length && `${g.debit.length} tabungan`, g.cc.length && `${g.cc.length} CC`].filter(Boolean).join(' · ')
const dueIn = (s) => daysUntilDay(s.dueDay)

/** Tombol ⭐ di tiap baris (klik-nya nggak ikut buka form). */
const StarButton = (props, { emit }) =>
  h(
    'button',
    {
      class: ['star', { on: props.source.favorite }],
      'data-test': `star-${props.source.id}`,
      'aria-label': props.source.favorite ? `Hapus ${props.source.name} dari sering dipake` : `Tandai ${props.source.name} sering dipake`,
      'aria-pressed': String(props.source.favorite),
      onClick: (e) => {
        e.stopPropagation()
        emit('toggle', props.source)
      },
    },
    [h(PhStar, { size: 20, weight: props.source.favorite ? 'fill' : 'regular' })],
  )
StarButton.props = ['source']
StarButton.emits = ['toggle']

onIonViewWillEnter(async () => {
  try {
    await wallet.load()
    error.value = ''
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
})

async function star(s) {
  try {
    await wallet.toggleFavorite(s.id)
  } catch (err) {
    await (await toastController.create({ message: apiErrorMessage(err), duration: 2500, position: 'top', cssClass: 'aio-toast' })).present()
  }
}

const edit = (s) => ionRouter.push(`/tabs/menu/kartu/${s.id}`)

/* ---- PC / iPad landscape (≥1100px) ---- */
const query = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(min-width: 1100px)') : null
const wide = ref(Boolean(query?.matches))
const onMedia = (e) => {
  wide.value = e.matches
  if (!e.matches) closePanel()
}
query?.addEventListener?.('change', onMedia)

const creditCards = computed(() => wallet.items.filter((s) => s.kind === 'cc'))
const dueSoon = computed(() => creditCards.value.filter((c) => dueIn(c) <= 3))
const ccBankCount = computed(() => new Set(creditCards.value.map((c) => (c.bank ?? '').toLowerCase())).size)
const savingsCount = computed(() => (groups.value.cash ? 1 : 0) + totals.value.debit)

// Form tambah/ubah di PC = panel dari kanan (isi form sama persis kayak halaman form di HP).
const panelOpen = ref(false)
const panelId = ref(null)
const panelKey = ref(0)
const panelSource = computed(() => (panelId.value ? wallet.byId(panelId.value) : null))
function openPanel(id) {
  panelId.value = id
  panelKey.value += 1
  panelOpen.value = true
}
function closePanel() {
  panelOpen.value = false
}
async function onPanelDone(message) {
  closePanel()
  await (await toastController.create({ message, duration: 2500, position: 'top', cssClass: 'aio-toast' })).present()
}
const onKey = (e) => {
  if (e.key === 'Escape' && panelOpen.value) closePanel()
}
document.addEventListener('keydown', onKey)
onBeforeUnmount(() => {
  query?.removeEventListener?.('change', onMedia)
  document.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.narrow { max-width: 620px; padding-bottom: 96px; }
.error { color: var(--red); font-size: 13px; font-weight: 600; margin: 0 6px 12px; }
.stats { display: flex; gap: 8px; }
.stat { flex: 1; min-width: 0; padding: 12px 14px; border-radius: 20px; background: var(--card); box-shadow: 0 0 0 1px var(--hair); }
.stat b { display: block; font-size: 21px; font-weight: 800; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; white-space: nowrap; }
.stat span { font-size: 12px; color: var(--muted); }
.group-label { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 10.5px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .16em; color: var(--muted); margin: 24px 8px 10px; }
.group-label small { font-size: 10.5px; letter-spacing: .06em; }
.favs { display: flex; gap: 8px; overflow-x: auto; padding: 2px 2px 6px; scrollbar-width: none; }
.favs::-webkit-scrollbar { display: none; }
.fav { flex-shrink: 0; display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 14px 0 6px; border-radius: 99px; background: var(--card);
  box-shadow: 0 0 0 1px var(--hair); font-weight: 600; font-size: 13.5px; }
.fav.empty { padding: 0 14px; color: var(--muted); font-weight: 500; }
.fav .b { width: 32px; height: 32px; border-radius: 99px; display: grid; place-items: center; font-size: 10.5px; font-weight: 800; color: #141410; }
.list { padding: 6px; }
.bank { margin-bottom: 10px; }
.bank .core { padding: 0 0 6px; }
.bank-head { display: flex; align-items: center; gap: 10px; padding: 14px 16px 6px; }
.bank-logo { width: 34px; height: 34px; border-radius: 11px; display: grid; place-items: center; font-size: 11px; font-weight: 800; color: #141410; }
.bank-name { flex: 1; font-weight: 800; font-size: 16px; letter-spacing: -0.02em; }
.bank-count { font-size: 12px; color: var(--muted); }
.item { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 8px 10px 16px; border: 0; border-radius: 18px; background: transparent; color: var(--text);
  font: inherit; text-align: left; cursor: pointer; }
.list .item { padding-left: 10px; }
button.item:active { background: var(--soft); }
.ico { width: 40px; height: 40px; border-radius: 13px; background: var(--soft); display: grid; place-items: center; font-size: 19px; flex-shrink: 0; color: var(--muted); }
.grow { flex: 1; min-width: 0; }
.title { display: block; font-weight: 600; font-size: 15px; }
.sub { display: block; font-size: 12.5px; color: var(--muted); margin-top: 2px; }
.sep { height: 1px; background: var(--hair); margin: 4px 16px; }
.cc { position: relative; flex-shrink: 0; width: 64px; height: 42px; border-radius: 9px; overflow: hidden; box-shadow: 0 6px 14px -8px rgba(0, 0, 0, .45); }
.cc::before { content: ''; position: absolute; right: -14px; top: -16px; width: 46px; height: 46px; border-radius: 99px; background: rgba(255, 255, 255, .18); }
.cc i { position: absolute; left: 7px; bottom: 6px; width: 14px; height: 10px; border-radius: 3px; background: rgba(255, 233, 160, .85); }
.cc small { position: absolute; right: 7px; bottom: 5px; font-size: 8px; font-weight: 700; color: #fff; opacity: .85; }
.chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
.chip { display: inline-flex; padding: 3px 8px; border-radius: 99px; font-size: 11px; font-weight: 700; background: var(--soft); color: var(--muted); }
.chip.amber { background: rgba(245, 165, 36, .14); color: #C27C00; }
:deep(.star) { width: 40px; height: 40px; flex-shrink: 0; border: 0; border-radius: 12px; background: transparent; color: var(--muted); display: grid; place-items: center; cursor: pointer; }
:deep(.star.on) { color: var(--amber); }
:deep(.star:active) { background: var(--soft); }
.empty { padding: 18px; color: var(--muted); font-size: 13.5px; line-height: 1.5; }
.fab { position: absolute; right: 18px; bottom: calc(92px + env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 10px; height: 52px; padding: 6px 6px 6px 20px;
  border: 0; border-radius: 99px; background: var(--ink); color: var(--on-ink); font: 700 15px var(--ion-font-family); box-shadow: 0 16px 34px -14px rgba(0, 0, 0, .5);
  cursor: pointer; transition: transform .45s var(--spring); }
.fab:active { transform: scale(.96); }
.fab .ic { width: 40px; height: 40px; border-radius: 99px; background: var(--lime); color: var(--lime-ink); display: grid; place-items: center; }
@media (min-width: 768px) { .fab { bottom: 28px; right: 36px; } }

/* ===== PC (full) — semua di bawah .pc / panel, HP nggak kena ===== */
.pc { max-width: none; padding-left: 48px; padding-right: 48px; padding-bottom: 60px; }
.pc-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; }
.pc-head :deep(.page-head) { flex: 1; }
.pc-head :deep(.h1 span) { margin-left: .2em; }
.pc-add { flex-shrink: 0; height: 52px; padding: 6px 6px 6px 20px; font-size: 15px; font-weight: 700; margin-bottom: 18px; }
.pc-add .ic { width: 40px; height: 40px; }
.sum { position: relative; overflow: hidden; display: grid; grid-template-columns: 1.3fr repeat(3, 1fr); border-radius: 25px; background: #141410; color: #F3F2EE; }
.sum::before { content: ''; position: absolute; left: -80px; top: -160px; width: 460px; height: 460px; border-radius: 99px;
  background: radial-gradient(circle, rgba(200, 240, 74, .2), transparent 65%); pointer-events: none; }
.sum > div { position: relative; padding: 24px 26px; min-width: 0; }
.sum > div + div { box-shadow: inset 1px 0 0 rgba(243, 242, 238, .08); }
.sum .k { font-size: 12.5px; color: rgba(243, 242, 238, .6); font-weight: 600; }
.sum .v { font-size: 44px; font-weight: 800; letter-spacing: -0.04em; margin-top: 6px; font-variant-numeric: tabular-nums; }
.sum .v.lime { color: var(--lime); }
.sum .f { font-size: 12px; color: rgba(243, 242, 238, .55); margin-top: 4px; }
.pc-label { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em;
  color: var(--muted); margin: 28px 10px 10px; }
.pc-label small { font-size: 12px; letter-spacing: .02em; text-transform: none; color: var(--text); font-weight: 700; }
.pc-favs { display: flex; flex-wrap: wrap; gap: 8px; }
.pc-cols { display: grid; grid-template-columns: minmax(360px, 4fr) 8fr; gap: 24px; align-items: start; }
.pc-list { padding: 8px; }
.pc-list .item { padding-left: 10px; }
.pc-list .item:hover { background: var(--soft); }
.pc-group { display: flex; align-items: center; gap: 8px; padding: 12px 12px 4px; font-size: 10.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); }
.bank-logo.sm { width: 24px; height: 24px; border-radius: 8px; font-size: 8.5px; }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 18px; padding: 18px; }
.bigcc { position: relative; aspect-ratio: 1.586; border-radius: 20px; padding: 18px 20px; color: #fff; overflow: hidden; cursor: pointer;
  box-shadow: 0 24px 40px -24px rgba(0, 0, 0, .6); transition: transform .35s var(--spring); outline: none; }
.bigcc:hover, .bigcc:focus-visible { transform: translateY(-4px) rotate(-.5deg); }
.bigcc::before { content: ''; position: absolute; right: -50px; top: -60px; width: 190px; height: 190px; border-radius: 99px; background: rgba(255, 255, 255, .16); }
.bigcc .bn { position: relative; font-weight: 800; font-size: 15px; }
.bigcc .nm { position: relative; font-size: 13px; opacity: .85; margin-top: 2px; }
.bigcc .chipx { position: absolute; left: 20px; top: 44%; width: 36px; height: 27px; border-radius: 6px; background: rgba(255, 233, 160, .9); }
.bigcc .lim { position: absolute; left: 20px; bottom: 44px; font-size: 22px; font-weight: 800; letter-spacing: -0.03em; }
.bigcc .lim small { display: block; font-size: 10.5px; font-weight: 600; opacity: .75; letter-spacing: .04em; text-transform: uppercase; }
.bigcc .exp { position: absolute; right: 20px; bottom: 44px; font-size: 12px; font-weight: 700; opacity: .85; letter-spacing: .06em; }
.bigcc .meta { position: absolute; left: 20px; right: 20px; bottom: 14px; display: flex; flex-wrap: wrap; gap: 6px; }
.bigcc .m { padding: 3px 8px; border-radius: 99px; background: rgba(0, 0, 0, .22); font-size: 11px; font-weight: 700; }
.bigcc .m.warn { background: var(--amber); color: #141410; }
.bigcc :deep(.cc-star) { position: absolute; right: 12px; top: 12px; width: 34px; height: 34px; border-radius: 99px; background: rgba(0, 0, 0, .2); color: #fff; }
.bigcc :deep(.cc-star.on) { color: #FFD45A; }
.cards .empty { grid-column: 1 / -1; }
</style>

<!-- Panel form PC di-teleport ke ion-app → style-nya global (diawali wallet-, nggak bentrok). -->
<style>
.wallet-scrim { position: fixed; inset: 0; z-index: 40; background: rgba(0, 0, 0, .35); opacity: 0; pointer-events: none; transition: opacity .4s var(--spring); }
.wallet-scrim.show { opacity: 1; pointer-events: auto; }
.wallet-panel { position: fixed; top: 0; right: 0; bottom: 0; z-index: 41; width: min(540px, 100vw); overflow-y: auto; padding: 30px 32px 40px;
  background: var(--app-bg); color: var(--text); font-family: var(--ion-font-family); box-shadow: -24px 0 60px -30px rgba(0, 0, 0, .6);
  transform: translateX(105%); visibility: hidden; transition: transform .5s var(--spring), visibility 0s .5s; }
.wallet-panel.show { transform: none; visibility: visible; transition: transform .5s var(--spring), visibility 0s; }
.wallet-panel .panel-head { display: flex; justify-content: space-between; align-items: center; }
.wallet-panel .x { width: 40px; height: 40px; border-radius: 99px; border: 0; background: var(--soft); color: var(--text); display: grid; place-items: center; cursor: pointer; }
.wallet-panel .panel-h1 { margin: 14px 0 18px; font-size: 34px; font-weight: 800; letter-spacing: -0.04em; line-height: 1.05; }
.wallet-panel .panel-h1 span { color: var(--muted); font-weight: 600; }
</style>
