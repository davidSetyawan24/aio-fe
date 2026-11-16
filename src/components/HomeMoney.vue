<template>
  <div data-test="money">
    <template v-if="money">
      <div class="h-label rise"><span>Duit hari ini</span></div>
      <div class="shell rise">
        <div class="h-hero" data-test="hero">
          <div class="h-hrow">
            <div class="h-k" data-test="hero-label">{{ mv.label }}</div>
            <button class="h-catat" data-test="hero-catat" @click="go(catatPath(wide))">Catat <span><PhPlus :size="16" weight="bold" /></span></button>
          </div>
          <div class="h-v" :class="{ over: mv.over }" data-test="hero-value">{{ mv.value }}</div>
          <div class="h-s" data-test="hero-sub">
            <template v-if="mv.hasBudget">keluar {{ month }} <b>{{ mv.spent }}</b> dari {{ mv.budgetTotal }}</template>
            <template v-else>keluar {{ month }} <b>{{ mv.spent }}</b> · belum pasang budget</template>
          </div>
          <div v-if="mv.bar !== null" class="h-hbar"><i data-test="hero-bar" :class="{ over: mv.barOver }" :style="{ width: `${mv.bar}%` }" /></div>
        </div>
      </div>
    </template>

    <template v-if="owed">
      <div class="h-label rise"><span>Duit yang belum balik</span></div>
      <div class="h-pair rise">
        <div class="shell h-mini" data-test="owed-invoice" @click="go('/tabs/menu/invoice')">
          <span class="ic" style="background: #DCEBFF">📄</span>
          <div class="h-mk">Invoice belum masuk</div>
          <div class="h-mv">{{ inv.value }}</div>
          <div class="h-ms" :class="{ red: inv.tone === 'red' }">{{ inv.sub }}</div>
        </div>
        <div class="shell h-mini" data-test="owed-split" @click="go('/tabs/menu/split-bill')">
          <span class="ic" style="background: #FFE0E6">🍕</span>
          <div class="h-mk">Split bill belum balik</div>
          <div class="h-mv">{{ spl.value }}</div>
          <div class="h-ms">{{ spl.sub }}</div>
        </div>
      </div>
    </template>

    <div class="h-label rise"><span>Cepet</span></div>
    <div class="h-quick rise">
      <button v-for="q in quick" :key="q.key" class="h-qb" :data-test="`quick-${q.key}`" @click="go(q.to)">
        <span class="ic" :style="{ background: q.tint }">{{ q.emoji }}</span>{{ q.label }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useIonRouter } from '@ionic/vue'
import { PhPlus } from '@phosphor-icons/vue'
import { monthName } from '@/lib/duit.js'
import { catatPath, moneyView, owedInvoiceView, owedSplitView, splitPath, todoPath } from '@/lib/home.js'
import { useMedia } from '@/lib/media.js'

const props = defineProps({
  money: { type: Object, default: null },
  owed: { type: Object, default: null },
  today: { type: String, required: true },
})
const ionRouter = useIonRouter()
const wide = useMedia('(min-width: 1100px)')
const dialog = useMedia('(min-width: 768px)')

const mv = computed(() => (props.money ? moneyView(props.money) : null))
const month = computed(() => (props.money ? monthName(props.money.month, props.today) : ''))
const inv = computed(() => owedInvoiceView(props.owed.invoices))
const spl = computed(() => owedSplitView(props.owed.split))
const quick = computed(() => [
  { key: 'catat', emoji: '💸', tint: '#FFE9D6', label: 'Catat', to: catatPath(wide.value) },
  { key: 'todo', emoji: '✅', tint: '#E4F7C4', label: 'To-do', to: todoPath(dialog.value, props.today) },
  { key: 'invoice', emoji: '📄', tint: '#DCEBFF', label: 'Invoice', to: '/tabs/menu/invoice/baru' },
  { key: 'split', emoji: '🍕', tint: '#FFE0E6', label: 'Split bill', to: splitPath(wide.value) },
])
const go = (path) => ionRouter.push(path)
</script>

<style scoped>
.h-label { display: flex; justify-content: space-between; align-items: center; min-height: 20px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 24px 8px 10px; }
.h-hero { position: relative; overflow: hidden; padding: 18px 20px; border-radius: 25px; background: #141410; color: #F3F2EE; }
.h-hero::before { content: ''; position: absolute; right: -60px; top: -80px; width: 220px; height: 220px; border-radius: 99px; background: radial-gradient(circle, rgba(200, 240, 74, .28), transparent 65%); pointer-events: none; }
.h-hero > * { position: relative; }
.h-hrow { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: -4px -6px 0 0; }
.h-k { font-size: 12.5px; font-weight: 600; color: rgba(243, 242, 238, .6); }
.h-v { font-size: 44px; font-weight: 800; letter-spacing: -0.045em; margin-top: 2px; color: var(--lime); font-variant-numeric: tabular-nums; line-height: 1.05; }
.h-v.over { color: #FF8A73; }
.h-s { font-size: 12.5px; color: rgba(243, 242, 238, .7); font-weight: 600; margin-top: 12px; font-variant-numeric: tabular-nums; }
.h-s b { color: #F3F2EE; }
.h-hbar { height: 6px; border-radius: 99px; background: rgba(255, 255, 255, .12); margin-top: 12px; overflow: hidden; }
.h-hbar i { display: block; height: 100%; border-radius: 99px; background: #F3F2EE; transition: width .6s var(--spring); }
.h-hbar i.over { background: #FF8A73; }
.h-catat { display: inline-flex; align-items: center; gap: 9px; height: 44px; padding: 0 5px 0 16px; border: 0; border-radius: 99px; background: #F3F2EE; color: #141410; font: 700 14px var(--ion-font-family); cursor: pointer; flex: none; }
.h-catat span { width: 34px; height: 34px; border-radius: 99px; background: var(--lime); color: var(--lime-ink); display: grid; place-items: center; }

.h-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.h-mini { padding: 14px 14px 13px; border-radius: 25px; cursor: pointer; }
.h-mini .ic, .h-qb .ic { display: grid; place-items: center; }
.h-mini .ic { width: 36px; height: 36px; border-radius: 12px; font-size: 18px; }
.h-mk { font-size: 12px; color: var(--muted); font-weight: 700; margin-top: 12px; }
.h-mv { font-size: 20px; font-weight: 800; letter-spacing: -0.03em; margin-top: 2px; font-variant-numeric: tabular-nums; }
.h-ms { font-size: 12px; color: var(--muted); font-weight: 600; margin-top: 2px; }
.h-ms.red { color: var(--red); }

.h-quick { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.h-qb { display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 12px 4px 11px; border: 0; border-radius: 22px; background: var(--card); box-shadow: 0 0 0 1px var(--hair); cursor: pointer; font: 700 12.5px var(--ion-font-family); color: var(--text); transition: transform .2s var(--spring); }
.h-qb:active, .h-catat:active { transform: scale(.97); }
.h-qb .ic { width: 42px; height: 42px; border-radius: 14px; font-size: 20px; }

@media (hover: hover) { .h-qb:hover, .h-mini:hover { box-shadow: 0 0 0 1px var(--hair), var(--lift); } }
@media (min-width: 1100px) {
  .h-label:first-child { margin-top: 12px; }
  .h-v { font-size: 52px; }
  .h-quick { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .h-qb { flex-direction: row; justify-content: flex-start; padding: 10px 12px; gap: 12px; font-size: 14px; }
}
</style>
