<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="page narrow">
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

      <button slot="fixed" class="fab" data-test="add" @click="ionRouter.push('/tabs/menu/kategori/tambah')">
        Tambah <span class="ic"><PhPlus :size="19" weight="bold" /></span>
      </button>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { IonContent, IonPage, onIonViewWillEnter, useIonRouter } from '@ionic/vue'
import { PhPlus } from '@phosphor-icons/vue'
import PageHeader from '@/components/PageHeader.vue'
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
</style>
