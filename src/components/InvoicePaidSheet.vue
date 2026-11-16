<template>
  <AgendaSheet :open="open" :wide="wide" label="Tandain lunas" @close="$emit('close')">
    <h3>Duitnya udah masuk?</h3>
    <p>Pilih tanggal duitnya masuk. PDF-nya nanti dapet cap LUNAS, bisa lo kirim ulang ke klien.</p>
    <div class="chips">
      <button type="button" class="chip" :class="{ on: pick === 'today' }" data-test="pick-today" @click="pick = 'today'">Hari ini · {{ fmtDM(today) }}</button>
      <button type="button" class="chip" :class="{ on: pick === 'yest' }" data-test="pick-yest" :disabled="!yestOk" @click="pick = 'yest'">Kemarin · {{ fmtDM(yesterday) }}</button>
      <label class="chip date" :class="{ on: pick === 'custom' }" data-test="pick-custom">
        {{ custom ? fmtDM(custom) : 'Pilih…' }}
        <input type="date" data-test="pick-date" aria-label="Tanggal duit masuk" :value="custom" :min="issuedOn" :max="today" @change="onDate" />
      </label>
    </div>
    <div class="stack">
      <button type="button" class="pill ok" data-test="ok" :disabled="busy" @click="ok">Tandain lunas <span class="ic"><PhCheck :size="17" weight="bold" /></span></button>
      <button type="button" class="pill ghost cancel" data-test="cancel" @click="$emit('close')">Batal</button>
    </div>
  </AgendaSheet>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { PhCheck } from '@phosphor-icons/vue'
import AgendaSheet from '@/components/AgendaSheet.vue'
import { addDays } from '@/lib/agenda.js'
import { fmtDM } from '@/lib/invoice.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  wide: { type: Boolean, default: false },
  today: { type: String, required: true },
  /** Tanggal invoice — duit nggak mungkin masuk sebelum ini. */
  issuedOn: { type: String, required: true },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'done'])

const pick = ref('today')
const custom = ref('')
const yesterday = computed(() => addDays(props.today, -1))
const yestOk = computed(() => yesterday.value >= props.issuedOn)

// Dibuka lagi = mulai dari "Hari ini".
watch(() => props.open, (v) => {
  if (v) {
    pick.value = 'today'
    custom.value = ''
  }
})

function onDate(e) {
  const v = e.target.value
  if (v && v >= props.issuedOn && v <= props.today) {
    custom.value = v
    pick.value = 'custom'
  }
  e.target.value = custom.value
}

const chosen = computed(() => (pick.value === 'yest' ? yesterday.value : pick.value === 'custom' && custom.value ? custom.value : props.today))
const ok = () => emit('done', chosen.value)
</script>

<style scoped>
h3 { font-size: 22px; font-weight: 800; letter-spacing: -0.03em; margin: 4px 0 6px; }
p { font-size: 14px; color: var(--muted); margin: 0 0 16px; line-height: 1.5; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
.chip { position: relative; display: inline-flex; align-items: center; height: 38px; padding: 0 14px; border-radius: 99px; border: 0; background: var(--soft); color: var(--text); font: 700 13.5px var(--ion-font-family); cursor: pointer; }
.chip.on { background: var(--ink); color: var(--on-ink); }
.chip:disabled { opacity: .4; cursor: default; }
.chip.date input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; border: 0; font-size: 16px; }
.stack { display: flex; flex-direction: column; gap: 8px; }
.pill { justify-content: center; height: 50px; }
.pill.ok { justify-content: space-between; padding-left: 22px; }
.pill:disabled { opacity: .6; }
.cancel { padding: 0 18px; }
</style>
