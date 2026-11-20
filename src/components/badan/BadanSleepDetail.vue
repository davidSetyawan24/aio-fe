<template>
  <div class="bd-detail">
    <p v-if="!row" class="bd-gone" data-test="gone">Data tidurnya nggak ketemu. Mungkin udah dihapus.</p>
    <template v-else>
      <div class="bd-head">
        <h2 data-test="title">{{ dLong(row.sleptOn) }}</h2>
        <div class="bd-sub"><span v-if="clock" data-test="clock">{{ clock }}</span> <span class="bd-chip" :class="row.source === 'manual' ? 'mut' : 'green'" data-test="source">{{ row.source === 'manual' ? 'isi manual' : 'dari gambar' }}</span></div>
      </div>
      <div class="shell bs-shell"><div class="core bs-card">
        <div class="bs-top">
          <div class="bs-tot" data-test="total">{{ Math.floor(row.totalMin / 60) }}<small>j</small>{{ row.totalMin % 60 }}<small>m</small></div>
          <div class="bs-score" data-test="score"><b>{{ row.score ?? '–' }}</b><small>skor</small></div>
        </div>
        <div v-if="hasStages" class="bs-stack" data-test="stack">
          <i v-for="s in STAGES" :key="s.k" :class="s.cls" :style="{ flex: row[s.k] ?? 0 }" />
        </div>
        <div class="bs-legend" data-test="legend">
          <div v-for="s in STAGES" :key="s.k"><i :class="s.cls" />{{ s.label }}<b>{{ row[s.k] != null ? durL(row[s.k]) : '–' }}<small v-if="row[s.k] != null">{{ Math.round((row[s.k] / row.totalMin) * 100) }}%</small></b></div>
        </div>
        <div class="bs-s3" data-test="s3">
          <div v-for="o in OTHERS" :key="o.k"><div class="k">{{ o.label }}</div><div class="v">{{ row[o.k] ?? '–' }}<small v-if="row[o.k] != null">{{ o.unit }}</small></div></div>
        </div>
        <div v-if="week" class="bs-avg" data-test="avg">Rata-rata 7 hari <b>{{ durL(week.avg7Min) }}</b> (dari {{ week.nights }} malam)</div>
      </div></div>
      <div class="bd-btns">
        <button type="button" class="go" data-test="edit" @click="$emit('edit')"><PhPencilSimple :size="17" weight="bold" />Ubah</button>
        <button type="button" class="del" data-test="delete" :disabled="busy" @click="confirmDelete"><PhTrash :size="17" weight="bold" />Hapus</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { actionSheetController } from '@ionic/vue'
import { PhPencilSimple, PhTrash } from '@phosphor-icons/vue'
import { sleepSummary } from '@/lib/badan.js'
import { durL } from '@/lib/badanSleep.js'
import { dLong, jam } from '@/lib/badanView.js'
import { errorLines, showToast } from '@/lib/personalForm.js'
import { useBadanStore } from '@/stores/badan.js'

/** Detail satu malam tidur: total, skor, batang dalam/ringan/REM, kebangun/HR/HRV, rata-rata 7 hari sampai malam itu, Ubah / Hapus. */
const props = defineProps({ sleepId: { type: [Number, String], required: true } })
const emit = defineEmits(['edit', 'done'])

const STAGES = [
  { k: 'deepMin', label: 'Dalam', cls: 'bs-deep' },
  { k: 'lightMin', label: 'Ringan', cls: 'bs-light' },
  { k: 'remMin', label: 'REM', cls: 'bs-rem' },
]
const OTHERS = [{ k: 'awakeCount', label: 'Kebangun', unit: '×' }, { k: 'avgHr', label: 'HR rata-rata', unit: 'bpm' }, { k: 'avgHrv', label: 'HRV rata-rata', unit: 'ms' }]

const store = useBadanStore()
const busy = ref(false)
defineExpose({ busy })

const found = computed(() => store.sleeps.find((s) => s.id === Number(props.sleepId)) ?? null)
// Abis dihapus, datanya ilang dari store sebelum induk sempat nutup layar ini → tahan yang terakhir kelihatan.
const last = ref(found.value)
const deleted = ref(false)
watch(found, (s) => s && (last.value = s))
const row = computed(() => found.value ?? (deleted.value ? last.value : null))

const clock = computed(() => (row.value?.bedAt && row.value?.wakeAt ? `${jam(row.value.bedAt)} → ${jam(row.value.wakeAt)}` : ''))
const hasStages = computed(() => STAGES.some((s) => row.value?.[s.k] > 0))
/** Rata-rata 7 hari yang berakhir di malam ini (malam kosong nggak diitung). */
const week = computed(() => (row.value ? sleepSummary(store.sleeps.filter((s) => s.sleptOn <= row.value.sleptOn)) : null))

let confirming = false
async function confirmDelete() {
  if (confirming || busy.value) return
  confirming = true
  const r = row.value
  try {
    const sheet = await actionSheetController.create({
      header: 'Hapus data tidur ini?',
      subHeader: 'Angkanya ilang dari riwayat, grafik, dan rata-rata 7 hari.',
      buttons: [{ text: 'Hapus', role: 'destructive', data: 'delete' }, { text: 'Batal', role: 'cancel' }],
    })
    await sheet.present()
    const { data } = await sheet.onDidDismiss()
    if (data !== 'delete') return
    busy.value = true
    deleted.value = true
    // Vue 3.5 buang emit dari komponen yang udah dicopot → kabarin induk DULU, baru ubah store.
    emit('done')
    try {
      await store.removeSleep(r.id)
      showToast('Data tidur dihapus')
    } catch (err) {
      deleted.value = false
      showToast(errorLines(err)[0])
    }
  } finally {
    busy.value = false
    confirming = false
  }
}
</script>
