<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div v-if="!wide" class="page narrow">
        <PageHeader eyebrow="Kategori" back-to="/tabs/menu">Kategori.<br /><span>{{ subtitle }}</span></PageHeader>

        <p v-if="error" class="error">{{ error }}</p>

        <template v-if="categories.loaded">
          <div class="shell rise" style="--i: 2">
            <div class="core list">
              <button v-for="c in categories.items" :key="c.id" class="item" data-test="category" @click="edit(c)">
                <span class="av" :style="{ background: c.tint }">{{ c.emoji }}</span>
                <span class="grow"><span class="title">{{ c.name }}</span><span class="sub">{{ statLine(c) }}</span></span>
                <span v-if="stat(c).total" class="amt">{{ rpShort(stat(c).total) }}</span>
              </button>
              <div v-if="!categories.items.length" class="empty">Belum ada kategori. Tap <b>Tambah</b> di kanan bawah.</div>
            </div>
          </div>
          <p class="hint rise" style="--i: 3">Kategori yang dihapus cuma disembunyiin — catatan lama tetep nampilin namanya.</p>
        </template>
      </div>

      <!-- PC / iPad landscape: ringkasan bulan ini + grid kartu, tambah/ubah di panel geser dari kanan (HP di atas nggak berubah). -->
      <div v-if="wide" class="page pc" data-test="pc">
        <div class="pc-head">
          <PageHeader eyebrow="Kategori" back-to="/tabs/menu">Kategori. <span>{{ subtitle }}</span></PageHeader>
          <button class="pill pc-add" data-test="pc-add" @click="openPanel(null)">Tambah <span class="ic"><PhPlus :size="19" weight="bold" /></span></button>
        </div>
        <p v-if="error" class="error">{{ error }}</p>

        <template v-if="categories.loaded">
          <div class="shell rise" style="--i: 2">
            <div class="sum" data-test="sum">
              <div>
                <div class="k">Keluar bulan ini</div>
                <div class="v lime">{{ rpShort(summary.total) }}</div>
                <div class="f">{{ summary.usedCount ? `dari ${summary.usedCount} kategori yang kepake` : 'belum ada catatan bulan ini' }}</div>
              </div>
              <div>
                <div class="k">Paling gede</div>
                <div class="v name">{{ summary.top ? `${summary.top.category.emoji} ${summary.top.category.name}` : 'Belum ada' }}</div>
                <div class="f">{{ summary.top ? `${rpShort(summary.top.total)} · ${summary.top.count} catatan` : '—' }}</div>
              </div>
              <div>
                <div class="k">Belum kepake</div>
                <div class="v">{{ summary.unusedCount }}</div>
                <div class="f">kategori bulan ini</div>
              </div>
            </div>
          </div>

          <div class="pc-label rise" style="--i: 3">Semua kategori <small>{{ categories.items.length }}</small></div>
          <div class="tiles rise" style="--i: 3">
            <button v-for="c in categories.items" :key="c.id" class="tile" data-test="tile" @click="openPanel(c.id)">
              <span class="tile-top">
                <span class="av big" :style="{ background: c.tint }">{{ c.emoji }}</span>
                <span v-if="stat(c).total" class="amt">{{ rpShort(stat(c).total) }}</span>
              </span>
              <span>
                <span class="title">{{ c.name }}</span>
                <span class="sub">{{ stat(c).count ? `${stat(c).count} catatan bulan ini` : 'Belum kepake bulan ini' }}</span>
                <span class="bar"><i :style="{ width: `${barWidth(c)}%` }" /></span>
              </span>
            </button>
            <button class="tile tile-new" data-test="tile-new" @click="openPanel(null)"><PhPlus :size="22" />Kategori baru</button>
          </div>
          <p class="hint rise" style="--i: 4">Kategori yang dihapus cuma disembunyiin — catatan lama tetep nampilin namanya.</p>
        </template>
      </div>

      <!-- Ke dalem ion-app (bukan body): ion-app bikin tumpukan z-index sendiri, popup Ionic (konfirmasi Hapus) dipasang di situ.
           Kalau panel di body, konfirmasinya ketutup scrim panel & nggak bisa dipencet. -->
      <Teleport to="ion-app">
        <div v-if="wide" class="cat-scrim" :class="{ show: panelOpen }" @click="closePanel" />
        <aside v-if="wide" class="cat-panel" :class="{ show: panelOpen }" data-test="panel" role="dialog" aria-modal="true" :aria-hidden="String(!panelOpen)">
          <div class="panel-head">
            <span class="eyebrow"><span class="dot" />Kategori</span>
            <button class="x" aria-label="Tutup" @click="closePanel"><PhX :size="18" weight="bold" /></button>
          </div>
          <h2 class="panel-h1">
            <template v-if="panelId"><b>{{ categories.byId(panelId)?.name ?? 'Kategori' }}</b>.<br /><span>Ubah kategori</span></template>
            <template v-else>Kategori baru.<br /><span>Nama, emoji, warna</span></template>
          </h2>
          <CategoryForm v-if="panelOpen" :key="panelKey" :category-id="panelId" @done="onPanelDone" />
        </aside>
      </Teleport>

      <button v-if="!wide" slot="fixed" class="fab" data-test="add" @click="ionRouter.push('/tabs/menu/kategori/tambah')">
        Tambah <span class="ic"><PhPlus :size="19" weight="bold" /></span>
      </button>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { IonContent, IonPage, onIonViewWillEnter, toastController, useIonRouter } from '@ionic/vue'
import { PhPlus, PhX } from '@phosphor-icons/vue'
import CategoryForm from '@/components/CategoryForm.vue'
import PageHeader from '@/components/PageHeader.vue'
import { categoryMonthSummary } from '@/lib/categories.js'
import { useMedia } from '@/lib/media.js'
import { apiErrorMessage } from '@/lib/passwordChange.js'
import { rpShort } from '@/lib/wallet.js'
import { localToday } from '@/lib/duit.js'
import { useCategoriesStore } from '@/stores/categories.js'
import { useExpensesStore } from '@/stores/expenses.js'

const ionRouter = useIonRouter()
const categories = useCategoriesStore()
const expenses = useExpensesStore()
const error = ref('')
const month = localToday().slice(0, 7)

/** Pemakaian bulan ini per kategori: { [id]: { count, total } }. */
const usage = computed(() => {
  const out = {}
  for (const e of expenses.months[month] ?? []) {
    const u = (out[e.category.id] ??= { count: 0, total: 0 })
    u.count += 1
    u.total += e.amount
  }
  return out
})

const subtitle = computed(() => (categories.loaded ? `${categories.items.length} kategori` : 'Bentar ya…'))
const stat = (c) => usage.value[c.id] ?? { count: 0, total: 0 }
const statLine = (c) => (stat(c).count ? `${stat(c).count} catatan bulan ini` : 'Kategori pengeluaran')

onIonViewWillEnter(async () => {
  try {
    await categories.load()
    error.value = ''
    // Angka "N catatan bulan ini" — kalau gagal dimuat, daftar kategori tetep tampil.
    expenses.loadMonth(month).catch(() => {})
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
})

const edit = (c) => ionRouter.push(`/tabs/menu/kategori/${c.id}`)

/* ---- PC / iPad landscape (≥1100px) ---- */
const wide = useMedia('(min-width: 1100px)')
const summary = computed(() => categoryMonthSummary(categories.items, usage.value))
const maxTotal = computed(() => Math.max(1, ...categories.items.map((c) => stat(c).total)))
const barWidth = (c) => Math.round((stat(c).total / maxTotal.value) * 100)

// Form tambah/ubah di PC = panel dari kanan (isi form sama persis kayak halaman form di HP).
const panelOpen = ref(false)
const panelId = ref(null)
const panelKey = ref(0)
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
watch(wide, (isWide) => {
  if (!isWide) closePanel()
})
const onKey = (e) => {
  if (e.key === 'Escape' && panelOpen.value) closePanel()
}
document.addEventListener('keydown', onKey)
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<style scoped>
.narrow { max-width: 620px; padding-bottom: 96px; }
.error { color: var(--red); font-size: 13px; font-weight: 600; margin: 0 6px 12px; }
.list { padding: 6px; }
.item { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px; border: 0; border-radius: 18px; background: transparent; color: var(--text);
  font: inherit; text-align: left; cursor: pointer; }
.item + .item { border-radius: 0 0 18px 18px; box-shadow: inset 0 1px 0 var(--hair); }
.item:active { background: var(--soft); }
.av { width: 42px; height: 42px; border-radius: 14px; display: grid; place-items: center; font-size: 20px; flex-shrink: 0; }
.title { display: block; }
.sub { display: block; }
.amt { font-weight: 800; font-size: 15px; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.empty { padding: 18px; color: var(--muted); font-size: 13.5px; line-height: 1.5; }
.hint { color: var(--muted); font-size: 12.5px; margin: 12px 8px 0; line-height: 1.45; }
.fab { position: absolute; right: 18px; bottom: calc(92px + env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 10px; height: 52px; padding: 6px 6px 6px 20px;
  border: 0; border-radius: 99px; background: var(--ink); color: var(--on-ink); font: 700 15px var(--ion-font-family); box-shadow: 0 16px 34px -14px rgba(0, 0, 0, .5);
  cursor: pointer; transition: transform .45s var(--spring); }
.fab:active { transform: scale(.96); }
.fab .ic { width: 40px; height: 40px; border-radius: 99px; background: var(--lime); color: var(--lime-ink); display: grid; place-items: center; }
@media (min-width: 768px) { .fab { bottom: 28px; right: 36px; } }

/* ---- PC (≥1100px), ikut mockup kategori-pc.html Opsi B ---- */
.pc { max-width: none; padding-left: 48px; padding-right: 48px; padding-bottom: 60px; }
.pc-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; }
.pc-head :deep(.page-head) { flex: 1; }
.pc-head :deep(.h1 span) { margin-left: .2em; }
.pc-add { flex-shrink: 0; height: 52px; padding: 6px 6px 6px 20px; font-size: 15px; font-weight: 700; margin-bottom: 18px; }
.pc-add .ic { width: 40px; height: 40px; }
.sum { position: relative; overflow: hidden; display: grid; grid-template-columns: 1.4fr 1fr 1fr; border-radius: 25px; background: #141410; color: #F3F2EE; }
.sum::before { content: ''; position: absolute; left: -60px; top: -160px; width: 420px; height: 420px; border-radius: 99px; background: radial-gradient(circle, rgba(200, 240, 74, .2), transparent 65%); }
.sum > div { position: relative; padding: 24px 26px; min-width: 0; }
.sum > div + div { box-shadow: inset 1px 0 0 rgba(243, 242, 238, .08); }
.sum .k { font-size: 12.5px; color: rgba(243, 242, 238, .6); font-weight: 600; }
.sum .v { font-size: 40px; font-weight: 800; letter-spacing: -0.045em; line-height: 1; margin-top: 8px; font-variant-numeric: tabular-nums; }
.sum .v.lime { color: var(--lime); }
.sum .v.name { font-size: 30px; padding-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sum .f { font-size: 12px; color: rgba(243, 242, 238, .55); margin-top: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pc-label { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em;
  color: var(--muted); margin: 28px 10px 10px; }
.pc-label small { font-size: 12px; letter-spacing: .02em; text-transform: none; color: var(--text); font-weight: 700; }
.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; }
.tile { display: flex; flex-direction: column; gap: 16px; padding: 18px; border: 0; border-radius: 24px; background: var(--card); color: var(--text); text-align: left;
  font: inherit; cursor: pointer; box-shadow: 0 0 0 1px var(--hair), var(--lift); transition: transform .3s var(--spring); }
.tile:active { transform: scale(.98); }
.tile:focus { outline: none; }
.tile:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
.tile-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.av.big { width: 54px; height: 54px; border-radius: 18px; font-size: 26px; }
.tile .amt { font-size: 20px; }
.tile .title { font-weight: 600; font-size: 15px; }
.tile .sub { font-size: 12.5px; color: var(--muted); margin-top: 2px; }
.bar { display: block; height: 4px; border-radius: 9px; background: var(--soft); margin-top: 10px; overflow: hidden; }
.bar i { display: block; height: 100%; border-radius: 9px; background: var(--ink); }
.tile-new { align-items: center; justify-content: center; gap: 8px; min-height: 150px; background: transparent; color: var(--muted); font-weight: 700;
  box-shadow: none; border: 2px dashed var(--hair); }
.pc .hint { margin: 12px 10px 0; }
/* Hover cuma di device ber-mouse (iPad landscape juga kebagian layout ini, efeknya jangan nyangkut abis di-tap). */
@media (hover: hover) {
  .tile:hover { transform: translateY(-3px); }
  .tile-new:hover { color: var(--text); border-color: var(--muted); }
}
</style>

<!-- Panel form PC di-teleport ke ion-app → style-nya global (diawali cat-, nggak bentrok). -->
<style>
.cat-scrim { position: fixed; inset: 0; z-index: 40; background: rgba(0, 0, 0, .35); opacity: 0; pointer-events: none; transition: opacity .4s var(--spring); }
.cat-scrim.show { opacity: 1; pointer-events: auto; }
.cat-panel { position: fixed; top: 0; right: 0; bottom: 0; z-index: 41; width: min(520px, 100vw); overflow-y: auto; padding: 30px 32px 40px;
  background: var(--app-bg); color: var(--text); font-family: var(--ion-font-family); box-shadow: -24px 0 60px -30px rgba(0, 0, 0, .6);
  transform: translateX(105%); visibility: hidden; transition: transform .5s var(--spring), visibility 0s .5s; }
.cat-panel.show { transform: none; visibility: visible; transition: transform .5s var(--spring), visibility 0s; }
.cat-panel .panel-head { display: flex; justify-content: space-between; align-items: center; }
.cat-panel .x { width: 40px; height: 40px; border-radius: 99px; border: 0; background: var(--soft); color: var(--text); display: grid; place-items: center; cursor: pointer; }
.cat-panel .panel-h1 { margin: 14px 0 18px; font-size: 34px; font-weight: 800; letter-spacing: -0.04em; line-height: 1.05; }
.cat-panel .panel-h1 span { color: var(--muted); font-weight: 600; }
</style>
