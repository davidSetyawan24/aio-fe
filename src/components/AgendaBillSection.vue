<template>
  <div data-test="bills">
    <div class="lbl">🔁 Bayar rutin <small class="amt">{{ left ? `${rp(left)} belum lunas` : 'Semua lunas 🎉' }}</small></div>
    <div class="shell">
      <div class="core list">
        <div v-for="b in bills" :key="`${b.billId}:${b.period}`" class="bill" :class="{ done: b.status === 'paid' }" data-test="bill">
          <button type="button" class="ck" data-test="bill-check" :aria-label="b.status === 'paid' ? `Batal lunas ${b.name}` : `Tandain ${b.name} lunas`" @click="toggle(b)">
            <PhCheck :size="14" weight="bold" />
          </button>
          <span class="t">{{ b.name }}<small><PhRepeat :size="12" /> Jatuh tempo {{ shortDue(b.dueOn) }}</small></span>
          <span class="end">
            <b>{{ rp(b.amount) }}</b>
            <span v-if="b.status === 'late'" class="tag red">Telat {{ b.lateDays }} hari</span>
            <span v-else-if="b.status === 'paid'" class="tag green">Lunas</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { toastController } from '@ionic/vue'
import { PhCheck, PhRepeat } from '@phosphor-icons/vue'
import { shortDue } from '@/lib/bayarRutin.js'
import { rp } from '@/lib/wallet.js'
import { useAgendaStore } from '@/stores/agenda.js'

/** Bagian "🔁 Bayar rutin" di Agenda (opsi A): centang = Lunas, nyambung ke menu Bayar Rutin. */
const props = defineProps({ bills: { type: Array, required: true } })
const emit = defineEmits(['error'])
const store = useAgendaStore()
const left = computed(() => props.bills.filter((b) => b.status !== 'paid').reduce((s, b) => s + b.amount, 0))
async function toggle(b) {
  const willPay = b.status !== 'paid'
  try {
    if (!(await store.toggleBill(b))) return
  } catch (err) {
    return emit('error', err)
  }
  const message = willPay ? `${b.name} lunas ✓` : `${b.name} batal lunas`
  await (await toastController.create({ message, duration: 2000, position: 'top', cssClass: 'aio-toast' })).present()
}
</script>

<style scoped>
.lbl { display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); margin: 24px 8px 10px; }
.lbl small { font-size: 12px; letter-spacing: .02em; text-transform: none; font-weight: 700; }
.lbl .amt { color: var(--text); font-variant-numeric: tabular-nums; }
.list { padding: 4px 6px; }
.bill { display: flex; align-items: center; gap: 12px; padding: 11px 10px; }
.bill + .bill { box-shadow: inset 0 1px 0 var(--hair); }
.ck { width: 26px; height: 26px; flex-shrink: 0; padding: 0; border-radius: 99px; border: 0; box-shadow: inset 0 0 0 2px var(--muted); background: transparent; display: grid; place-items: center;
  cursor: pointer; color: #141410; transition: background .25s var(--spring), box-shadow .25s; }
.ck svg { opacity: 0; transform: scale(.4); transition: opacity .3s var(--spring), transform .3s var(--spring); }
.done .ck { background: var(--lime); box-shadow: none; }
.done .ck svg { opacity: 1; transform: none; }
.t { flex: 1; min-width: 0; font-size: 15px; font-weight: 600; transition: opacity .3s; }
.t small { display: block; margin-top: 2px; color: var(--muted); font-size: 12px; font-weight: 600; }
.t small svg { vertical-align: -2px; }
.end { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.end b { font-size: 14px; font-weight: 800; font-variant-numeric: tabular-nums; transition: opacity .3s; }
.done .t, .done .end b { text-decoration: line-through; opacity: .4; }
.tag { display: inline-flex; align-items: center; height: 22px; padding: 0 8px; border-radius: 99px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.tag.red { background: rgba(240, 83, 61, .12); color: var(--red); }
.tag.green { background: rgba(43, 168, 100, .12); color: var(--green); }
</style>
