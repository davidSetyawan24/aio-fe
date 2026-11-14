<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page narrow">
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

      <button slot="fixed" class="fab" data-test="add" @click="ionRouter.push('/tabs/menu/kartu/tambah')">
        Tambah <span class="ic"><PhPlus :size="19" weight="bold" /></span>
      </button>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, h, ref } from 'vue'
import { IonContent, IonPage, onIonViewWillEnter, toastController, useIonRouter } from '@ionic/vue'
import { PhBank, PhPlus, PhStar } from '@phosphor-icons/vue'
import PageHeader from '@/components/PageHeader.vue'
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
</style>
