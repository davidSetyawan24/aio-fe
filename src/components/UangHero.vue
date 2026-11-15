<template>
  <div class="shell rise" style="--i: 2">
    <div class="u-hero" :class="{ past: !data.isCurrent }" data-test="hero">
      <!-- Bulan ini + ada budget: sisa jatah hari ini -->
      <div v-if="data.isCurrent && tb" class="u-main">
        <div class="k">{{ over ? 'Jatah hari ini kelewat' : 'Sisa jatah hari ini' }}</div>
        <div class="v" :class="{ over }">{{ over ? `−${rp(-tb.left)}` : rp(tb.left) }}</div>
        <div class="u-sub">jatah <b>{{ rp(tb.jatah) }}</b> · udah keluar <b>{{ rp(tb.spent) }}</b></div>
        <div class="hbar"><i :class="{ over }" :style="{ width: `${meter}%` }" /></div>
      </div>
      <!-- Bulan ini tanpa budget -->
      <div v-else-if="data.isCurrent" class="u-main">
        <div class="k">Keluar hari ini</div>
        <div class="v">{{ rp(todaySpent) }}</div>
        <div class="u-sub">belum pasang budget</div>
      </div>
      <!-- Bulan lalu -->
      <div v-else class="u-main">
        <template v-if="data.budget">
          <div class="k">{{ data.budget.left < 0 ? `Budget ${name} kelewat` : `Tersisa dana ${name}` }}</div>
          <div class="v" :class="{ over: data.budget.left < 0 }">{{ data.budget.left < 0 ? `−${rp(-data.budget.left)}` : rp(data.budget.left) }}</div>
        </template>
        <template v-else>
          <div class="k">Keluar {{ name }}</div>
          <div class="v">{{ rp(data.total) }}</div>
        </template>
        <span v-if="change" class="hchip" :class="data.change < 0 ? 'down' : data.change > 0 ? 'up' : ''">keluar {{ change }}</span>
      </div>

      <div class="hsplit">
        <template v-if="data.isCurrent && data.budget">
          <div><div class="k">Budget bulan ini</div><b>{{ rp(data.budget.total) }}</b></div>
          <div>
            <div class="k">Sisa budget</div>
            <b :class="{ bad: data.budget.left < 0 }">{{ data.budget.left < 0 ? `−${rp(-data.budget.left)}` : rp(data.budget.left) }}</b>
            <div v-if="tb" class="k">{{ tb.daysLeft }} hari lagi</div>
          </div>
        </template>
        <template v-else-if="data.isCurrent">
          <div><div class="k">Keluar bulan ini</div><b>{{ rp(data.total) }}</b></div>
          <div><div class="k">Rata-rata sehari</div><b>{{ rp(data.avgPerDay) }}</b></div>
        </template>
        <template v-else>
          <div v-if="data.budget"><div class="k">Budget</div><b>{{ rp(data.budget.total) }}</b></div>
          <div><div class="k">Rata-rata sehari</div><b>{{ rp(data.avgPerDay) }}</b></div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { monthName } from '@/lib/duit.js'
import { changeLabel } from '@/lib/overview.js'
import { rp } from '@/lib/wallet.js'

const props = defineProps({ data: { type: Object, required: true } })
const tb = computed(() => props.data.todayBudget)
const over = computed(() => Boolean(tb.value && tb.value.left < 0))
const meter = computed(() => {
  const t = tb.value
  if (!t) return 0
  if (!t.jatah) return t.spent ? 100 : 0
  return Math.min(100, (t.spent / t.jatah) * 100)
})
const todaySpent = computed(() => props.data.daily.find((d) => d.date === props.data.today)?.total ?? 0)
const name = computed(() => monthName(props.data.month, props.data.today))
const change = computed(() => changeLabel(props.data.change, props.data.prevMonth))
</script>

<style scoped>
.u-hero { position: relative; overflow: hidden; padding: 20px 20px 18px; border-radius: 25px; background: #141410; color: #F3F2EE; }
.u-hero::before { content: ''; position: absolute; right: -60px; top: -80px; width: 240px; height: 240px; border-radius: 99px; background: radial-gradient(circle, rgba(200, 240, 74, .28), transparent 65%); }
.u-hero > * { position: relative; }
.k { font-size: 12.5px; font-weight: 600; color: rgba(243, 242, 238, .6); }
.v { font-size: 46px; font-weight: 800; letter-spacing: -0.045em; margin-top: 2px; color: var(--lime); font-variant-numeric: tabular-nums; line-height: 1.05; }
.v.over { color: #FF8A73; font-size: 38px; }
.u-sub { font-size: 12.5px; color: rgba(243, 242, 238, .6); margin-top: 6px; font-variant-numeric: tabular-nums; }
.u-sub b { color: #F3F2EE; }
.hbar { height: 6px; border-radius: 99px; background: rgba(255, 255, 255, .12); margin-top: 14px; overflow: hidden; }
.hbar i { display: block; height: 100%; border-radius: 99px; background: var(--lime); transition: width .6s var(--spring); }
.hbar i.over { background: #FF8A73; }
.hsplit { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; padding-top: 14px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, .08); }
.hsplit .k { font-size: 11.5px; }
.hsplit b { display: block; font-size: 19px; font-weight: 800; letter-spacing: -0.03em; margin: 2px 0; font-variant-numeric: tabular-nums; }
.hsplit b.bad { color: #FF8A73; }
.hchip { display: inline-flex; align-items: center; gap: 5px; height: 26px; padding: 0 10px; border-radius: 99px; background: rgba(255, 255, 255, .08); font-size: 12px; font-weight: 700;
  color: rgba(243, 242, 238, .85); margin-top: 10px; }
.hchip.down { background: rgba(43, 168, 100, .2); color: #7FE0A5; }
.hchip.up { background: rgba(240, 83, 61, .2); color: #FF8A73; }

@media (min-width: 1100px) {
  .u-hero { display: grid; grid-template-columns: 1.1fr 1fr; gap: 28px; align-items: end; padding: 26px 28px; min-height: 230px; height: 100%; }
  .u-hero::before { right: -80px; top: -120px; width: 380px; height: 380px; background: radial-gradient(circle, rgba(200, 240, 74, .22), transparent 65%); }
  .v { font-size: 64px; }
  .v.over { font-size: 52px; }
  .hsplit { margin-top: 0; padding-top: 0; box-shadow: none; align-self: stretch; align-content: end; }
  .hsplit > div { padding: 14px; border-radius: 18px; background: rgba(255, 255, 255, .05); }
}
</style>
